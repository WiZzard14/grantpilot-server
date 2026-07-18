import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const uploadDir = process.env.VERCEL
  ? "/tmp/grantpilot-uploads"
  : path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const allowed = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp"
]);

export const uploadDocument = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const safeExtension = path.extname(file.originalname).toLowerCase().slice(0, 10);
      callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    }
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) return callback(new AppError("Unsupported file type", 415));
    callback(null, true);
  }
});
