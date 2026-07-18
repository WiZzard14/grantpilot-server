import { Router } from "express";
import { z } from "zod";
import { aiStatus, recommendationFeedback, recommendationHistory, recommendations } from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const aiRouter = Router();
aiRouter.use(authenticate);
aiRouter.get("/status", aiStatus);
aiRouter.post("/recommendations", validate(z.object({ body: z.object({ refinement: z.string().max(600).optional() }), query: z.any(), params: z.any() })), recommendations);
aiRouter.get("/recommendations/history", recommendationHistory);
aiRouter.post("/recommendations/:id/feedback", validate(z.object({ body: z.object({ feedback: z.enum(["helpful", "not_helpful"]), scholarshipId: z.string().optional(), interactionType: z.enum(["dismissed", "not_interested", "recommendation_clicked"]).optional() }), query: z.any(), params: z.any() })), recommendationFeedback);
