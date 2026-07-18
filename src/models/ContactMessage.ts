import { Schema, model, type InferSchemaType } from "mongoose";

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 180 },
    subject: { type: String, required: true, maxlength: 180 },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ["new", "resolved"], default: "new" }
  },
  { timestamps: true }
);

export type IContactMessage = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model<IContactMessage>("ContactMessage", contactMessageSchema);
