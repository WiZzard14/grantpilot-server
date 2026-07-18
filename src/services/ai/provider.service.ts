import fs from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import { env } from "../../config/env.js";
import { safeJsonParse } from "../../utils/text.js";
import { resolveGeminiModel } from "./gemini-model.js";

export type AIProvider = "gemini" | "openai" | "local-fallback";

export interface AIExecution<T> {
  data: T;
  provider: AIProvider;
  tokenUsage: number;
}

const geminiClient = env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  : null;

const openAIClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const activeGeminiModel = resolveGeminiModel(env.GEMINI_MODEL);
if (env.GEMINI_API_KEY && activeGeminiModel !== env.GEMINI_MODEL) {
  console.warn(`Gemini model ${env.GEMINI_MODEL} is unavailable or retired; using ${activeGeminiModel}.`);
}

function providerOrder(): Array<Exclude<AIProvider, "local-fallback">> {
  if (env.AI_PROVIDER === "local") return [];
  if (env.AI_PROVIDER === "gemini") return geminiClient ? ["gemini"] : [];
  if (env.AI_PROVIDER === "openai") return openAIClient ? ["openai"] : [];

  const providers: Array<Exclude<AIProvider, "local-fallback">> = [];
  if (geminiClient) providers.push("gemini");
  if (openAIClient) providers.push("openai");
  return providers;
}

function conciseError(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return {
      status: value.status,
      code: value.code,
      message: value.message
    };
  }
  return { message: String(error) };
}

async function runGeminiStructured<T>(options: {
  system: string;
  prompt: string;
  image?: { path: string; mimeType: string };
}): Promise<AIExecution<T>> {
  if (!geminiClient) throw new Error("Gemini is not configured");

  const parts: Array<Record<string, unknown>> = [{ text: options.prompt }];
  if (options.image) {
    const data = await fs.readFile(options.image.path, "base64");
    parts.push({ inlineData: { mimeType: options.image.mimeType, data } });
  }

  const response = await geminiClient.models.generateContent({
    model: activeGeminiModel,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: options.system,
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  });

  const raw = response.text ?? "{}";
  const parsed = safeJsonParse<T>(raw);
  if (!parsed) throw new Error("Gemini returned invalid JSON");

  return {
    data: parsed,
    provider: "gemini",
    tokenUsage: response.usageMetadata?.totalTokenCount ?? 0
  };
}

async function runOpenAIStructured<T>(options: {
  system: string;
  prompt: string;
  image?: { path: string; mimeType: string };
}): Promise<AIExecution<T>> {
  if (!openAIClient) throw new Error("OpenAI is not configured");

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: options.prompt }
  ];

  if (options.image) {
    const base64 = await fs.readFile(options.image.path, "base64");
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${options.image.mimeType};base64,${base64}`,
        detail: "auto"
      }
    });
  }

  const response = await openAIClient.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: userContent as never }
    ]
  });

  const raw = response.choices[0]?.message.content ?? "{}";
  const parsed = safeJsonParse<T>(raw);
  if (!parsed) throw new Error("OpenAI returned invalid JSON");

  return {
    data: parsed,
    provider: "openai",
    tokenUsage: response.usage?.total_tokens ?? 0
  };
}

async function runGeminiText(options: {
  system: string;
  prompt: string;
}): Promise<AIExecution<string>> {
  if (!geminiClient) throw new Error("Gemini is not configured");

  const response = await geminiClient.models.generateContent({
    model: activeGeminiModel,
    contents: options.prompt,
    config: {
      systemInstruction: options.system,
      temperature: 0.3
    }
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");

  return {
    data: text,
    provider: "gemini",
    tokenUsage: response.usageMetadata?.totalTokenCount ?? 0
  };
}

async function runOpenAIText(options: {
  system: string;
  prompt: string;
}): Promise<AIExecution<string>> {
  if (!openAIClient) throw new Error("OpenAI is not configured");

  const response = await openAIClient.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.prompt }
    ]
  });

  const text = response.choices[0]?.message.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");

  return {
    data: text,
    provider: "openai",
    tokenUsage: response.usage?.total_tokens ?? 0
  };
}

export function getAIStatus() {
  const order = providerOrder();
  const provider: AIProvider = order[0] ?? "local-fallback";
  return {
    configured: provider !== "local-fallback",
    provider,
    model:
      provider === "gemini"
        ? activeGeminiModel
        : provider === "openai"
          ? env.OPENAI_MODEL
          : "deterministic-local-engine"
  };
}

export async function generateStructured<T>(options: {
  system: string;
  prompt: string;
  fallback: () => T;
  image?: { path: string; mimeType: string };
}): Promise<AIExecution<T>> {
  for (const provider of providerOrder()) {
    try {
      return provider === "gemini"
        ? await runGeminiStructured<T>(options)
        : await runOpenAIStructured<T>(options);
    } catch (error) {
      console.error(`${provider} AI request failed`, conciseError(error));
    }
  }

  return {
    data: options.fallback(),
    provider: "local-fallback",
    tokenUsage: 0
  };
}

export async function generateText(options: {
  system: string;
  prompt: string;
  fallback: () => string;
}): Promise<AIExecution<string>> {
  for (const provider of providerOrder()) {
    try {
      return provider === "gemini"
        ? await runGeminiText(options)
        : await runOpenAIText(options);
    } catch (error) {
      console.error(`${provider} AI request failed`, conciseError(error));
    }
  }

  return {
    data: options.fallback(),
    provider: "local-fallback",
    tokenUsage: 0
  };
}
