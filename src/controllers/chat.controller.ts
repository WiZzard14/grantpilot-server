import type { Request, Response } from "express";
import { Conversation } from "../models/Conversation.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { respondToConversation } from "../services/agents/chat.agent.js";

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await Conversation.create({
    userId: req.user!._id,
    title: req.body.title || "Scholarship planning conversation",
    messages: []
  });
  return sendSuccess(res, conversation, "Conversation created", 201);
});

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const conversations = await Conversation.find({ userId: req.user!._id }).sort({ updatedAt: -1 }).select("title updatedAt createdAt messages").lean();
  return sendSuccess(res, conversations, "Conversations retrieved");
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
  if (!conversation) throw new AppError("Conversation not found", 404);
  return sendSuccess(res, conversation, "Conversation retrieved");
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await respondToConversation(req.user!._id, String(req.params.id), req.body.message);
  return sendSuccess(res, result, "Assistant response generated");
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  await Conversation.deleteOne({ _id: req.params.id, userId: req.user!._id });
  return sendSuccess(res, null, "Conversation deleted");
});
