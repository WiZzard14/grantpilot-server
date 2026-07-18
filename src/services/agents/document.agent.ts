import type { Types } from "mongoose";
import { Document } from "../../models/Document.js";
import { Scholarship } from "../../models/Scholarship.js";
import { StudentProfile } from "../../models/StudentProfile.js";
import { AIAnalysis } from "../../models/AIAnalysis.js";
import { AppError } from "../../utils/AppError.js";
import { extractDocumentText } from "../document.service.js";
import { generateStructured } from "../ai/provider.service.js";

export interface DocumentReport {
  documentType: "CV" | "SOP" | "Transcript" | "Recommendation Letter" | "Scholarship Notice" | "Offer Letter" | "Other";
  summary: string;
  keyPoints: string[];
  extractedFacts: Array<{ label: string; value: string }>;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  risks: string[];
  actionItems: string[];
  tables: Array<{ title: string; columns: string[]; rows: string[][] }>;
  disclaimer: string;
}

function firstMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function classifyDocument(fileName: string, text: string): DocumentReport["documentType"] {
  const lower = `${fileName} ${text.slice(0, 4000)}`.toLowerCase();
  if (/(curriculum vitae|\bcv\b|work experience|education and training|digital skills)/i.test(lower)) return "CV";
  if (/(statement of purpose|motivation letter|personal statement)/i.test(lower)) return "SOP";
  if (/(academic transcript|transcript|course code|credit hour|semester result)/i.test(lower)) return "Transcript";
  if (/(recommendation letter|letter of recommendation|to whom it may concern)/i.test(lower)) return "Recommendation Letter";
  if (/(scholarship notice|eligibility criteria|required documents|application deadline)/i.test(lower)) return "Scholarship Notice";
  if (/(offer letter|admission offer|conditional offer|unconditional offer)/i.test(lower)) return "Offer Letter";
  return "Other";
}

function buildCvFallback(fileName: string, text: string): DocumentReport {
  const clean = text.replace(/\s+/g, " ").trim();
  const email = firstMatch(clean, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const phone = firstMatch(clean, /(\+?880[\s-]?0?1\d[\d\s-]{8,}|01\d[\d\s-]{8,})/i);
  const name = firstMatch(clean, /^([A-Z][A-Z\s.'-]{3,40}?)(?=\s+(?:Date of birth|Nationality|Gender|Contact|Address))/i)
    ?? firstMatch(fileName.replace(/[_-]+/g, " "), /^(.+?)(?:\.| cv| resume| curriculum)/i)
    ?? "The candidate";
  const degree = firstMatch(clean, /(Bachelor(?:'s)? of [A-Za-z\s()]+|BSS(?:\s+in\s+[A-Za-z\s]+)?)/i);
  const university = firstMatch(clean, /([A-Z][A-Za-z&.'\s-]+ University)/i);
  const field = firstMatch(clean, /Field of study\s*[:\-]?\s*([A-Za-z][A-Za-z\s&-]{2,40})/i)
    ?? (/(sociology)/i.test(clean) ? "Sociology" : undefined);
  const hscGrade = firstMatch(clean, /Higher Secondary Certificate[\s\S]{0,180}?Final grade\s*[:\-]?\s*([0-9.]+)/i);
  const sscGrade = firstMatch(clean, /Secondary School Certificate[\s\S]{0,180}?Final grade\s*[:\-]?\s*([0-9.]+)/i);
  const research = firstMatch(clean, /research project on\s*['“\"]?([^'”\"]{3,100})/i);
  const volunteering = /(volunteering|foundation|helping poor people|charity)/i.test(clean);
  const teaching = /(teaching|coaching center|coaching centre|classroom)/i.test(clean);
  const officeSkills = /(microsoft word|microsoft office|excel|powerpoint)/i.test(clean);
  const englishEvidence = /(ielts|toefl|pte|duolingo english|english proficiency)/i.test(clean);
  const linkedIn = /linkedin\.com\//i.test(clean);
  const dobMissing = /Date of birth\s*:\s*(?:Nationality|Gender|Contact|$)/i.test(clean);
  const currentGradeMissing = Boolean(degree) && !/(cgpa|gpa|final grade)[\s:.-]*[0-9]/i.test(clean.slice(clean.toLowerCase().indexOf(String(degree).toLowerCase())));
  const jobDatesMissing = teaching && !/(teaching|coaching center|coaching centre)[\s\S]{0,120}(20\d{2}|current|present)/i.test(clean);
  const genericObjective = /(build up an acute|peerless career|best effort|excellent figure|obligatory responsibilities)/i.test(clean);
  const quantifiedImpact = /\b\d+\s*(students|people|members|participants|projects|years|months|%)/i.test(clean);

  const facts: Array<{ label: string; value: string }> = [];
  if (name) facts.push({ label: "Name", value: name.replace(/\s+/g, " ") });
  if (email) facts.push({ label: "Email", value: email });
  if (phone) facts.push({ label: "Phone", value: phone });
  if (degree) facts.push({ label: "Degree", value: degree.replace(/\s+/g, " ") });
  if (field) facts.push({ label: "Field of study", value: field.trim() });
  if (university) facts.push({ label: "Institution", value: university.replace(/\s+/g, " ") });
  if (hscGrade) facts.push({ label: "HSC grade", value: hscGrade });
  if (sscGrade) facts.push({ label: "SSC grade", value: sscGrade });
  if (research) facts.push({ label: "Research topic", value: research.trim() });

  const keyPoints = unique([
    degree && university ? `${degree.replace(/\s+/g, " ")} at ${university.replace(/\s+/g, " ")}.` : degree ? `${degree.replace(/\s+/g, " ")}.` : "",
    field ? `Academic field: ${field}.` : "",
    hscGrade ? `HSC result: ${hscGrade}.` : "",
    sscGrade ? `SSC result: ${sscGrade}.` : "",
    research ? `Academic research experience on ${research}.` : "",
    teaching ? "Teaching or coaching-centre experience is mentioned." : "",
    volunteering ? "Community service and volunteering experience are included." : "",
    officeSkills ? "Microsoft Office and common digital tools are listed." : ""
  ]).slice(0, 8);

  const strengths = unique([
    degree ? `Relevant academic foundation${field ? ` in ${field}` : ""}.` : "",
    hscGrade || sscGrade ? "Academic results are stated clearly for secondary-level qualifications." : "",
    research ? `Includes research exposure through the project on ${research}.` : "",
    teaching ? "Includes teaching experience, which can support communication and mentoring claims." : "",
    volunteering ? "Shows ongoing community involvement and volunteering." : "",
    officeSkills ? "Lists practical Microsoft Office and digital skills." : ""
  ]);

  const weaknesses = unique([
    genericObjective ? "The career objective uses generic and unnatural wording instead of a focused professional profile." : "",
    !quantifiedImpact ? "Experiences are not supported with measurable achievements, scale, or outcomes." : "",
    jobDatesMissing ? "Teaching/coaching experience does not clearly show organisation name, dates, role title, or achievements." : "",
    !englishEvidence ? "No English-language proficiency score or level is provided." : "",
    currentGradeMissing ? "The current bachelor’s degree result/CGPA is not stated." : "",
    !linkedIn ? "No LinkedIn or professional portfolio link is included." : "",
    /to learned how to work|adept on my job|information provided in above/i.test(clean) ? "Several sentences need grammar and wording correction." : ""
  ]);

  const missingInformation = unique([
    dobMissing ? "Date of birth value is blank." : "",
    currentGradeMissing ? "Current CGPA/result and expected graduation status." : "",
    !englishEvidence ? "IELTS/TOEFL/PTE/Duolingo score or a clearly stated English proficiency level." : "",
    jobDatesMissing ? "Employer/coaching-centre name, job dates, responsibilities, and quantified results." : "",
    !linkedIn ? "LinkedIn profile or other professional online presence." : "",
    !/(reference|referee)[\s\S]{0,120}(email|phone|designation)/i.test(clean) ? "Referee names, designations, organisations, and contact details, when required." : ""
  ]);

  const risks = unique([
    "Personal phone, email, and full address appear in the document; share the CV only through trusted channels.",
    genericObjective ? "Weak grammar and generic wording may reduce credibility in competitive scholarship applications." : "",
    "Automated extraction may flatten columns, icons, and visual formatting, so the original file should still be reviewed."
  ]);

  const actionItems = unique([
    "Replace the current objective with a 3–4 line profile tailored to the target scholarship or role.",
    "Rewrite each experience using action + responsibility + measurable result.",
    currentGradeMissing ? "Add current CGPA/result and expected graduation date." : "",
    !englishEvidence ? "Add verified English proficiency evidence when available." : "",
    jobDatesMissing ? "Add the coaching-centre name, role title, dates, and 2–4 achievement-focused bullet points." : "",
    "Correct grammar, spacing, section headings, and inconsistent labels.",
    "Keep sensitive personal data minimal and remove unnecessary declarations unless specifically requested."
  ]);

  const summaryParts = [
    `${name.replace(/\s+/g, " ")} presents an early-career CV${field ? ` focused on ${field}` : ""}.`,
    degree || university ? `The document highlights ${degree ? degree.replace(/\s+/g, " ") : "higher education"}${university ? ` at ${university.replace(/\s+/g, " ")}` : ""}, along with secondary-level results.` : "The document includes education, skills, and experience information.",
    `The strongest evidence comes from ${[research ? "academic research" : "", teaching ? "teaching" : "", volunteering ? "community service" : ""].filter(Boolean).join(", ") || "the listed academic background"}, while the main improvements are clearer achievements, stronger English, complete dates, and scholarship-focused presentation.`
  ];

  return {
    documentType: "CV",
    summary: summaryParts.join(" "),
    keyPoints,
    extractedFacts: facts,
    strengths,
    weaknesses,
    missingInformation,
    risks,
    actionItems,
    tables: facts.length ? [{ title: "Extracted CV facts", columns: ["Field", "Value"], rows: facts.map((item) => [item.label, item.value]) }] : [],
    disclaimer: "This analysis is a preparation aid. Verify extracted facts against the original document and the official scholarship requirements."
  };
}

function localDocumentReport(fileName: string, text: string): DocumentReport {
  const documentType = classifyDocument(fileName, text);
  if (documentType === "CV") return buildCvFallback(fileName, text);

  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter((value) => value.length > 25);
  const limited = clean.length < 300;

  return {
    documentType,
    summary: sentences.slice(0, 3).join(" ") || `The file ${fileName} was uploaded, but text extraction returned limited readable content.`,
    keyPoints: sentences.slice(0, 6),
    extractedFacts: [],
    strengths: limited ? [] : ["The document contains enough text for an initial structured review."],
    weaknesses: limited ? ["The extracted text is too short for a reliable analysis."] : ["The local fallback cannot fully evaluate context, visual formatting, or scholarship-specific fit."],
    missingInformation: ["Confirm names, dates, scores, and requirements against the original file."],
    risks: ["Automated extraction can miss tables, seals, signatures, columns, and visual context."],
    actionItems: ["Review the extracted text.", "Compare the document with the official scholarship requirements.", "Correct any missing or misread information."],
    tables: [],
    disclaimer: "This analysis is a preparation aid and does not determine admission or scholarship eligibility."
  };
}

export async function runDocumentAgent(userId: Types.ObjectId | string, documentId: string, scholarshipId?: string) {
  const document = await Document.findOne({ _id: documentId, userId }).select("+extractedText");
  if (!document) throw new AppError("Document not found", 404);

  try {
    document.processingStatus = "extracting";
    await document.save();
    const text = document.extractedText || await extractDocumentText(document.storagePath, document.mimeType);
    document.extractedText = text;
    document.processingStatus = "classifying";
    await document.save();

    const [profile, scholarship] = await Promise.all([
      StudentProfile.findOne({ userId }).lean(),
      scholarshipId ? Scholarship.findById(scholarshipId).lean() : null
    ]);

    document.processingStatus = "analyzing";
    await document.save();
    const fallback = () => localDocumentReport(document.originalName, text);
    const execution = await generateStructured<DocumentReport>({
      system: `You are GrantPilot's document intelligence agent. Classify and deeply analyze scholarship application documents. Return valid JSON containing documentType, summary, keyPoints, extractedFacts, strengths, weaknesses, missingInformation, risks, actionItems, tables, and disclaimer. For a CV, assess academic profile, experience, research, leadership, volunteering, language evidence, clarity, grammar, missing dates, missing results, and scholarship readiness. Make every point specific to the uploaded document. Never fabricate facts. If information is uncertain or absent, say so clearly. Do not copy large raw passages as the summary.`,
      prompt: JSON.stringify({
        fileName: document.originalName,
        mimeType: document.mimeType,
        extractedText: text || "Visual document attached. Read only what is visible.",
        studentProfile: profile,
        scholarshipRequirements: scholarship ? {
          title: scholarship.title,
          eligibility: scholarship.eligibility,
          requiredDocuments: scholarship.requiredDocuments,
          deadline: scholarship.deadline
        } : null
      }),
      image: document.mimeType.startsWith("image/") ? { path: document.storagePath, mimeType: document.mimeType } : undefined,
      fallback
    });

    const local = fallback();
    const allowedTypes = new Set(["CV", "SOP", "Transcript", "Recommendation Letter", "Scholarship Notice", "Offer Letter", "Other"]);
    const raw = execution.data as Partial<DocumentReport>;
    const report: DocumentReport = {
      documentType: allowedTypes.has(String(raw.documentType)) ? raw.documentType as DocumentReport["documentType"] : local.documentType,
      summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim() : local.summary,
      keyPoints: Array.isArray(raw.keyPoints) && raw.keyPoints.length ? raw.keyPoints.map(String).slice(0, 20) : local.keyPoints,
      extractedFacts: Array.isArray(raw.extractedFacts) ? raw.extractedFacts.filter((item: any) => item && item.label && item.value).map((item: any) => ({ label: String(item.label), value: String(item.value) })).slice(0, 30) : local.extractedFacts,
      strengths: Array.isArray(raw.strengths) && raw.strengths.length ? raw.strengths.map(String).slice(0, 20) : local.strengths,
      weaknesses: Array.isArray(raw.weaknesses) && raw.weaknesses.length ? raw.weaknesses.map(String).slice(0, 20) : local.weaknesses,
      missingInformation: Array.isArray(raw.missingInformation) && raw.missingInformation.length ? raw.missingInformation.map(String).slice(0, 20) : local.missingInformation,
      risks: Array.isArray(raw.risks) && raw.risks.length ? raw.risks.map(String).slice(0, 20) : local.risks,
      actionItems: Array.isArray(raw.actionItems) && raw.actionItems.length ? raw.actionItems.map(String).slice(0, 20) : local.actionItems,
      tables: Array.isArray(raw.tables) && raw.tables.length ? raw.tables.slice(0, 10) as DocumentReport["tables"] : local.tables,
      disclaimer: typeof raw.disclaimer === "string" && raw.disclaimer.trim() ? raw.disclaimer.trim() : local.disclaimer
    };

    document.documentType = report.documentType;
    document.processingStatus = "completed";
    document.errorMessage = undefined;
    await document.save();

    const analysis = await AIAnalysis.create({
      userId,
      documentId: document._id,
      scholarshipId: scholarshipId || undefined,
      analysisType: "document",
      structuredResult: report,
      modelProvider: execution.provider,
      promptVersion: "document-v1.1",
      tokenUsage: execution.tokenUsage
    });
    return { analysis, report, provider: execution.provider };
  } catch (error) {
    document.processingStatus = "failed";
    document.errorMessage = error instanceof Error ? error.message : "Analysis failed";
    await document.save();
    throw error;
  }
}
