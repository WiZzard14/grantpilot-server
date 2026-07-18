import assert from "node:assert/strict";
import test from "node:test";
import { User } from "../models/User.js";
import { normalizeLegacyUser } from "./userRole.js";

test("legacy user role is normalized to student", () => {
  const user = User.hydrate({
    _id: "507f1f77bcf86cd799439011",
    name: "Legacy User",
    email: "legacy@example.com",
    provider: "credentials",
    role: "user",
    profileCompletion: 0,
    refreshTokenVersion: 0,
    isActive: true
  });

  const changed = normalizeLegacyUser(user);
  assert.equal(changed, true);
  assert.equal(user.role, "student");
});

test("valid admin role is preserved", () => {
  const user = User.hydrate({
    _id: "507f1f77bcf86cd799439012",
    name: "Admin",
    email: "admin@example.com",
    provider: "credentials",
    role: "admin",
    profileCompletion: 100,
    refreshTokenVersion: 0,
    isActive: true
  });

  const changed = normalizeLegacyUser(user);
  assert.equal(changed, false);
  assert.equal(user.role, "admin");
});
