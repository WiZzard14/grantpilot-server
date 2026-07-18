import { Router } from "express";
import { z } from "zod";
import { getBlog, listBlogs, submitContact } from "../controllers/content.controller.js";
import { publicStats } from "../controllers/dashboard.controller.js";
import { validate } from "../middleware/validate.js";

export const contentRouter = Router();
contentRouter.get("/blogs", listBlogs);
contentRouter.get("/blogs/:slug", getBlog);
contentRouter.get("/stats", publicStats);
contentRouter.post("/contact", validate(z.object({ body: z.object({ name: z.string().min(2).max(100), email: z.string().email(), subject: z.string().min(3).max(180), message: z.string().min(20).max(3000) }), query: z.any(), params: z.any() })), submitContact);
