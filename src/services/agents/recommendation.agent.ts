import type { Types } from "mongoose";
import { Scholarship } from "../../models/Scholarship.js";
import { StudentProfile } from "../../models/StudentProfile.js";
import { Interaction } from "../../models/Interaction.js";
import { AIAnalysis } from "../../models/AIAnalysis.js";
import { AppError } from "../../utils/AppError.js";
import { generateStructured } from "../ai/provider.service.js";

export interface RecommendationItem {
  scholarshipId: string;
  matchScore: number;
  matchReasons: string[];
  strengths: string[];
  gaps: string[];
  riskLevel: "low" | "medium" | "high";
  nextAction: string;
}

interface Candidate {
  scholarship: Record<string, any>;
  baseScore: number;
  reasons: string[];
  strengths: string[];
  gaps: string[];
}

function includesLoose(values: string[], target?: string) {
  if (!target) return false;
  const normalized = target.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase()));
}

export function scoreCandidate(
  scholarship: Record<string, any>,
  profile: Record<string, any>,
  negativeSignals = 0
): Candidate {
  let score = 35;
  const reasons: string[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (profile.preferredCountries?.includes(scholarship.country)) {
    score += 15;
    reasons.push(`Matches your preferred country: ${scholarship.country}`);
  }
  if (includesLoose(scholarship.fields ?? [], profile.fieldOfStudy) || (profile.preferredFields ?? []).some((field: string) => includesLoose(scholarship.fields ?? [], field))) {
    score += 18;
    reasons.push("Strong field-of-study alignment");
    strengths.push("Academic field matches the scholarship focus");
  } else if (profile.fieldOfStudy) {
    gaps.push("Field alignment should be checked in the official programme catalogue");
  }

  const targetLevel = profile.degreeLevel === "bachelors" ? "Masters" : profile.degreeLevel === "masters" ? "PhD" : profile.degreeLevel === "high-school" ? "Bachelors" : undefined;
  if (targetLevel && includesLoose(scholarship.degreeLevels ?? [], targetLevel)) {
    score += 14;
    reasons.push(`Supports your likely next degree level: ${targetLevel}`);
    strengths.push("Degree-level eligibility appears aligned");
  }

  const fundingMap: Record<string, string> = {
    "fully-funded": "Fully Funded",
    "tuition-waiver": "Tuition Waiver",
    partial: "Partially Funded"
  };
  if (profile.fundingPreference === "any" || fundingMap[profile.fundingPreference] === scholarship.fundingType) {
    score += 10;
    reasons.push(`Funding preference match: ${scholarship.fundingType}`);
  }

  if (scholarship.minimumGpa && profile.gpa && profile.gpaScale) {
    const normalizedGpa = (profile.gpa / profile.gpaScale) * 4;
    if (normalizedGpa >= scholarship.minimumGpa) {
      score += 8;
      strengths.push("Reported GPA meets the listed minimum");
    } else {
      score -= 20;
      gaps.push("Reported GPA may be below the listed minimum");
    }
  } else {
    gaps.push("Confirm the academic threshold with the official provider");
  }

  const daysLeft = Math.ceil((new Date(scholarship.deadline).getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) score = 0;
  else if (daysLeft < 21) gaps.push("Deadline is close; prepare documents immediately");
  else strengths.push(`${daysLeft} days remain before the stored deadline`);

  score -= negativeSignals * 8;
  return { scholarship, baseScore: Math.max(0, Math.min(98, score)), reasons, strengths, gaps };
}

export async function runRecommendationAgent(userId: Types.ObjectId | string, refinement?: string) {
  const profileDoc = await StudentProfile.findOne({ userId }).lean();
  if (!profileDoc) throw new AppError("Complete your academic profile before requesting recommendations", 422);
  const profile = profileDoc as Record<string, any>;

  const [scholarships, interactions] = await Promise.all([
    Scholarship.find({ status: "published", deadline: { $gte: new Date() } }).sort({ isFeatured: -1, deadline: 1 }).limit(100).lean(),
    Interaction.find({ userId }).sort({ createdAt: -1 }).limit(200).lean()
  ]);

  const negativeMap = new Map<string, number>();
  for (const interaction of interactions) {
    if (["dismissed", "not_interested"].includes(interaction.type)) {
      const key = String(interaction.scholarshipId);
      negativeMap.set(key, (negativeMap.get(key) ?? 0) + 1);
    }
  }

  const candidates = scholarships
    .map((scholarship) => scoreCandidate(scholarship as Record<string, any>, profile, negativeMap.get(String(scholarship._id)) ?? 0))
    .filter((candidate) => candidate.baseScore > 0)
    .sort((a, b) => b.baseScore - a.baseScore)
    .slice(0, 12);

  const fallback = (): RecommendationItem[] => candidates.slice(0, 8).map((candidate) => ({
    scholarshipId: String(candidate.scholarship._id),
    matchScore: candidate.baseScore,
    matchReasons: candidate.reasons.length ? candidate.reasons : ["Broad eligibility and funding fit"],
    strengths: candidate.strengths,
    gaps: candidate.gaps,
    riskLevel: candidate.gaps.length >= 3 ? "high" : candidate.gaps.length >= 1 ? "medium" : "low",
    nextAction: "Open the official source, confirm the current deadline, and add the required documents to your checklist."
  }));

  const execution = await generateStructured<{ recommendations: RecommendationItem[] }>({
    system: `You are GrantPilot's scholarship matching agent. Rank only the supplied candidates. Never invent eligibility. Return JSON with a recommendations array. Each item must contain scholarshipId, matchScore (0-100), matchReasons, strengths, gaps, riskLevel, and nextAction. Treat official provider pages as the final authority.`,
    prompt: JSON.stringify({ profile, refinement: refinement ?? "", candidates: candidates.map((candidate) => ({ ...candidate, scholarship: { ...candidate.scholarship, fullDescription: undefined } })) }),
    fallback: () => ({ recommendations: fallback() })
  });

  const candidateById = new Map(candidates.map((candidate) => [String(candidate.scholarship._id), candidate.scholarship]));
  const rawRecommendations = Array.isArray(execution.data.recommendations) && execution.data.recommendations.length
    ? execution.data.recommendations
    : fallback();
  const recommendations = rawRecommendations
    .filter((item) => item && candidateById.has(String(item.scholarshipId)))
    .slice(0, 8)
    .map((item) => {
      const scholarshipId = String(item.scholarshipId);
      const riskLevel = ["low", "medium", "high"].includes(String(item.riskLevel)) ? item.riskLevel : "medium";
      return {
        scholarshipId,
        matchScore: Math.max(0, Math.min(100, Number(item.matchScore) || 0)),
        matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons.map(String).slice(0, 10) : [],
        strengths: Array.isArray(item.strengths) ? item.strengths.map(String).slice(0, 10) : [],
        gaps: Array.isArray(item.gaps) ? item.gaps.map(String).slice(0, 10) : [],
        riskLevel,
        nextAction: typeof item.nextAction === "string" && item.nextAction.trim() ? item.nextAction.trim() : "Verify the official source and prepare the listed documents.",
        scholarship: candidateById.get(scholarshipId)
      };
    });

  await AIAnalysis.create({
    userId,
    analysisType: "recommendation",
    structuredResult: { recommendations, refinement: refinement ?? "" },
    modelProvider: execution.provider,
    promptVersion: "recommendation-v1.0",
    tokenUsage: execution.tokenUsage
  });

  return { recommendations, provider: execution.provider };
}
