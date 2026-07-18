import { z } from "zod";

export const credentialPassword = z
  .string()
  .min(6, "Password must contain at least 6 characters")
  .max(72, "Password cannot exceed 72 characters");

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must contain at least 2 characters").max(100),
    email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
    password: credentialPassword
  }),
  query: z.any(),
  params: z.any()
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Password is required")
  }),
  query: z.any(),
  params: z.any()
});

export const firebaseSchema = z.object({
  body: z.object({ idToken: z.string().min(100, "Firebase ID token is missing or invalid") }),
  query: z.any(),
  params: z.any()
});
