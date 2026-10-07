import assert from "node:assert/strict";
import test from "node:test";
import { readBcp14Requirements } from "../scripts/read-bcp-14-requirements.mjs";

test("a sentence with exactly one key word yields one requirement", () => {
  const reading = readBcp14Requirements({
    text: "A work record MUST carry its modality as the pair of closures that settle it.",
  });
  assert.deepEqual(reading.requirements, [
    {
      type: "Bcp14Requirement",
      version: 1,
      force: "MUST",
      subject: "A work record",
      predicate: "carry",
      object: "its modality as the pair of closures that settle it",
      text: "A work record MUST carry its modality as the pair of closures that settle it",
      line: 1,
    },
  ]);
  assert.deepEqual(reading.refusals, []);
});

test("splits at a semicolon into two sentences, each with its own key word", () => {
  const reading = readBcp14Requirements({ text: "Systems SHOULD NOT hold state; they MAY cache." });
  assert.equal(reading.requirements.length, 2);
  assert.equal(reading.requirements[0].force, "SHOULD NOT");
  assert.equal(reading.requirements[0].object, "state");
  assert.equal(reading.requirements[1].force, "MAY");
  assert.equal(reading.requirements[1].object, "");
  assert.deepEqual(reading.refusals, []);
});

test("a sentence with no key word yields nothing", () => {
  const reading = readBcp14Requirements({ text: "Documentation exists for onboarding." });
  assert.deepEqual(reading.requirements, []);
  assert.deepEqual(reading.refusals, []);
});

test("a key word as the sentence's last token is refused with no-predicate", () => {
  const reading = readBcp14Requirements({ text: "Retries are OPTIONAL" });
  assert.deepEqual(reading.requirements, []);
  assert.deepEqual(reading.refusals, [{ line: 1, text: "Retries are OPTIONAL", reason: "no-predicate" }]);
});

test("a lowercase form of a key word is never matched (RFC 8174)", () => {
  const reading = readBcp14Requirements({ text: "You must not skip this step." });
  assert.deepEqual(reading.requirements, []);
  assert.deepEqual(reading.refusals, []);
});

test("a sentence with more than one key word is refused", () => {
  const reading = readBcp14Requirements({ text: "Clients MUST validate input and SHOULD log errors." });
  assert.deepEqual(reading.requirements, []);
  assert.deepEqual(reading.refusals, [
    { line: 1, text: "Clients MUST validate input and SHOULD log errors", reason: "more-than-one-key-word" },
  ]);
});

test("trailing punctuation is stripped from the predicate", () => {
  const reading = readBcp14Requirements({ text: "Clients MUST retry!" });
  assert.equal(reading.requirements[0].predicate, "retry");
  assert.equal(reading.requirements[0].object, "");
});

test("a two-word force is matched before its one-word prefix, and lines are tracked across line breaks", () => {
  const text = [
    "The gateway SHALL forward requests to the upstream service.",
    "The gateway SHALL NOT retry a request more than three times.",
    "A password MUST NOT be logged in plaintext.",
  ].join("\n");
  const reading = readBcp14Requirements({ text });
  assert.deepEqual(
    reading.requirements.map((r) => [r.line, r.force]),
    [[1, "SHALL"], [2, "SHALL NOT"], [3, "MUST NOT"]],
  );
});

test("refuses a missing text", () => assert.throws(() => readBcp14Requirements({}), /text must be a string/u));

test("a single line break inside a paragraph is whitespace, not a sentence boundary (soft-wrapped Markdown)", () => {
  const reading = readBcp14Requirements({
    text: "A record produced by the service MUST\nbe empty when no work order applies.",
  });
  assert.deepEqual(reading.requirements, [
    {
      type: "Bcp14Requirement",
      version: 1,
      force: "MUST",
      subject: "A record produced by the service",
      predicate: "be",
      object: "empty when no work order applies",
      text: "A record produced by the service MUST be empty when no work order applies",
      line: 1,
    },
  ]);
  assert.deepEqual(reading.refusals, []);
});

test("a blank line (two or more line breaks) still separates paragraphs, each with its own key word", () => {
  const reading = readBcp14Requirements({ text: "Clients MUST retry.\n\nServers SHOULD log the outcome." });
  assert.deepEqual(
    reading.requirements.map((r) => [r.line, r.force]),
    [[1, "MUST"], [3, "SHOULD"]],
  );
});
