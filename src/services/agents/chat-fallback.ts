const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|yo)(\s+(there|grantpilot|assistant))?[!.?\s]*$/i,
  /^(good\s+(morning|afternoon|evening))[!.?\s]*$/i,
  /^(assalamu\s*alaikum|salam|as-salamu\s*alaykum)[!.?\s]*$/i,
  /^(হাই|হ্যালো|হেলো|সালাম|আসসালামু\s*আলাইকুম)[!.?\s]*$/i
];

const THANKS_PATTERNS = [
  /^(thanks|thank you|thankyou|thx)[!.?\s]*$/i,
  /^(ধন্যবাদ|থ্যাংকস)[!.?\s]*$/i
];

const HELP_PATTERNS = [
  /^(help|what can you do|how can you help)(\s+me)?[!.?\s]*$/i,
  /^(সাহায্য|তুমি কি করতে পারো|কী করতে পারো)[!.?\s]*$/i
];

const SHORT_SEARCH_TERMS = new Set(["uk", "us", "eu", "nz", "uae"]);

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "do", "does", "for", "from",
  "give", "help", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please", "show",
  "tell", "that", "the", "this", "to", "want", "what", "when", "where", "which", "who", "why", "with",
  "would", "you", "your", "scholarship", "scholarships", "grant", "grants", "find", "search", "about",
  "hi", "hello", "hey", "thanks", "thank", "there"
]);

export type ScholarshipLike = {
  _id?: unknown;
  title?: string;
  country?: string;
  fundingType?: string;
  deadline?: Date | string;
  officialUrl?: string;
};

export type SavedLike = {
  scholarshipId?: ScholarshipLike | unknown;
  status?: string;
};

export function normalizeChatMessage(message: string) {
  return message.trim().replace(/\s+/g, " ");
}

export function isGreeting(message: string) {
  const normalized = normalizeChatMessage(message);
  return GREETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isThanks(message: string) {
  const normalized = normalizeChatMessage(message);
  return THANKS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isHelpRequest(message: string) {
  const normalized = normalizeChatMessage(message);
  return HELP_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractSearchTerms(message: string) {
  const terms = normalizeChatMessage(message)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => (word.length >= 3 || SHORT_SEARCH_TERMS.has(word)) && !STOP_WORDS.has(word));

  return [...new Set(terms)].slice(0, 6);
}

export function makeConversationTitle(message: string) {
  const normalized = normalizeChatMessage(message);
  if (!normalized) return "Scholarship planning conversation";
  if (isGreeting(normalized)) return "Welcome conversation";
  const words = normalized.split(" ").slice(0, 8).join(" ");
  return words.length > 72 ? `${words.slice(0, 69)}...` : words;
}

function asScholarship(value: unknown): ScholarshipLike | null {
  if (!value || typeof value !== "object") return null;
  const scholarship = value as ScholarshipLike;
  return scholarship.title ? scholarship : null;
}

function getSavedScholarships(saved: SavedLike[]) {
  return saved
    .map((item) => asScholarship(item.scholarshipId))
    .filter((item): item is ScholarshipLike => Boolean(item));
}

function validDeadline(value: Date | string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDeadline(value: Date | string | undefined) {
  const date = validDeadline(value);
  return date ? date.toLocaleDateString("en-GB") : "not recorded";
}

export function buildLocalChatResponse(options: {
  message: string;
  saved: SavedLike[];
  searchResults: ScholarshipLike[];
  hasProfile: boolean;
}) {
  const message = normalizeChatMessage(options.message);
  const lower = message.toLowerCase();
  const savedScholarships = getSavedScholarships(options.saved);

  if (isGreeting(message)) {
    return "Hi! I’m GrantPilot Assistant. I can help you find scholarships, compare saved opportunities, check upcoming deadlines, improve your profile, and prepare application documents. What would you like to work on?";
  }

  if (isThanks(message)) {
    return "You’re welcome! Ask me anytime about scholarships, deadlines, saved opportunities, profile improvement, or application documents.";
  }

  if (isHelpRequest(message)) {
    return "I can help with five things: finding scholarships, comparing saved opportunities, checking the nearest deadline, improving your scholarship profile, and preparing documents such as a CV or SOP. Try asking: “Which saved scholarship has the nearest deadline?”";
  }

  if (/\b(bye|goodbye|see you)\b/i.test(message)) {
    return "Goodbye! Remember to verify every deadline and requirement on the official scholarship website before applying.";
  }

  if (/nearest|closest|next|upcoming/.test(lower) && /deadline|due/.test(lower)) {
    const nearest = savedScholarships
      .map((scholarship) => ({ scholarship, deadline: validDeadline(scholarship.deadline) }))
      .filter((item): item is { scholarship: ScholarshipLike; deadline: Date } => Boolean(item.deadline))
      .filter((item) => item.deadline.getTime() >= Date.now())
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

    if (!nearest) {
      return "I couldn’t find an upcoming deadline among your saved scholarships. Save an opportunity first, then ask me again. Always confirm the current deadline on the official provider page.";
    }

    return `${nearest.scholarship.title} has the nearest stored deadline: ${formatDeadline(nearest.scholarship.deadline)}. Open its details and verify the current application cycle on the official provider page.`;
  }

  if (/compare|comparison|versus|\bvs\b/.test(lower) && /saved|scholarship|opportunit/.test(lower)) {
    if (savedScholarships.length < 2) {
      return `You currently have ${savedScholarships.length} saved scholarship${savedScholarships.length === 1 ? "" : "s"}. Save at least two opportunities so I can compare their country, funding type, and deadlines.`;
    }

    const comparison = savedScholarships.slice(0, 4).map((scholarship, index) =>
      `${index + 1}. ${scholarship.title} — ${scholarship.country || "Country not recorded"}, ${scholarship.fundingType || "Funding not recorded"}, deadline ${formatDeadline(scholarship.deadline)}`
    );

    return `Here’s a quick comparison of your saved opportunities:\n${comparison.join("\n")}\nVerify funding and deadlines on each official provider page before deciding.`;
  }

  if (/profile|chance|eligible|eligibility|improve/.test(lower)) {
    if (!options.hasProfile) {
      return "Your scholarship profile is not complete yet. Add your degree level, field of study, GPA, graduation year, English-test score, work experience, and preferred countries. Then I can give more relevant recommendations.";
    }
    return "Your profile is available. To improve scholarship matching, make sure your GPA scale, graduation year, English-test score, work experience, preferred countries, and funding preference are complete and current. I can suggest matches, but the official provider decides eligibility.";
  }

  if (/\b(cv|resume|sop|statement of purpose|document|documents|transcript|recommendation letter)\b/i.test(message)) {
    return "Open the Documents page, upload your CV, SOP, transcript, or other application file, and run Document Intelligence. Review the extracted details carefully because automated analysis can miss formatting, signatures, seals, or context.";
  }

  if (/saved|bookmark/.test(lower)) {
    return `You currently have ${savedScholarships.length} saved scholarship${savedScholarships.length === 1 ? "" : "s"}. Ask me to compare them or identify the nearest stored deadline.`;
  }

  if (options.searchResults.length > 0) {
    const matches = options.searchResults.slice(0, 3).map((scholarship, index) =>
      `${index + 1}. ${scholarship.title} — ${scholarship.country || "Country not recorded"}, ${scholarship.fundingType || "Funding not recorded"}, deadline ${formatDeadline(scholarship.deadline)}`
    );
    return `I found these relevant records:\n${matches.join("\n")}\nOpen a scholarship’s details and verify the current cycle on the official provider page.`;
  }

  return `I couldn’t find a matching scholarship record for “${message}”. I can still help you search by scholarship name, provider, country, degree level, or field—for example: “Find scholarships in Germany for a master’s in computer science.”`;
}
