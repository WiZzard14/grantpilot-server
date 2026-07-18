import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = error instanceof AppError ? error.statusCode : 500;
  let message = error instanceof Error ? error.message : "Unexpected server error";
  let details = error instanceof AppError ? error.details : undefined;

  if (error instanceof ZodError) {
    statusCode = 422;
    message = "Validation failed";
    details = error.flatten();
  }
  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.message;
  }
  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired or invalid";
  }
  if (error?.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
    details = error.keyValue;
  }
  if (error?.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  const shouldLog = statusCode >= 500 || env.NODE_ENV === "production";
  if (env.NODE_ENV !== "test" && shouldLog) console.error(error);
  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === "development" && error?.stack ? { stack: error.stack } : {})
  });
};
