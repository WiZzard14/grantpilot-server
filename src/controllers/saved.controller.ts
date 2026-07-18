import type { Request, Response } from "express";
import { SavedScholarship } from "../models/SavedScholarship.js";
import { Interaction } from "../models/Interaction.js";
import { Scholarship } from "../models/Scholarship.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const listSaved = asyncHandler(async (req: Request, res: Response) => {
  const items = await SavedScholarship.find({ userId: req.user!._id })
    .populate("scholarshipId")
    .sort({ updatedAt: -1 })
    .lean();
  return sendSuccess(res, items, "Saved scholarships retrieved");
});

export const saveScholarship = asyncHandler(async (req: Request, res: Response) => {
  const exists = await Scholarship.exists({ _id: String(req.params.id), status: "published" });
  if (!exists) throw new AppError("Scholarship not found", 404);
  const saved = await SavedScholarship.findOneAndUpdate(
    { userId: req.user!._id, scholarshipId: String(req.params.id) },
    { status: req.body.status ?? "saved", notes: req.body.notes ?? "" },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
  await Interaction.create({ userId: req.user!._id, scholarshipId: String(req.params.id), type: req.body.status === "applied" ? "applied" : "saved" });
  return sendSuccess(res, saved, "Scholarship saved");
});

export const updateSaved = asyncHandler(async (req: Request, res: Response) => {
  const saved = await SavedScholarship.findOneAndUpdate(
    { userId: req.user!._id, scholarshipId: String(req.params.id) },
    { status: req.body.status, notes: req.body.notes },
    { returnDocument: "after", runValidators: true }
  );
  if (!saved) throw new AppError("Saved scholarship not found", 404);
  if (req.body.status === "applied") await Interaction.create({ userId: req.user!._id, scholarshipId: String(req.params.id), type: "applied" });
  return sendSuccess(res, saved, "Application status updated");
});

export const removeSaved = asyncHandler(async (req: Request, res: Response) => {
  await SavedScholarship.deleteOne({ userId: req.user!._id, scholarshipId: String(req.params.id) });
  return sendSuccess(res, null, "Scholarship removed from saved list");
});

export const trackInteraction = asyncHandler(async (req: Request, res: Response) => {
  const interaction = await Interaction.create({ userId: req.user!._id, scholarshipId: String(req.params.id), type: req.body.type, metadata: req.body.metadata ?? {} });
  return sendSuccess(res, interaction, "Interaction recorded", 201);
});
