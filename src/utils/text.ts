export function clampText(value: string, max = 12_000) {
  return value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
