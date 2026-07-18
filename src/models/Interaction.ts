import { Schema, model, type InferSchemaType } from "mongoose";

const interactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scholarshipId: { type: Schema.Types.ObjectId, ref: "Scholarship", required: true, index: true },
    type: {
      type: String,
      enum: ["viewed", "saved", "dismissed", "applied", "not_interested", "recommendation_clicked"],
      required: true,
      index: true
    },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

interactionSchema.index({ userId: 1, createdAt: -1 });

export type IInteraction = InferSchemaType<typeof interactionSchema>;
export const Interaction = model<IInteraction>("Interaction", interactionSchema);
