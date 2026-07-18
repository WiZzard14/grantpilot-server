import type { Request, Response } from "express";
import { Blog } from "../models/Blog.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const listBlogs = asyncHandler(async (_req: Request, res: Response) => {
  const blogs = await Blog.find({ status: "published" }).sort({ publishedAt: -1 }).lean();
  return sendSuccess(res, blogs, "Blogs retrieved");
});

export const getBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: "published" }).lean();
  if (!blog) throw new AppError("Blog article not found", 404);
  return sendSuccess(res, blog, "Blog retrieved");
});

export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const message = await ContactMessage.create(req.body);
  return sendSuccess(res, { id: message.id }, "Your message has been received", 201);
});
