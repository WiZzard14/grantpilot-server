import type { Types } from "mongoose";
import { Conversation } from "../../models/Conversation.js";
import { Scholarship } from "../../models/Scholarship.js";
import { SavedScholarship } from "../../models/SavedScholarship.js";
import { StudentProfile } from "../../models/StudentProfile.js";
import { AIAnalysis } from "../../models/AIAnalysis.js";
import { AppError } from "../../utils/AppError.js";
import { generateText } from "../ai/provider.service.js";
import {
  buildLocalChatResponse,
  escapeRegExp,
  extractSearchTerms,
  isGreeting,
  makeConversationTitle,
  normalizeChatMessage,
  type SavedLike,
  type ScholarshipLike
} from "./chat-fallback.js";

export async function respondToConversation(userId: Types.ObjectId | string, conversationId: string, rawMessage: string) {
  const message = normalizeChatMessage(rawMessage);
  if (!message) throw new AppError("Message is required", 400);
  if (message.length > 4000) throw new AppError("Message must contain at most 4000 characters", 400);

  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) throw new AppError("Conversation not found", 404);

  const isFirstMessage = conversation.messages.length === 0;
  conversation.messages.push({ role: "user", content: message, createdAt: new Date() });
  if (isFirstMessage) conversation.title = makeConversationTitle(message);

  const searchTerms = isGreeting(message) ? [] : extractSearchTerms(message);
  const searchRegex = searchTerms.length > 0
    ? new RegExp(searchTerms.map(escapeRegExp).join("|"), "i")
    : null;

  const [profile, saved, nearby] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    SavedScholarship.find({ userId }).populate("scholarshipId").limit(20).lean(),
    searchRegex
      ? Scholarship.find({
          status: "published",
          deadline: { $gte: new Date() },
          $or: [
            { title: searchRegex },
            { providerName: searchRegex },
            { country: searchRegex },
            { fields: searchRegex },
            { degreeLevels: searchRegex }
          ]
        })
          .sort({ deadline: 1 })
          .limit(8)
          .lean()
      : Promise.resolve([])
  ]);

  const history = conversation.messages
    .slice(-12)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  const fallback = () => buildLocalChatResponse({
    message,
    saved: saved as unknown as SavedLike[],
    searchResults: nearby as unknown as ScholarshipLike[],
    hasProfile: Boolean(profile)
  });

  const execution = await generateText({
    system: `You are GrantPilot Assistant, a concise scholarship-planning assistant.

Rules:
- Respond naturally to greetings, thanks, and casual conversation. A greeting such as "hi" must never trigger a scholarship recommendation.
- Use only the supplied application context for user-specific claims.
- Help with navigation, scholarship search, comparisons, saved opportunities, deadlines, profile preparation, and documents.
- Do not invent scholarships, deadlines, funding, eligibility, or application requirements.
- Never guarantee eligibility, admission, funding, or selection.
- When discussing a stored deadline or requirement, remind the user that the official provider page is authoritative.
- If searchResults is empty, say that no matching stored record was found instead of mentioning an unrelated scholarship.
- Keep the answer practical and normally under 180 words.`,
    prompt: JSON.stringify({
      currentMessage: message,
      conversationHistory: history,
      memorySummary: conversation.memorySummary,
      profile,
      savedScholarships: saved,
      searchResults: nearby
    }),
    fallback
  });

  conversation.messages.push({ role: "assistant", content: execution.data, createdAt: new Date() });
  if (conversation.messages.length > 30) {
    const excessMessages = conversation.messages.length - 30;
    conversation.messages.splice(0, excessMessages);
    conversation.memorySummary = `Conversation retained with ${conversation.messages.length} recent messages. The user is working on scholarship discovery and application preparation.`;
  }
  await conversation.save();

  await AIAnalysis.create({
    userId,
    analysisType: "chat",
    structuredResult: { conversationId, answer: execution.data },
    modelProvider: execution.provider,
    promptVersion: "chat-v2.0",
    tokenUsage: execution.tokenUsage
  });

  return { answer: execution.data, conversation, provider: execution.provider };
}
