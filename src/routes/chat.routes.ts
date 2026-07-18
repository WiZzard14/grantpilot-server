import { Router } from "express";
import { z } from "zod";
import { createConversation, deleteConversation, getConversation, listConversations, sendMessage } from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const chatRouter = Router();
chatRouter.use(authenticate);
chatRouter.get("/conversations", listConversations);
chatRouter.post("/conversations", validate(z.object({ body: z.object({ title: z.string().max(120).optional() }), query: z.any(), params: z.any() })), createConversation);
chatRouter.get("/conversations/:id", getConversation);
chatRouter.post("/conversations/:id/messages", validate(z.object({ body: z.object({ message: z.string().min(1).max(4000) }), query: z.any(), params: z.any() })), sendMessage);
chatRouter.delete("/conversations/:id", deleteConversation);
