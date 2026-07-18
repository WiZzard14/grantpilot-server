import type { HydratedDocument } from "mongoose";
import type { IUser } from "../models/User.js";

export function normalizeLegacyUser(user: HydratedDocument<IUser>): boolean {
  let changed = false;
  const record = user as HydratedDocument<IUser> & {
    role?: string;
    provider?: string;
    passwordHash?: string;
  };

  if (record.role !== "student" && record.role !== "admin") {
    record.role = "student";
    changed = true;
  }

  if (record.provider !== "credentials" && record.provider !== "firebase") {
    record.provider = record.provider === "google" ? "firebase" : "credentials";
    changed = true;
  }

  return changed;
}
