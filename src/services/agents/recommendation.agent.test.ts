import assert from "node:assert/strict";
import test from "node:test";
import { scoreCandidate } from "./recommendation.agent.js";

test("preferred country and field improve recommendation score", () => {
  const candidate = scoreCandidate(
    {
      country: "Finland",
      fields: ["Computer Science"],
      degreeLevels: ["Masters"],
      fundingType: "Fully Funded",
      deadline: new Date(Date.now() + 90 * 86_400_000),
      minimumGpa: 3
    },
    {
      preferredCountries: ["Finland"],
      preferredFields: ["Computer Science"],
      fieldOfStudy: "Computer Science",
      degreeLevel: "bachelors",
      fundingPreference: "fully-funded",
      gpa: 3.6,
      gpaScale: 4
    }
  );
  assert.ok(candidate.baseScore >= 90);
  assert.ok(candidate.reasons.length >= 3);
});
