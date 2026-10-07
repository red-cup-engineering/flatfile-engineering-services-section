
const KEY_WORD_PATTERN = /\b(MUST NOT|SHALL NOT|SHOULD NOT|NOT RECOMMENDED|MUST|SHALL|SHOULD|RECOMMENDED|REQUIRED|MAY|OPTIONAL)\b/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]"']+$/;
const SENTENCE_DELIMITER = /[.;?!]/;
const PARAGRAPH_SEPARATOR = /\n{2,}/g;

function splitParagraphs(text) {
  const paragraphs = [];
  let searchFrom = 0;
  let match;
  PARAGRAPH_SEPARATOR.lastIndex = 0;
  while ((match = PARAGRAPH_SEPARATOR.exec(text)) !== null) {
    paragraphs.push({ start: searchFrom, text: text.slice(searchFrom, match.index) });
    searchFrom = match.index + match[0].length;
  }
  paragraphs.push({ start: searchFrom, text: text.slice(searchFrom) });
  return paragraphs;
}

function lineOfOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (text[i] === "\n") line += 1;
  return line;
}

function splitSentences(text) {
  const sentences = [];
  for (const paragraph of splitParagraphs(text)) {
    // a single line break inside a paragraph is whitespace, never a sentence boundary
    const normalized = paragraph.text.replace(/\n/g, " ");
    let segStart = 0;
    for (let i = 0; i <= normalized.length; i += 1) {
      const atEnd = i === normalized.length;
      const ch = atEnd ? "" : normalized[i];
      const isBoundary =
        atEnd || (SENTENCE_DELIMITER.test(ch) && (i + 1 === normalized.length || /\s/.test(normalized[i + 1])));
      if (!isBoundary) continue;
      const raw = normalized.slice(segStart, i);
      const leadingWhitespace = raw.length - raw.trimStart().length;
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        const offset = paragraph.start + segStart + leadingWhitespace;
        sentences.push({ text: trimmed, line: lineOfOffset(text, offset) });
      }
      segStart = i + 1;
    }
  }
  return sentences;
}

function findKeyWordMatches(sentenceText) {
  const matches = [];
  KEY_WORD_PATTERN.lastIndex = 0;
  let match;
  while ((match = KEY_WORD_PATTERN.exec(sentenceText)) !== null) {
    matches.push({ force: match[0], index: match.index, end: match.index + match[0].length });
  }
  return matches;
}

function parseSentence(sentence) {
  const matches = findKeyWordMatches(sentence.text);
  if (matches.length === 0) return { kind: "none" };
  if (matches.length > 1) return { kind: "refusal", reason: "more-than-one-key-word" };
  const [match] = matches;
  const subject = sentence.text.slice(0, match.index).trim();
  const remainder = sentence.text.slice(match.end);
  const predicateSearch = /^\s*(\S+)/.exec(remainder);
  if (predicateSearch === null) return { kind: "refusal", reason: "no-predicate" };
  const predicate = predicateSearch[1].replace(TRAILING_PUNCTUATION, "");
  if (predicate.length === 0) return { kind: "refusal", reason: "no-predicate" };
  const object = remainder.slice(predicateSearch[0].length).trim();
  return { kind: "requirement", force: match.force, subject, predicate, object };
}

/**
 * Reads free text into a Bcp14RequirementSet: every sentence carrying exactly one RFC 2119 / RFC 8174 key word (in capitals) becomes a subject/predicate/object requirement record, a sentence with no key word contributes nothing, and a sentence with more than one key word or a key word with no following predicate is reported as a refusal with its line, text, and reason.
 * @param {object} request A record with `text` (the source text to read).
 * @returns {object} A Bcp14RequirementSet record: type, version, requirements (Bcp14Requirement[]), refusals ({line, text, reason}[]).
 * @throws {TypeError} When `text` is not a string.
 */
export function readBcp14Requirements(request) {
  if (typeof request?.text !== "string") throw new TypeError("text must be a string");
  const sentences = splitSentences(request.text);
  const requirements = [];
  const refusals = [];
  for (const sentence of sentences) {
    const parsed = parseSentence(sentence);
    if (parsed.kind === "none") continue;
    if (parsed.kind === "refusal") {
      refusals.push({ line: sentence.line, text: sentence.text, reason: parsed.reason });
      continue;
    }
    requirements.push({
      type: "Bcp14Requirement",
      version: 1,
      force: parsed.force,
      subject: parsed.subject,
      predicate: parsed.predicate,
      object: parsed.object,
      text: sentence.text,
      line: sentence.line,
    });
  }
  return { type: "Bcp14RequirementSet", version: 1, requirements, refusals };
}

export const operation = Object.freeze({ name: "read-bcp-14-requirements", description: "Reads free text into a Bcp14RequirementSet: every sentence carrying exactly one RFC 2119 / RFC 8174 key word (in capitals) becomes a subject/predicate/object requirement record, a sentence with no key word contributes nothing, and a sentence with more than one key word or a key word with no following predicate is reported as a refusal with its line, text, and reason.", operation: readBcp14Requirements });
