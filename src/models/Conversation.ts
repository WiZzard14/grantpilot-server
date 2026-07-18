import { Schema, model, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    messages: { type: [messageSchema], default: [] },
    memorySummary: { type: String, maxlength: 4000, default: "" }
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

export type IConversation = InferSchemaType<typeof conversationSchema>;
export const Conversation = model<IConversation>("Conversation", conversationSchema);
