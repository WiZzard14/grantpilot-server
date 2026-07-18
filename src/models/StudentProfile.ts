import { Schema, model, type InferSchemaType } from "mongoose";

const englishTestSchema = new Schema(
  {
    name: { type: String, enum: ["IELTS", "TOEFL", "PTE", "Duolingo", "Other"], required: true },
    score: { type: Number, required: true },
    takenAt: Date
  },
  { _id: false }
);

const studentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    nationality: { type: String, trim: true },
    currentCountry: { type: String, trim: true },
    degreeLevel: { type: String, enum: ["high-school", "bachelors", "masters", "phd", "other"] },
    fieldOfStudy: { type: String, trim: true },
    gpa: Number,
    gpaScale: { type: Number, default: 4 },
    graduationYear: Number,
    englishTests: { type: [englishTestSchema], default: [] },
    workExperienceYears: { type: Number, default: 0, min: 0 },
    preferredCountries: { type: [String], default: [] },
    preferredFields: { type: [String], default: [] },
    fundingPreference: {
      type: String,
      enum: ["fully-funded", "tuition-waiver", "partial", "any"],
      default: "any"
    },
    notes: { type: String, maxlength: 1000 }
  },
  { timestamps: true }
);

export type IStudentProfile = InferSchemaType<typeof studentProfileSchema>;
export const StudentProfile = model<IStudentProfile>("StudentProfile", studentProfileSchema);
