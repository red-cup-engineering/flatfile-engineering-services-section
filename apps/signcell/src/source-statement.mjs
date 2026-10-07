import { defineSchemaType } from "@red-cup-engineering/computer-data-services-section/type-system/schema-type";
import { admitTypedMark, createTypedMark } from "./typed-mark.mjs";

const sourceStatementSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/computer/source-statement.schema.json",
  title: "Source statement",
  description: "One attributed statement extracted from acquired source text; its address is evidence identity, not a truth judgment.",
  type: "object",
  required: ["sourceSubject", "sourceUrl", "sourceTitle", "text", "force", "status", "attribution", "scope"],
  additionalProperties: false,
  properties: {
    sourceSubject: { type: "string", minLength: 1 },
    sourceUrl: { type: "string", pattern: "^https?://" },
    sourceTitle: { type: "string", minLength: 1 },
    text: { type: "string", minLength: 1 },
    force: { const: "alleges" },
    status: { const: "source-supported" },
    attribution: { const: "required" },
    scope: { const: "no broader than this source assertion" },
    sourcePublished: { type: "string", minLength: 1 },
    sourceAssertedAt: { type: "string", minLength: 1 },
    evidenceDigest: { type: "string", minLength: 1 },
  },
});

export const sourceStatementType = defineSchemaType(sourceStatementSchema);
export const createSourceStatement = (content) => createTypedMark(sourceStatementType, content);
export const admitSourceStatement = (cell) => admitTypedMark(sourceStatementType, cell);


function stripMarkup(value) {
  return String(value)
    .replace(/<[^>]*>/gu, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Deterministic segmentation of acquired text. A segment is source speech, never newsroom fact. */
export function sourceAssertionSentences(value) {
  const pieces = stripMarkup(value).match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/gu) ?? [];
  const seen = new Set();
  return pieces.map((piece) => piece.trim()).filter((piece) => {
    const key = piece.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
    if (piece.length < 35 || key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

export function sourceStatementCells({ sourceSubject, sourceUrl, sourceTitle, summary, sourcePublished, sourceAssertedAt, evidenceDigest }) {
  return Object.freeze(sourceAssertionSentences(summary).map((text) => {
    const created = createSourceStatement({
      sourceSubject, sourceUrl, sourceTitle, text,
      force: "alleges", status: "source-supported", attribution: "required",
      scope: "no broader than this source assertion",
      ...(sourcePublished === undefined ? {} : { sourcePublished }),
      ...(sourceAssertedAt === undefined ? {} : { sourceAssertedAt }),
      ...(evidenceDigest === undefined ? {} : { evidenceDigest }),
    });
    if (!created.ok) throw new TypeError(created.refusal.message);
    return created.value;
  }));
}
