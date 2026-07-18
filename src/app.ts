import express, { type RequestHandler } from "express";
import cors, { type CorsOptions } from "cors";
import helmetPackage, { type HelmetOptions } from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { ensureRuntimeReady } from "./config/runtime.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { asyncHandler } from "./utils/asyncHandler.js";

const helmet = helmetPackage as unknown as (
  options?: Readonly<HelmetOptions>
) => RequestHandler;

export const app = express();
app.set("trust proxy", 1);

const configuredOrigins = env.CLIENT_URL.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    const isConfigured = configuredOrigins.includes(normalizedOrigin);
    const isLocalDevelopment =
      env.NODE_ENV === "development" &&
      /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(normalizedOrigin);

    if (isConfigured || isLocalDevelopment) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);
app.use(
  "/api/ai",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

app.get("/", (_req, res) => {
  res.send("GrantPilot AI Server is running perfectly!");
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "grantpilot-api",
    timestamp: new Date().toISOString()
  });
});

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    await ensureRuntimeReady();
    res.json({
      success: true,
      service: "GrantPilot AI API",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  })
);

app.use(
  "/api",
  asyncHandler(async (_req, _res, next) => {
    await ensureRuntimeReady();
    next();
  })
);

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
