const GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-2.5-flash-lite": "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite-preview": "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite-preview-09-2025": "gemini-3.1-flash-lite",
  "gemini-2.0-flash-lite": "gemini-3.1-flash-lite",
  "gemini-2.0-flash-lite-001": "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite"
};

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

export function resolveGeminiModel(configuredModel?: string) {
  const normalized = configuredModel?.trim() || DEFAULT_GEMINI_MODEL;
  return GEMINI_MODEL_ALIASES[normalized] ?? normalized;
}
