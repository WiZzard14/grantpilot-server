import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import {
  isFirebaseTokenVerificationConfigured,
  verifyFirebaseIdToken
} from "../config/firebase-token.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { normalizeLegacyUser } from "../utils/userRole.js";
import { clearAuthCookies, createTokens, setAuthCookies, verifyRefreshToken } from "../services/token.service.js";

export function publicUser(user: any) {
  const imageSource =
    user.imageSource === "google" || user.imageSource === "custom"
      ? user.imageSource
      : user.image
        ? "custom"
        : "none";

  return {
    id: user.id ?? String(user._id),
    name: user.name,
    email: user.email,
    image: user.image,
    imageSource,
    hasGoogleImage: Boolean(user.googleImage),
    role: user.role,
    profileCompletion: user.profileCompletion,
    provider: user.provider
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const existing = await User.findOne({ email: req.body.email }).select("+passwordHash");
  if (existing) {
    if (existing.provider === "firebase" && !existing.passwordHash) {
      throw new AppError("This email already uses Google sign-in. Continue with Google instead.", 409);
    }
    throw new AppError("An account already exists with this email", 409);
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    provider: "credentials",
    role: "student",
    imageSource: "none"
  });

  setAuthCookies(res, createTokens(user));
  return sendSuccess(res, publicUser(user), "Registration successful", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");

  if (user?.provider === "firebase" && !user.passwordHash) {
    throw new AppError("This account uses Google sign-in. Continue with Google instead.", 401);
  }

  if (user && normalizeLegacyUser(user)) await user.save();

  if (!user?.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.isActive) throw new AppError("This account is disabled", 403);

  setAuthCookies(res, createTokens(user));
  return sendSuccess(res, publicUser(user), "Login successful");
});

export const firebaseStatus = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(
    res,
    {
      configured: isFirebaseTokenVerificationConfigured(),
      mode: isFirebaseTokenVerificationConfigured()
        ? "firebase-public-key-verification"
        : "not-configured",
      requiresServiceAccount: false
    },
    isFirebaseTokenVerificationConfigured()
      ? "Firebase token verification is configured"
      : "Firebase token verification is not configured"
  );
});

export const firebaseLogin = asyncHandler(async (req: Request, res: Response) => {
  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(req.body.idToken);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Google sign-in token could not be verified by Firebase", 401);
  }

  const email = decodedToken.email?.toLowerCase();
  if (!email || !decodedToken.email_verified) {
    throw new AppError("Firebase could not verify this email", 401);
  }

  const googlePicture = decodedToken.picture?.trim() || undefined;
  let user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    user = await User.create({
      name: decodedToken.name || email.split("@")[0],
      email,
      image: googlePicture,
      googleImage: googlePicture,
      imageSource: googlePicture ? "google" : "none",
      provider: "firebase",
      role: "student"
    });
  } else {
    let changed = normalizeLegacyUser(user);

    // Migrate accounts created before imageSource/googleImage existed.
    if (!user.imageSource || !["google", "custom", "none"].includes(user.imageSource)) {
      user.imageSource = user.provider === "firebase" && user.image ? "google" : user.image ? "custom" : "none";
      changed = true;
    }

    if (googlePicture && user.googleImage !== googlePicture) {
      user.googleImage = googlePicture;
      changed = true;
    }

    // Google photo stays fresh, but a custom user-selected photo is never overwritten.
    if (user.imageSource !== "custom") {
      if (googlePicture && (user.image !== googlePicture || user.imageSource !== "google")) {
        user.image = googlePicture;
        user.imageSource = "google";
        changed = true;
      } else if (!googlePicture && !user.image && user.imageSource !== "none") {
        user.imageSource = "none";
        changed = true;
      }
    }

    // Keep credentials as the primary provider when a password already exists.
    if (!user.passwordHash && user.provider !== "firebase") {
      user.provider = "firebase";
      changed = true;
    }

    if (changed) await user.save();
  }

  if (!user.isActive) throw new AppError("This account is disabled", 403);

  setAuthCookies(res, createTokens(user));
  return sendSuccess(res, publicUser(user), "Firebase login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.grantpilot_refresh;
  if (!token) throw new AppError("Refresh token missing", 401);

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    throw new AppError("Session expired or invalid", 401);
  }
  if (payload.type !== "refresh") {
    clearAuthCookies(res);
    throw new AppError("Invalid refresh token", 401);
  }

  const user = await User.findById(payload.sub);
  if (user && normalizeLegacyUser(user)) await user.save();
  if (!user || user.refreshTokenVersion !== payload.version || !user.isActive) {
    throw new AppError("Refresh session is no longer valid", 401);
  }

  setAuthCookies(res, createTokens(user));
  return sendSuccess(res, publicUser(user), "Session refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    req.user.refreshTokenVersion = (req.user.refreshTokenVersion ?? 0) + 1;
    await req.user.save();
  }
  clearAuthCookies(res);
  return sendSuccess(res, null, "Logged out successfully");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, publicUser(req.user), "Current user retrieved");
});
