import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, registerSchema } from "./auth.validators.js";

test("registration accepts a normal six-character password", () => {
  const result = registerSchema.safeParse({
    body: { name: "Test User", email: "TEST@example.com", password: "abc123" },
    query: {},
    params: {}
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.body.email, "test@example.com");
});

test("registration rejects passwords shorter than six characters", () => {
  const result = registerSchema.safeParse({
    body: { name: "Test User", email: "test@example.com", password: "12345" },
    query: {},
    params: {}
  });

  assert.equal(result.success, false);
});

test("login only requires a non-empty password", () => {
  const result = loginSchema.safeParse({
    body: { email: "test@example.com", password: "x" },
    query: {},
    params: {}
  });

  assert.equal(result.success, true);
});
