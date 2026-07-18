import type { Request, Response } from "express";
import { Scholarship } from "../models/Scholarship.js";
import { Review } from "../models/Review.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { createSlug } from "../utils/slug.js";

function asArray(value: unknown) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export const listScholarships = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const filter: Record<string, any> = { status: "published" };
  const search = String(req.query.search ?? "").trim();
  if (search) filter.$text = { $search: search };
  const countries = asArray(req.query.country);
  if (countries.length) filter.country = { $in: countries };
  const degreeLevels = asArray(req.query.degreeLevel);
  if (degreeLevels.length) filter.degreeLevels = { $in: degreeLevels };
  const fields = asArray(req.query.field);
  if (fields.length) filter.fields = { $in: fields };
  const funding = asArray(req.query.fundingType);
  if (funding.length) filter.fundingType = { $in: funding };
  if (req.query.deadlineFrom || req.query.deadlineTo) {
    filter.deadline = {};
    if (req.query.deadlineFrom) filter.deadline.$gte = new Date(String(req.query.deadlineFrom));
    if (req.query.deadlineTo) filter.deadline.$lte = new Date(String(req.query.deadlineTo));
  }
  if (req.query.featured === "true") filter.isFeatured = true;

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    deadline: { deadline: 1 },
    newest: { createdAt: -1 },
    funding: { estimatedValue: -1 },
    rating: { averageRating: -1 },
    alphabetical: { title: 1 }
  };
  const sort = sortMap[String(req.query.sort ?? "deadline")] ?? { deadline: 1 as const };
  const [items, total] = await Promise.all([
    Scholarship.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Scholarship.countDocuments(filter)
  ]);
  return sendSuccess(res, items, "Scholarships retrieved", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  });
});

export const scholarshipFacets = asyncHandler(async (_req: Request, res: Response) => {
  const [countries, degreeLevels, fields, fundingTypes] = await Promise.all([
    Scholarship.distinct("country", { status: "published" }),
    Scholarship.distinct("degreeLevels", { status: "published" }),
    Scholarship.distinct("fields", { status: "published" }),
    Scholarship.distinct("fundingType", { status: "published" })
  ]);
  return sendSuccess(res, { countries, degreeLevels, fields, fundingTypes }, "Filter options retrieved");
});

export const getScholarship = asyncHandler(async (req: Request, res: Response) => {
  const scholarship = await Scholarship.findOne({ slug: req.params.slug, status: "published" }).lean();
  if (!scholarship) throw new AppError("Scholarship not found", 404);
  const [reviews, related] = await Promise.all([
    Review.find({ scholarshipId: scholarship._id, status: "approved" }).populate("userId", "name image").sort({ createdAt: -1 }).limit(20).lean(),
    Scholarship.find({
      _id: { $ne: scholarship._id },
      status: "published",
      $or: [
        { country: scholarship.country },
        { degreeLevels: { $in: scholarship.degreeLevels } },
        { fields: { $in: scholarship.fields } }
      ]
    }).limit(4).lean()
  ]);
  return sendSuccess(res, { scholarship, reviews, related }, "Scholarship details retrieved");
});

export const createScholarship = asyncHandler(async (req: Request, res: Response) => {
  let slug = createSlug(req.body.title);
  if (await Scholarship.exists({ slug })) slug = `${slug}-${Date.now().toString().slice(-6)}`;
  const scholarship = await Scholarship.create({
    ...req.body,
    slug,
    createdBy: req.user!._id,
    status: req.user!.role === "admin" ? "published" : "pending",
    isFeatured: false
  });
  return sendSuccess(res, scholarship, req.user!.role === "admin" ? "Scholarship published" : "Scholarship submitted for review", 201);
});

export const manageScholarships = asyncHandler(async (req: Request, res: Response) => {
  const filter = req.user!.role === "admin" ? {} : { createdBy: req.user!._id };
  const items = await Scholarship.find(filter).sort({ createdAt: -1 }).lean();
  return sendSuccess(res, items, "Managed scholarships retrieved");
});

export const updateScholarship = asyncHandler(async (req: Request, res: Response) => {
  const current = await Scholarship.findById(req.params.id);
  if (!current) throw new AppError("Scholarship not found", 404);
  if (req.user!.role !== "admin" && String(current.createdBy) !== req.user!.id) throw new AppError("Forbidden", 403);
  Object.assign(current, req.body);
  if (req.body.title) current.slug = createSlug(req.body.title);
  if (req.user!.role !== "admin") current.status = "pending";
  await current.save();
  return sendSuccess(res, current, "Scholarship updated");
});

export const deleteScholarship = asyncHandler(async (req: Request, res: Response) => {
  const current = await Scholarship.findById(req.params.id);
  if (!current) throw new AppError("Scholarship not found", 404);
  if (req.user!.role !== "admin" && String(current.createdBy) !== req.user!.id) throw new AppError("Forbidden", 403);
  await current.deleteOne();
  return sendSuccess(res, null, "Scholarship deleted");
});

export const reviewScholarshipStatus = asyncHandler(async (req: Request, res: Response) => {
  const scholarship = await Scholarship.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: "after", runValidators: true });
  if (!scholarship) throw new AppError("Scholarship not found", 404);
  return sendSuccess(res, scholarship, "Scholarship status updated");
});

export const addReview = asyncHandler(async (req: Request, res: Response) => {
  const scholarship = await Scholarship.findById(req.params.id);
  if (!scholarship || scholarship.status !== "published") throw new AppError("Scholarship not found", 404);
  const review = await Review.findOneAndUpdate(
    { userId: req.user!._id, scholarshipId: scholarship._id },
    { rating: req.body.rating, comment: req.body.comment, status: "pending" },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
  return sendSuccess(res, review, "Review submitted for moderation", 201);
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOneAndUpdate(
    { _id: req.params.reviewId, scholarshipId: req.params.id },
    { status: req.body.status },
    { returnDocument: "after", runValidators: true }
  );
  if (!review) throw new AppError("Review not found", 404);
  const approved = await Review.aggregate([
    { $match: { scholarshipId: review.scholarshipId, status: "approved" } },
    { $group: { _id: "$scholarshipId", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
  ]);
  await Scholarship.findByIdAndUpdate(req.params.id, {
    averageRating: approved[0]?.averageRating ?? 0,
    reviewCount: approved[0]?.reviewCount ?? 0
  });
  return sendSuccess(res, review, "Review status updated");
});
