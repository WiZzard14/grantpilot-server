import { Router } from "express";
import { z } from "zod";
import { listSaved, removeSaved, saveScholarship, trackInteraction, updateSaved } from "../controllers/saved.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const savedRouter = Router();
savedRouter.use(authenticate);
savedRouter.get("/", listSaved);
savedRouter.put("/:id", validate(z.object({ body: z.object({ status: z.enum(["saved", "preparing", "applied", "accepted", "rejected"]).optional(), notes: z.string().max(1000).optional() }), query: z.any(), params: z.any() })), saveScholarship);
savedRouter.patch("/:id", validate(z.object({ body: z.object({ status: z.enum(["saved", "preparing", "applied", "accepted", "rejected"]), notes: z.string().max(1000).optional() }), query: z.any(), params: z.any() })), updateSaved);
savedRouter.delete("/:id", removeSaved);
savedRouter.post("/:id/interactions", validate(z.object({ body: z.object({ type: z.enum(["viewed", "saved", "dismissed", "applied", "not_interested", "recommendation_clicked"]), metadata: z.record(z.string(), z.unknown()).optional() }), query: z.any(), params: z.any() })), trackInteraction);
