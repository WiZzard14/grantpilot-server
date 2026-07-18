import { Schema, model, type InferSchemaType } from "mongoose";

const blogSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    image: { type: String, required: true },
    author: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    status: { type: String, enum: ["draft", "published"], default: "published" }
  },
  { timestamps: true }
);

export type IBlog = InferSchemaType<typeof blogSchema>;
export const Blog = model<IBlog>("Blog", blogSchema);
