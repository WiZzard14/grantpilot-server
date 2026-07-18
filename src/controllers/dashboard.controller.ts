import type { Request, Response } from "express";
import { SavedScholarship } from "../models/SavedScholarship.js";
import { Document } from "../models/Document.js";
import { AIAnalysis } from "../models/AIAnalysis.js";
import { Scholarship } from "../models/Scholarship.js";
import { StudentProfile } from "../models/StudentProfile.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const dashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const thirtyDays = new Date(Date.now() + 30 * 86_400_000);
  const [saved, documents, analyses, profile, totalPublished] = await Promise.all([
    SavedScholarship.find({ userId }).populate("scholarshipId").lean(),
    Document.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    AIAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    StudentProfile.findOne({ userId }).lean(),
    Scholarship.countDocuments({ status: "published" })
  ]);
  const upcoming = saved.filter((item: any) => {
    const deadline = item.scholarshipId?.deadline ? new Date(item.scholarshipId.deadline) : null;
    return deadline && deadline >= new Date() && deadline <= thirtyDays;
  });
  const statusCounts = ["saved", "preparing", "applied", "accepted", "rejected"].map((status) => ({
    status,
    count: saved.filter((item) => item.status === status).length
  }));
  const countryMap = new Map<string, number>();
  for (const item of saved as any[]) {
    const country = item.scholarshipId?.country;
    if (country) countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
  }
  const countryData = [...countryMap.entries()].map(([country, count]) => ({ country, count }));
  return sendSuccess(res, {
    summary: {
      profileCompletion: req.user!.profileCompletion,
      savedCount: saved.length,
      upcomingDeadlineCount: upcoming.length,
      documentsNeedingAttention: documents.filter((document) => ["uploaded", "failed"].includes(document.processingStatus)).length,
      totalPublished
    },
    statusCounts,
    countryData,
    upcoming: upcoming.slice(0, 5),
    recentDocuments: documents,
    recentAnalyses: analyses,
    profile
  }, "Dashboard data retrieved");
});

export const publicStats = asyncHandler(async (_req: Request, res: Response) => {
  const [activeScholarships, countries, analyses, usersWithProfiles] = await Promise.all([
    Scholarship.countDocuments({ status: "published", deadline: { $gte: new Date() } }),
    Scholarship.distinct("country", { status: "published" }),
    AIAnalysis.countDocuments(),
    StudentProfile.countDocuments()
  ]);
  return sendSuccess(res, {
    activeScholarships,
    supportedCountries: countries.length,
    analysesCompleted: analyses,
    profilesBuilt: usersWithProfiles
  }, "Public statistics retrieved");
});
