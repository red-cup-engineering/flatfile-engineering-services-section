import { projectMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";

const LINK_TYPES = new Set(["markdown-link", "wikilink", "transclusion"]);

function normalizedCoordinates(text) {
  let normalized = "";
  const originalBoundary = [0];
  for (let index = 0; index < text.length;) {
    if (text[index] === "\r") {
      index += text[index + 1] === "\n" ? 2 : 1;
      normalized += "\n";
    } else {
      normalized += text[index];
      index += 1;
    }
    originalBoundary.push(index);
  }
  return { normalized, originalBoundary };
}

/** A wikilink's target sits after its `[[` (`![[` for a transclusion) and leading blanks. */
function wikilinkTargetSpan(feature) {
  const start = feature.span.start + (feature.type === "transclusion" ? 3 : 2) + (feature.targetRaw.length - feature.targetRaw.trimStart().length);
  return { start, end: start + feature.target.length };
}

function targetSpan(feature, normalized, originalBoundary) {
  const { start: normalizedStart, end: normalizedEnd } = feature.targetSpan ?? wikilinkTargetSpan(feature);
  if (normalized.slice(normalizedStart, normalizedEnd) !== feature.target) {
    throw new Error("canonical Markdown link target disagrees with its source span");
  }
  return Object.freeze({
    start: originalBoundary[normalizedStart],
    end: originalBoundary[normalizedEnd],
    text: feature.target,
  });
}

/**
 * Replace exact semantic link targets -- Markdown links, and wikilinks and transclusions (the part
 * before any `|label`) -- while preserving all other source bytes.
 */
export function replaceMarkdownLinkTarget(text, { target, replacement, all = true, required = false } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof target !== "string" || target === "") throw new TypeError("target must be a non-empty string");
  if (typeof replacement !== "string") throw new TypeError("replacement must be a string");
  if (typeof all !== "boolean" || typeof required !== "boolean") throw new TypeError("all and required must be booleans");

  const { normalized, originalBoundary } = normalizedCoordinates(text);
  let features = projectMarkdownFeatures(readMarkdownSource(normalized))
    .filter((feature) => LINK_TYPES.has(feature.type) && feature.target === target);
  if (!all) features = features.slice(0, 1);
  if (features.length === 0) {
    if (required) throw new TypeError(`link target ${JSON.stringify(target)} not found`);
    return Object.freeze({ text, count: 0, edits: Object.freeze([]) });
  }

  const edits = features.map((feature) => Object.freeze({
    span: targetSpan(feature, normalized, originalBoundary),
    replacement,
  }));
  let next = text;
  for (const edit of [...edits].reverse()) {
    next = `${next.slice(0, edit.span.start)}${replacement}${next.slice(edit.span.end)}`;
  }
  return Object.freeze({ text: next, count: edits.length, edits: Object.freeze(edits) });
}
