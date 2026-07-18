import { Router } from "express";
import { firebaseLogin, firebaseStatus, login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { firebaseSchema, loginSchema, registerSchema } from "../validators/auth.validators.js";

export const authRouter = Router();
authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);
authRouter.get("/firebase/status", firebaseStatus);
authRouter.post("/firebase", validate(firebaseSchema), firebaseLogin);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", authenticate, logout);
authRouter.get("/me", authenticate, me);
