import fs from "node:fs/promises";
import type { Request, Response } from "express";
import { Document } from "../models/Document.js";
import { AIAnalysis } from "../models/AIAnalysis.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { runDocumentAgent, type DocumentReport } from "../services/agents/document.agent.js";

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError("Choose a document to upload", 400);
  const document = await Document.create({
    userId: req.user!._id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    storagePath: req.file.path,
    size: req.file.size,
    processingStatus: "uploaded"
  });
  return sendSuccess(res, document, "Document uploaded", 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const documents = await Document.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
  const analyses = await AIAnalysis.find({ userId: req.user!._id, analysisType: "document" }).sort({ createdAt: -1 }).lean();
  const latestByDocument = new Map<string, any>();
  for (const analysis of analyses) {
    const key = String(analysis.documentId);
    if (!latestByDocument.has(key)) latestByDocument.set(key, analysis);
  }
  return sendSuccess(res, documents.map((document) => ({ ...document, latestAnalysis: latestByDocument.get(String(document._id)) })), "Documents retrieved");
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
  if (!document) throw new AppError("Document not found", 404);
  const analyses = await AIAnalysis.find({ userId: req.user!._id, documentId: document._id }).sort({ createdAt: -1 }).lean();
  return sendSuccess(res, { document, analyses }, "Document retrieved");
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  const result = await runDocumentAgent(req.user!._id, String(req.params.id), req.body.scholarshipId);
  return sendSuccess(res, result, "Document analysis completed");
});

export const downloadReport = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await AIAnalysis.findOne({ _id: req.params.analysisId, userId: req.user!._id, analysisType: "document" }).lean();
  if (!analysis) throw new AppError("Analysis report not found", 404);
  const report = analysis.structuredResult as DocumentReport;
  const lines = [
    "# GrantPilot AI Document Intelligence Report",
    "",
    `Generated: ${new Date(analysis.createdAt).toISOString()}`,
    `Document type: ${report.documentType}`,
    `Analysis engine: ${analysis.modelProvider}`,
    "",
    "## Summary",
    report.summary,
    "",
    "## Key Points",
    ...(report.keyPoints ?? []).map((item) => `- ${item}`),
    "",
    "## Strengths",
    ...(report.strengths ?? []).map((item) => `- ${item}`),
    "",
    "## Weaknesses",
    ...(report.weaknesses ?? []).map((item) => `- ${item}`),
    "",
    "## Missing Information",
    ...(report.missingInformation ?? []).map((item) => `- ${item}`),
    "",
    "## Risks",
    ...(report.risks ?? []).map((item) => `- ${item}`),
    "",
    "## Action Items",
    ...(report.actionItems ?? []).map((item) => `- [ ] ${item}`),
    "",
    `> ${report.disclaimer}`
  ];
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="grantpilot-report-${analysis._id}.md"`);
  return res.send(lines.join("\n"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!document) throw new AppError("Document not found", 404);
  await Promise.all([
    fs.unlink(document.storagePath).catch(() => undefined),
    AIAnalysis.deleteMany({ userId: req.user!._id, documentId: document._id })
  ]);
  return sendSuccess(res, null, "Document deleted");
});
