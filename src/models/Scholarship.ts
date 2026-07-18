import { Schema, model, type InferSchemaType } from "mongoose";

const scholarshipSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180, index: "text" },
    slug: { type: String, required: true, unique: true, index: true },
    shortDescription: { type: String, required: true, maxlength: 320 },
    fullDescription: { type: String, required: true, maxlength: 12000 },
    providerName: { type: String, required: true, trim: true, index: "text" },
    providerImage: { type: String, default: "/scholarships/custom.svg" },
    images: { type: [String], default: [] },
    country: { type: String, required: true, index: true },
    location: { type: String, default: "International" },
    degreeLevels: { type: [String], required: true, index: true },
    fields: { type: [String], required: true, index: true },
    fundingType: {
      type: String,
      enum: ["Fully Funded", "Partially Funded", "Tuition Waiver", "Research Grant"],
      required: true,
      index: true
    },
    estimatedValue: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    benefits: { type: [String], default: [] },
    eligibility: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },
    minimumGpa: Number,
    deadline: { type: Date, required: true, index: true },
    deadlineLabel: String,
    deadlineIsEstimated: { type: Boolean, default: false },
    officialUrl: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    lastVerifiedAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "published", "rejected"], default: "pending", index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

scholarshipSchema.index({ title: "text", providerName: "text", fields: "text", country: "text" });

export type IScholarship = InferSchemaType<typeof scholarshipSchema>;
export const Scholarship = model<IScholarship>("Scholarship", scholarshipSchema);
