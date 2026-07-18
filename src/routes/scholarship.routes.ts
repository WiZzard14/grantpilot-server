import { Router } from "express";
import { z } from "zod";
import {
  addReview,
  createScholarship,
  deleteScholarship,
  getScholarship,
  listScholarships,
  manageScholarships,
  moderateReview,
  reviewScholarshipStatus,
  scholarshipFacets,
  updateScholarship
} from "../controllers/scholarship.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createScholarshipSchema, updateScholarshipSchema } from "../validators/scholarship.validators.js";

export const scholarshipRouter = Router();
scholarshipRouter.get("/facets", scholarshipFacets);
scholarshipRouter.get("/", listScholarships);
scholarshipRouter.get("/manage", authenticate, manageScholarships);
scholarshipRouter.get("/:slug", getScholarship);
scholarshipRouter.post("/", authenticate, validate(createScholarshipSchema), createScholarship);
scholarshipRouter.patch("/:id", authenticate, validate(updateScholarshipSchema), updateScholarship);
scholarshipRouter.delete("/:id", authenticate, deleteScholarship);
scholarshipRouter.patch("/:id/status", authenticate, authorize("admin"), validate(z.object({ body: z.object({ status: z.enum(["pending", "published", "rejected"]) }), query: z.any(), params: z.any() })), reviewScholarshipStatus);
scholarshipRouter.post("/:id/reviews", authenticate, validate(z.object({ body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().min(10).max(1200) }), query: z.any(), params: z.any() })), addReview);

scholarshipRouter.patch("/:id/reviews/:reviewId/status", authenticate, authorize("admin"), validate(z.object({ body: z.object({ status: z.enum(["pending", "approved", "rejected"]) }), query: z.any(), params: z.any() })), moderateReview);
