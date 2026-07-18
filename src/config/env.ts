import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional()
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().min(1).default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1).default("grantpilot_ai"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),
  ACCESS_TOKEN_MINUTES: z.coerce.number().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().positive().default(7),
  COOKIE_DOMAIN: emptyToUndefined(z.string().min(1)),

  // Firebase ID-token verification uses Google public signing keys.
  // Only the Firebase project ID is required on the server.
  FIREBASE_PROJECT_ID: emptyToUndefined(z.string().min(1)),

  AI_PROVIDER: z.enum(["auto", "gemini", "openai", "local"]).default("auto"),
  GEMINI_API_KEY: emptyToUndefined(z.string().min(1)),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  OPENAI_API_KEY: emptyToUndefined(z.string().min(1)),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),

  ADMIN_EMAIL: emptyToUndefined(z.string().email()),
  ADMIN_PASSWORD: emptyToUndefined(z.string().min(6)),
  ADMIN_NAME: z.string().min(2).default("GrantPilot Admin"),
  ADMIN_IMAGE: emptyToUndefined(z.string().url())
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
