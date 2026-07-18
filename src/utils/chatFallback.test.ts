import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalChatResponse,
  extractSearchTerms,
  isGreeting,
  makeConversationTitle
} from "../services/agents/chat-fallback.js";

test("recognizes greetings without producing scholarship search terms", () => {
  assert.equal(isGreeting("hi"), true);
  assert.deepEqual(extractSearchTerms("hi"), []);
  assert.match(buildLocalChatResponse({ message: "hi", saved: [], searchResults: [], hasProfile: false }), /GrantPilot Assistant/);
});

test("extracts meaningful scholarship search terms", () => {
  assert.deepEqual(extractSearchTerms("Please find Chevening scholarships in the UK"), ["chevening", "uk"]);
});

test("answers nearest saved deadline deterministically", () => {
  const answer = buildLocalChatResponse({
    message: "Which saved scholarship has the nearest deadline?",
    hasProfile: true,
    searchResults: [],
    saved: [
      { scholarshipId: { title: "Later Award", deadline: "2030-12-01" } },
      { scholarshipId: { title: "Earlier Award", deadline: "2030-01-15" } }
    ]
  });
  assert.match(answer, /Earlier Award/);
});

test("creates a useful title from the first message", () => {
  assert.equal(makeConversationTitle("Compare my saved scholarships by funding and country"), "Compare my saved scholarships by funding and country");
  assert.equal(makeConversationTitle("hello"), "Welcome conversation");
});
