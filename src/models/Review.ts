import { Schema, model, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scholarshipId: { type: Schema.Types.ObjectId, ref: "Scholarship", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1200 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

reviewSchema.index({ userId: 1, scholarshipId: 1 }, { unique: true });
export type IReview = InferSchemaType<typeof reviewSchema>;
export const Review = model<IReview>("Review", reviewSchema);
