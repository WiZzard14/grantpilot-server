import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { resolveGeminiModel } from "../services/ai/gemini-model.js";

const apiKey = process.env.GEMINI_API_KEY?.trim();
const configuredModel = process.env.GEMINI_MODEL?.trim();
const model = resolveGeminiModel(configuredModel);

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing from grantpilot-server/.env");
  process.exitCode = 1;
} else {
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      contents: "Reply with exactly: GEMINI_OK",
      config: { temperature: 0 }
    });

    if (configuredModel && configuredModel !== model) {
      console.log(`Configured model ${configuredModel} was automatically replaced with ${model}.`);
    }
    console.log("Gemini API success");
    console.log("Model:", model);
    console.log("Response:", response.text?.trim());
  } catch (error) {
    const value = error as Record<string, unknown>;
    console.error("Gemini API failed", {
      status: value.status,
      code: value.code,
      message: value.message
    });
    process.exitCode = 1;
  }
}
