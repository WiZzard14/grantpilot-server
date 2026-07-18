import { Schema, model, type InferSchemaType } from "mongoose";

const aiAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: "Document", index: true },
    scholarshipId: { type: Schema.Types.ObjectId, ref: "Scholarship", index: true },
    analysisType: { type: String, enum: ["recommendation", "document", "chat"], required: true, index: true },
    structuredResult: { type: Schema.Types.Mixed, required: true },
    modelProvider: { type: String, required: true },
    promptVersion: { type: String, required: true },
    tokenUsage: { type: Number, default: 0 },
    feedback: { type: String, enum: ["helpful", "not_helpful", "none"], default: "none" }
  },
  { timestamps: true }
);

export type IAIAnalysis = InferSchemaType<typeof aiAnalysisSchema>;
export const AIAnalysis = model<IAIAnalysis>("AIAnalysis", aiAnalysisSchema);
