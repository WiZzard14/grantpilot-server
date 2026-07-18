import type { Request, Response } from "express";
import { AIAnalysis } from "../models/AIAnalysis.js";
import { Interaction } from "../models/Interaction.js";
import { runRecommendationAgent } from "../services/agents/recommendation.agent.js";
import { getAIStatus } from "../services/ai/provider.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const aiStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = getAIStatus();
  return sendSuccess(
    res,
    {
      ...status,
      features: [
        "profile-aware scholarship recommendations",
        "document intelligence and downloadable reports",
        "contextual scholarship assistant"
      ]
    },
    "AI status retrieved"
  );
});

export const recommendations = asyncHandler(async (req: Request, res: Response) => {
  const result = await runRecommendationAgent(req.user!._id, req.body.refinement);
  return sendSuccess(res, result, "Recommendations generated");
});

export const recommendationHistory = asyncHandler(async (req: Request, res: Response) => {
  const items = await AIAnalysis.find({ userId: req.user!._id, analysisType: "recommendation" }).sort({ createdAt: -1 }).limit(20).lean();
  return sendSuccess(res, items, "Recommendation history retrieved");
});

export const recommendationFeedback = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await AIAnalysis.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { feedback: req.body.feedback },
    { returnDocument: "after" }
  );
  if (req.body.scholarshipId && req.body.interactionType) {
    await Interaction.create({ userId: req.user!._id, scholarshipId: req.body.scholarshipId, type: req.body.interactionType });
  }
  return sendSuccess(res, analysis, "Feedback recorded");
});
