import { Router } from "express";
import { getProfile, updateAvatar, updateProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { avatarSchema, profileSchema } from "../validators/profile.validators.js";

export const profileRouter = Router();
profileRouter.use(authenticate);
profileRouter.get("/", getProfile);
profileRouter.put("/", validate(profileSchema), updateProfile);
profileRouter.put("/avatar", validate(avatarSchema), updateAvatar);
