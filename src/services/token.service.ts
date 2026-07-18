import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Response } from "express";
import type { HydratedDocument } from "mongoose";
import { env } from "../config/env.js";
import type { IUser } from "../models/User.js";

interface AccessPayload extends JwtPayload {
  sub: string;
  role: "student" | "admin";
  type: "access";
}

interface RefreshPayload extends JwtPayload {
  sub: string;
  version: number;
  type: "refresh";
}

const cookieBase = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
};

export function createTokens(user: HydratedDocument<IUser>) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_MINUTES * 60 }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, version: user.refreshTokenVersion ?? 0, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 }
  );
  return { accessToken, refreshToken };
}

export function setAuthCookies(res: Response, tokens: ReturnType<typeof createTokens>) {
  res.cookie("grantpilot_access", tokens.accessToken, {
    ...cookieBase,
    maxAge: env.ACCESS_TOKEN_MINUTES * 60 * 1000
  });
  res.cookie("grantpilot_refresh", tokens.refreshToken, {
    ...cookieBase,
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("grantpilot_access", cookieBase);
  res.clearCookie("grantpilot_refresh", cookieBase);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}
