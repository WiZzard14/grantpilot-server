import { Schema, model, type InferSchemaType } from "mongoose";

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    storagePath: { type: String, required: true },
    size: { type: Number, required: true },
    processingStatus: {
      type: String,
      enum: ["uploaded", "extracting", "classifying", "analyzing", "completed", "failed"],
      default: "uploaded",
      index: true
    },
    documentType: {
      type: String,
      enum: ["CV", "SOP", "Transcript", "Recommendation Letter", "Scholarship Notice", "Offer Letter", "Other"],
      default: "Other"
    },
    extractedText: { type: String, select: false },
    errorMessage: String
  },
  { timestamps: true }
);

export type IDocument = InferSchemaType<typeof documentSchema>;
export const Document = model<IDocument>("Document", documentSchema);
