import { Router } from "express";
import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get("/summary", dashboardSummary);
