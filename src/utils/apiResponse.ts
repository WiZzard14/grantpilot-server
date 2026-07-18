import type { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Request completed successfully",
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  return res.status(statusCode).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}
