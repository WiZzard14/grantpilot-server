import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { clearAuthCookies, verifyAccessToken } from "../services/token.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeLegacyUser } from "../utils/userRole.js";

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.grantpilot_access ?? bearer;
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    clearAuthCookies(res);
    throw new AppError("Session expired or invalid", 401);
  }

  if (payload.type !== "access") {
    clearAuthCookies(res);
    throw new AppError("Invalid access token", 401);
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    clearAuthCookies(res);
    throw new AppError("Account not available", 401);
  }

  if (normalizeLegacyUser(user)) await user.save();

  req.user = user;
  next();
});

export function authorize(...roles: Array<"student" | "admin">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError("Forbidden", 403));
    next();
  };
}
