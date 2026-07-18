import { Schema, model, type InferSchemaType } from "mongoose";

function normalizeRole(value: unknown) {
  return value === "admin" ? "admin" : "student";
}

function normalizeProvider(value: unknown) {
  return value === "firebase" || value === "google" ? "firebase" : "credentials";
}

function normalizeImageSource(value: unknown) {
  return value === "google" || value === "custom" ? value : "none";
}

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    image: { type: String, trim: true },
    googleImage: { type: String, trim: true },
    imageSource: {
      type: String,
      enum: ["google", "custom", "none"],
      default: "none",
      set: normalizeImageSource
    },
    provider: {
      type: String,
      enum: ["credentials", "firebase"],
      default: "credentials",
      set: normalizeProvider
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
      index: true,
      set: normalizeRole
    },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    refreshTokenVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre("validate", function () {
  const user = this as typeof this & {
    role?: string;
    provider?: string;
    imageSource?: string;
    image?: string;
    googleImage?: string;
  };

  if (user.role !== "student" && user.role !== "admin") user.role = "student";
  if (user.provider !== "credentials" && user.provider !== "firebase") {
    user.provider = user.provider === "google" ? "firebase" : "credentials";
  }
  if (user.imageSource !== "google" && user.imageSource !== "custom" && user.imageSource !== "none") {
    user.imageSource = user.image ? "custom" : "none";
  }
  if (!user.image) user.imageSource = "none";
  if (user.imageSource === "google" && !user.googleImage) user.imageSource = user.image ? "custom" : "none";
});

export type IUser = InferSchemaType<typeof userSchema>;
export const User = model<IUser>("User", userSchema);
