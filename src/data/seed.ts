import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import { StudentProfile } from "../models/StudentProfile.js";
import { Scholarship } from "../models/Scholarship.js";
import { Blog } from "../models/Blog.js";
import { env } from "../config/env.js";

const verifiedAt = new Date("2026-07-17T00:00:00.000Z");

const scholarships = [
  {
    title: "Chevening Scholarships",
    slug: "chevening-scholarships",
    shortDescription: "A UK government programme supporting one-year postgraduate study for emerging leaders from eligible countries.",
    fullDescription: "Chevening Scholarships support eligible applicants who demonstrate leadership potential, a clear career plan, and the ability to build long-term professional networks. Applicants normally choose eligible one-year taught master's programmes in the United Kingdom and complete a separate scholarship application.",
    providerName: "Chevening",
    providerImage: "/scholarships/chevening.svg",
    images: ["/scholarships/chevening.svg", "/scholarships/uk-study.svg"],
    country: "United Kingdom",
    location: "Multiple UK universities",
    degreeLevels: ["Masters"],
    fields: ["All eligible fields"],
    fundingType: "Fully Funded",
    estimatedValue: 45000,
    currency: "GBP",
    benefits: ["Tuition support", "Monthly living allowance", "Travel support", "Professional networking"],
    eligibility: ["Citizenship of a Chevening-eligible country", "Undergraduate degree", "Required work experience under the current cycle rules", "Commitment to return to the home country after study"],
    requiredDocuments: ["Passport or national ID", "Degree documents", "References", "University programme choices"],
    deadline: new Date("2026-10-07T12:00:00.000Z"),
    deadlineLabel: "Expected annual autumn deadline — verify the live cycle",
    deadlineIsEstimated: true,
    officialUrl: "https://www.chevening.org/scholarships/",
    sourceUrl: "https://www.chevening.org/scholarships/",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: true
  },
  {
    title: "Gates Cambridge Scholarship",
    slug: "gates-cambridge-scholarship",
    shortDescription: "A highly selective full-cost scholarship for postgraduate study at the University of Cambridge.",
    fullDescription: "The Gates Cambridge programme supports outstanding applicants from outside the United Kingdom who apply for an eligible full-time postgraduate course at the University of Cambridge. Selection considers academic excellence, reasons for the chosen course, commitment to improving lives, and leadership capacity.",
    providerName: "Gates Cambridge Trust",
    providerImage: "/scholarships/gates-cambridge.svg",
    images: ["/scholarships/gates-cambridge.svg", "/scholarships/research.svg"],
    country: "United Kingdom",
    location: "Cambridge",
    degreeLevels: ["Masters", "PhD"],
    fields: ["All eligible Cambridge postgraduate fields"],
    fundingType: "Fully Funded",
    estimatedValue: 60000,
    currency: "GBP",
    benefits: ["University composition fee", "Maintenance allowance", "Travel costs", "Additional discretionary funding"],
    eligibility: ["Applicant is a citizen of a country outside the UK", "Application to an eligible Cambridge postgraduate course", "Strong academic record and leadership evidence"],
    requiredDocuments: ["Cambridge admission application", "Academic transcripts", "References", "Gates Cambridge statement"],
    deadline: new Date("2026-12-02T23:59:00.000Z"),
    deadlineLabel: "Course-dependent funding deadline — verify in the Cambridge portal",
    deadlineIsEstimated: true,
    officialUrl: "https://www.gatescambridge.org/apply/how-to-apply/",
    sourceUrl: "https://www.gatescambridge.org/apply/how-to-apply/",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: true
  },
  {
    title: "Clarendon Fund Scholarships",
    slug: "clarendon-fund-scholarships",
    shortDescription: "University of Oxford graduate scholarships awarded on academic excellence and potential.",
    fullDescription: "Clarendon is a major graduate scholarship scheme at the University of Oxford. Eligible applicants are normally considered automatically when they apply for an eligible graduate course by the relevant December or January funding deadline.",
    providerName: "University of Oxford",
    providerImage: "/scholarships/clarendon.svg",
    images: ["/scholarships/clarendon.svg", "/scholarships/uk-study.svg"],
    country: "United Kingdom",
    location: "Oxford",
    degreeLevels: ["Masters", "PhD"],
    fields: ["All eligible Oxford graduate fields"],
    fundingType: "Fully Funded",
    estimatedValue: 55000,
    currency: "GBP",
    benefits: ["Course fees", "Living-cost grant", "Access to the Clarendon community"],
    eligibility: ["Application to an eligible Oxford graduate course", "Submission by the relevant course funding deadline", "Excellent academic record and potential"],
    requiredDocuments: ["Oxford graduate application", "Transcripts", "References", "Course-specific written materials"],
    deadline: new Date("2027-01-08T12:00:00.000Z"),
    deadlineLabel: "December or January course deadline — verify your course page",
    deadlineIsEstimated: true,
    officialUrl: "https://www.ox.ac.uk/clarendon/information-for-applicants",
    sourceUrl: "https://www.ox.ac.uk/clarendon/information-for-applicants",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: true
  },
  {
    title: "Erasmus Mundus Joint Masters Scholarships",
    slug: "erasmus-mundus-joint-masters-scholarships",
    shortDescription: "Joint international master's programmes delivered by consortia of European higher-education institutions.",
    fullDescription: "Erasmus Mundus Joint Masters are integrated international programmes delivered by university consortia. Individual programmes set their own academic requirements, application process, and deadlines. Competitive scholarships may cover participation costs and contribute to travel, visa, installation, and living expenses.",
    providerName: "European Commission",
    providerImage: "/scholarships/erasmus.svg",
    images: ["/scholarships/erasmus.svg", "/scholarships/europe-study.svg"],
    country: "Multiple European Countries",
    location: "Multiple partner universities",
    degreeLevels: ["Masters"],
    fields: ["Engineering", "Science", "Social Science", "Business", "Humanities", "Health"],
    fundingType: "Fully Funded",
    estimatedValue: 50000,
    currency: "EUR",
    benefits: ["Participation costs", "Travel contribution", "Visa and installation contribution", "Living allowance"],
    eligibility: ["Bachelor's degree or recognised equivalent", "Programme-specific academic and language requirements", "Application directly to the selected consortium"],
    requiredDocuments: ["Degree certificate", "Transcript", "CV", "Motivation letter", "Language evidence", "References where requested"],
    deadline: new Date("2027-01-15T23:59:00.000Z"),
    deadlineLabel: "Programme-specific, commonly October–January",
    deadlineIsEstimated: true,
    officialUrl: "https://education.ec.europa.eu/study-in-europe/opportunities/erasmus-mundus-joint-masters-scholarships",
    sourceUrl: "https://education.ec.europa.eu/study-in-europe/opportunities/erasmus-mundus-joint-masters-scholarships",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: true
  },
  {
    title: "DAAD EPOS Scholarships",
    slug: "daad-epos-scholarships",
    shortDescription: "Development-related postgraduate scholarships for professionals from eligible developing countries.",
    fullDescription: "DAAD's Development-Related Postgraduate Courses programme supports selected postgraduate courses in Germany. Applicants generally need a relevant academic degree, professional experience, and a development-focused motivation. Requirements and deadlines differ by course.",
    providerName: "German Academic Exchange Service (DAAD)",
    providerImage: "/scholarships/daad.svg",
    images: ["/scholarships/daad.svg", "/scholarships/research.svg"],
    country: "Germany",
    location: "Participating German universities",
    degreeLevels: ["Masters", "PhD"],
    fields: ["Development Studies", "Engineering", "Public Policy", "Economics", "Environmental Science", "Health"],
    fundingType: "Fully Funded",
    estimatedValue: 30000,
    currency: "EUR",
    benefits: ["Monthly scholarship payment", "Insurance contribution", "Travel allowance where applicable", "Possible study and research allowance"],
    eligibility: ["Applicant from an eligible developing or newly industrialised country", "Relevant academic degree", "Relevant professional experience", "Course-specific language requirements"],
    requiredDocuments: ["DAAD application form", "CV", "Motivation letter", "Employment certificates", "Degree documents", "Language certificate"],
    deadline: new Date("2026-10-01T23:59:00.000Z"),
    deadlineLabel: "Course-specific deadlines — consult the current EPOS list",
    deadlineIsEstimated: true,
    officialUrl: "https://www.daad.de/en/studying-in-germany/scholarships/daad-funding-programmes/epos/",
    sourceUrl: "https://www.daad.de/en/studying-in-germany/scholarships/daad-funding-programmes/epos/",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: false
  },
  {
    title: "Fulbright Foreign Student Program",
    slug: "fulbright-foreign-student-program",
    shortDescription: "Country-administered opportunities for graduate study and research in the United States.",
    fullDescription: "The Fulbright Foreign Student Program enables graduate students, young professionals, and artists from participating countries to study or conduct research in the United States. Application rules, fields, and deadlines are managed by national Fulbright commissions or US embassies.",
    providerName: "Fulbright Program",
    providerImage: "/scholarships/fulbright.svg",
    images: ["/scholarships/fulbright.svg", "/scholarships/usa-study.svg"],
    country: "United States",
    location: "Participating US institutions",
    degreeLevels: ["Masters", "PhD", "Research"],
    fields: ["Most academic fields"],
    fundingType: "Fully Funded",
    estimatedValue: 50000,
    currency: "USD",
    benefits: ["Tuition support", "Living stipend", "Health coverage", "Travel support subject to country rules"],
    eligibility: ["Citizenship and residency rules set by the applicant's country programme", "Academic preparation for the proposed study", "English-language readiness", "Country-specific selection requirements"],
    requiredDocuments: ["Online application", "Academic records", "Study or research objectives", "Personal statement", "References", "Language tests where required"],
    deadline: new Date("2027-05-15T23:59:00.000Z"),
    deadlineLabel: "Country-specific deadline — verify with the local commission or embassy",
    deadlineIsEstimated: true,
    officialUrl: "https://foreign.fulbrightonline.org/about/foreign-fulbright",
    sourceUrl: "https://foreign.fulbrightonline.org/about/foreign-fulbright",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: false
  },
  {
    title: "MEXT Research Students Scholarship",
    slug: "mext-research-students-scholarship",
    shortDescription: "Japanese government support for graduate-level research students through embassy or university recommendation routes.",
    fullDescription: "The MEXT Research Students Scholarship supports international applicants undertaking graduate-level research in Japan. Embassy recommendation and university recommendation routes have different schedules and procedures. Applicants prepare a research plan and complete academic, language, and medical requirements.",
    providerName: "Ministry of Education, Culture, Sports, Science and Technology, Japan",
    providerImage: "/scholarships/mext.svg",
    images: ["/scholarships/mext.svg", "/scholarships/research.svg"],
    country: "Japan",
    location: "Participating Japanese universities",
    degreeLevels: ["Masters", "PhD", "Research"],
    fields: ["Research fields available at Japanese graduate schools"],
    fundingType: "Fully Funded",
    estimatedValue: 30000,
    currency: "JPY",
    benefits: ["Tuition waiver", "Monthly allowance", "Airfare under programme rules", "Preparatory education where applicable"],
    eligibility: ["Nationality of a country with diplomatic relations with Japan", "Academic and age conditions in the current call", "Research plan compatible with a Japanese institution", "Medical fitness requirements"],
    requiredDocuments: ["Application form", "Field of study and research plan", "Academic transcript", "Degree certificate", "Recommendation", "Medical certificate"],
    deadline: new Date("2027-05-30T23:59:00.000Z"),
    deadlineLabel: "Embassy-specific annual deadline — verify locally",
    deadlineIsEstimated: true,
    officialUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/",
    sourceUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: false
  },
  {
    title: "Australia Awards Scholarships",
    slug: "australia-awards-scholarships",
    shortDescription: "Long-term development scholarships for citizens of participating countries to study in Australia.",
    fullDescription: "Australia Awards Scholarships provide opportunities for people from participating developing countries to undertake full-time undergraduate or postgraduate study at participating Australian institutions. Country profiles define priority sectors, eligible study levels, and local application requirements.",
    providerName: "Australian Government Department of Foreign Affairs and Trade",
    providerImage: "/scholarships/australia-awards.svg",
    images: ["/scholarships/australia-awards.svg", "/scholarships/australia-study.svg"],
    country: "Australia",
    location: "Participating Australian institutions",
    degreeLevels: ["Bachelors", "Masters"],
    fields: ["Country-priority development fields"],
    fundingType: "Fully Funded",
    estimatedValue: 60000,
    currency: "AUD",
    benefits: ["Full tuition fees", "Return air travel", "Establishment allowance", "Living expenses", "Health cover", "Academic support"],
    eligibility: ["Citizenship and residence in a participating country", "Compliance with country profile requirements", "Ability to satisfy Australian institution admission requirements", "Commitment to contribute to home-country development"],
    requiredDocuments: ["Identity and citizenship evidence", "Academic documents", "Employment evidence where required", "Development impact statements", "English-language evidence"],
    deadline: new Date("2027-04-30T23:59:00.000Z"),
    deadlineLabel: "Country-specific opening and closing dates",
    deadlineIsEstimated: true,
    officialUrl: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    sourceUrl: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    lastVerifiedAt: verifiedAt,
    status: "published",
    isFeatured: false
  }
];

const blogs = [
  {
    title: "How to Build a Scholarship Evidence Bank",
    slug: "build-scholarship-evidence-bank",
    excerpt: "Organise leadership examples, results, dates, and supporting evidence before application season begins.",
    image: "/blog/evidence-bank.svg",
    author: "GrantPilot Editorial Team",
    publishedAt: new Date("2026-07-10"),
    status: "published",
    body: "A strong scholarship application is easier to write when your achievements are already documented. Create a private evidence bank containing each project, your role, the problem, the action you took, the measurable result, and a person who can verify it. Add exact dates and numbers. Separate evidence into academic achievement, leadership, community impact, research, employment, and resilience. When an application asks for an example, select the evidence that answers that specific question instead of recycling one story everywhere."
  },
  {
    title: "A Practical SOP Review Checklist",
    slug: "practical-sop-review-checklist",
    excerpt: "Check purpose, evidence, programme fit, structure, and credibility before submitting a statement of purpose.",
    image: "/blog/sop-checklist.svg",
    author: "GrantPilot Editorial Team",
    publishedAt: new Date("2026-07-08"),
    status: "published",
    body: "An effective statement of purpose connects your past preparation, current question, selected programme, and future contribution. Confirm that every paragraph has a clear function. Replace unsupported claims with evidence. Name programme elements only when they genuinely support your plan. Remove generic praise that could apply to any university. Verify dates, course titles, faculty names, and word limits. Ask a reviewer to identify unclear transitions and claims that need proof."
  },
  {
    title: "How to Verify a Scholarship Listing",
    slug: "verify-scholarship-listing",
    excerpt: "Use official sources, current cycle documents, and deadline checks before committing time or money.",
    image: "/blog/verify-listing.svg",
    author: "GrantPilot Editorial Team",
    publishedAt: new Date("2026-07-05"),
    status: "published",
    body: "Begin with the official university, government, foundation, or programme website. Confirm that the page describes the current application cycle. Check eligibility, funding coverage, deadline time zone, required documents, and the official application portal. Treat reposted listings as discovery aids rather than final authority. Never pay an unofficial agent for a supposedly guaranteed award. Save a copy of the current call and record the date you checked it."
  }
];

export async function seedDefaults() {
  const legacyUsers = await User.collection.updateMany(
    { $or: [{ role: "user" }, { role: { $exists: false } }, { role: null }] },
    { $set: { role: "student" } }
  );
  if (legacyUsers.modifiedCount > 0) {
    console.log(`Migrated ${legacyUsers.modifiedCount} legacy user role(s) to student.`);
  }

  const passwordHash = await bcrypt.hash("DemoStudent123!", 12);
  const demo = await User.findOneAndUpdate(
    { email: "student@grantpilot.demo" },
    { name: "Demo Student", email: "student@grantpilot.demo", passwordHash, provider: "credentials", role: "student", profileCompletion: 100, isActive: true },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await User.findOneAndUpdate(
      { email: env.ADMIN_EMAIL.toLowerCase() },
      {
        name: env.ADMIN_NAME,
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash: adminPasswordHash,
        image: env.ADMIN_IMAGE,
        provider: "credentials",
        role: "admin",
        profileCompletion: 100,
        isActive: true
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
  }

  await StudentProfile.findOneAndUpdate(
    { userId: demo._id },
    {
      userId: demo._id,
      nationality: "Bangladesh",
      currentCountry: "Bangladesh",
      degreeLevel: "bachelors",
      fieldOfStudy: "Computer Science",
      gpa: 3.65,
      gpaScale: 4,
      graduationYear: 2026,
      englishTests: [{ name: "IELTS", score: 7 }],
      workExperienceYears: 1,
      preferredCountries: ["United Kingdom", "Germany", "Multiple European Countries"],
      preferredFields: ["Computer Science", "Engineering", "Data Science"],
      fundingPreference: "fully-funded"
    },
    { upsert: true, returnDocument: "after" }
  );

  for (const scholarship of scholarships) {
    await Scholarship.findOneAndUpdate({ slug: scholarship.slug }, scholarship, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  }
  for (const blog of blogs) {
    await Blog.findOneAndUpdate({ slug: blog.slug }, blog, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${scholarships.length} real programme listings, ${blogs.length} articles, the demo student, and ${env.ADMIN_EMAIL ? "the configured admin" : "no admin account"}.`);
}

async function runSeedCommand() {
  await connectDatabase();
  await seedDefaults();
  await mongoose.disconnect();
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runSeedCommand().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
}
