import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { clampText } from "../utils/text.js";

export async function extractDocumentText(filePath: string, mimeType: string) {
  if (mimeType === "application/pdf") {
    const result = await pdf(await fs.readFile(filePath));
    return clampText(result.text, 25_000);
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ path: filePath });
    return clampText(result.value, 25_000);
  }
  if (mimeType === "text/plain") {
    return clampText(await fs.readFile(filePath, "utf8"), 25_000);
  }
  if (mimeType.startsWith("image/")) return "";
  throw new Error(`No extractor is configured for ${path.extname(filePath)}`);
}
