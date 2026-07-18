import { Schema, model, type InferSchemaType } from "mongoose";

const savedScholarshipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scholarshipId: { type: Schema.Types.ObjectId, ref: "Scholarship", required: true, index: true },
    status: {
      type: String,
      enum: ["saved", "preparing", "applied", "accepted", "rejected"],
      default: "saved",
      index: true
    },
    notes: { type: String, maxlength: 1000 }
  },
  { timestamps: true }
);

savedScholarshipSchema.index({ userId: 1, scholarshipId: 1 }, { unique: true });

export type ISavedScholarship = InferSchemaType<typeof savedScholarshipSchema>;
export const SavedScholarship = model<ISavedScholarship>("SavedScholarship", savedScholarshipSchema);
