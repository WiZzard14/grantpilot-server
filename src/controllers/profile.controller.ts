import type { Request, Response } from "express";
import { StudentProfile } from "../models/StudentProfile.js";
import { publicUser } from "./auth.controller.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function calculateCompletion(profile: Record<string, any>) {
  const fields = ["nationality", "currentCountry", "degreeLevel", "fieldOfStudy", "gpa", "graduationYear", "fundingPreference"];
  const completed = fields.filter((field) => profile[field] !== undefined && profile[field] !== "").length;
  const preferences = (profile.preferredCountries?.length ? 1 : 0) + (profile.preferredFields?.length ? 1 : 0);
  return Math.round(((completed + preferences) / (fields.length + 2)) * 100);
}

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await StudentProfile.findOne({ userId: req.user!._id }).lean();
  return sendSuccess(res, profile, "Profile retrieved");
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await StudentProfile.findOneAndUpdate(
    { userId: req.user!._id },
    { ...req.body, userId: req.user!._id },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
  const completion = calculateCompletion(profile.toObject());
  req.user!.profileCompletion = completion;
  await req.user!.save();
  return sendSuccess(res, { profile, profileCompletion: completion }, "Profile updated");
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  if (req.body.useGoogle) {
    if (!user.googleImage) {
      throw new AppError("No Google profile photo is available for this account", 400);
    }
    user.image = user.googleImage;
    user.imageSource = "google";
  } else if (req.body.remove) {
    user.image = undefined;
    user.imageSource = "none";
  } else if (req.body.image) {
    user.image = req.body.image.trim();
    user.imageSource = "custom";
  }

  await user.save();
  return sendSuccess(res, publicUser(user), "Profile photo updated");
});
