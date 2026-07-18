import { z } from "zod";

const scholarshipBody = z.object({
  title: z.string().min(5).max(180),
  shortDescription: z.string().min(20).max(320),
  fullDescription: z.string().min(80).max(12000),
  providerName: z.string().min(2).max(150),
  providerImage: z.string().min(1).optional().default("/scholarships/custom.svg"),
  images: z.array(z.string()).max(8).default([]),
  country: z.string().min(2).max(100),
  location: z.string().max(150).default("International"),
  degreeLevels: z.array(z.string()).min(1),
  fields: z.array(z.string()).min(1),
  fundingType: z.enum(["Fully Funded", "Partially Funded", "Tuition Waiver", "Research Grant"]),
  estimatedValue: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  benefits: z.array(z.string()).default([]),
  eligibility: z.array(z.string()).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  minimumGpa: z.coerce.number().min(0).max(5).optional(),
  deadline: z.coerce.date(),
  deadlineLabel: z.string().max(100).optional(),
  deadlineIsEstimated: z.boolean().default(false),
  officialUrl: z.url(),
  sourceUrl: z.url(),
  lastVerifiedAt: z.coerce.date().default(() => new Date())
});

export const createScholarshipSchema = z.object({ body: scholarshipBody, query: z.any(), params: z.any() });

export const updateScholarshipSchema = z.object({
  body: scholarshipBody.partial(),
  query: z.any(),
  params: z.object({ id: z.string().min(12) })
});
