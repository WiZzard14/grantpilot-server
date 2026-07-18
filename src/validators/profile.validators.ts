import { z } from "zod";

export const profileSchema = z.object({
  body: z.object({
    nationality: z.string().max(100).optional(),
    currentCountry: z.string().max(100).optional(),
    degreeLevel: z.enum(["high-school", "bachelors", "masters", "phd", "other"]).optional(),
    fieldOfStudy: z.string().max(150).optional(),
    gpa: z.coerce.number().min(0).max(10).optional(),
    gpaScale: z.coerce.number().min(1).max(10).default(4),
    graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
    englishTests: z.array(z.object({ name: z.enum(["IELTS", "TOEFL", "PTE", "Duolingo", "Other"]), score: z.number(), takenAt: z.coerce.date().optional() })).default([]),
    workExperienceYears: z.coerce.number().min(0).max(60).default(0),
    preferredCountries: z.array(z.string()).max(20).default([]),
    preferredFields: z.array(z.string()).max(20).default([]),
    fundingPreference: z.enum(["fully-funded", "tuition-waiver", "partial", "any"]).default("any"),
    notes: z.string().max(1000).optional()
  }),
  query: z.any(),
  params: z.any()
});

export const avatarSchema = z.object({
  body: z
    .object({
      image: z.string().url("Profile photo must be a valid URL").max(2048).optional(),
      useGoogle: z.boolean().optional(),
      remove: z.boolean().optional()
    })
    .refine((body) => Boolean(body.image || body.useGoogle || body.remove), {
      message: "Choose an image, Google photo, or remove action"
    }),
  query: z.any(),
  params: z.any()
});
