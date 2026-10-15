import { mutateMarkdownFrontmatter } from "./mutate-markdown-frontmatter.mjs";
import { normalizeMarkdownDocument } from "./normalize-markdown-document.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { replaceMarkdownLines } from "./replace-markdown-lines.mjs";
import { replaceMarkdownSection } from "./replace-markdown-section.mjs";
import { replaceMarkdownText } from "./replace-markdown-text.mjs";
import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { encodeToml } from "@red-cup-engineering/toml-file-codec-service";
import { encodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";

export const markdownEditRequestKind = "red-cup-engineering.markdown.edit-request";
export const markdownEditReceiptKind = "red-cup-engineering.markdown.edit-receipt";

function assemble(frontmatter, body, format = "yaml", semanticLineBreaks = true) { const next = semanticLineBreaks ? normalizeLinefeeds(body) : body; if (frontmatter === null || Object.keys(frontmatter).length === 0) return next; return format === "toml" ? `+++\n${encodeToml(frontmatter)}+++\n${next}` : `---\n${encodeYaml(frontmatter)}---\n${next}`; }
function parsed(text) { const value = readMarkdownFrontmatter(text); return { frontmatter: value.frontmatter, body: value.body, format: value.format ?? "yaml" }; }
function bodyEdit(text, body, semanticLineBreaks) { const current = parsed(text); return assemble(current.frontmatter, body, current.format, semanticLineBreaks); }

function applyOne(text, operation) {
  if (operation === null || typeof operation !== "object" || typeof operation.operation !== "string") throw new TypeError("each edit operation must have an operation name");
  switch (operation.operation) {
    case "set-document": return assemble(operation.frontmatter ?? null, operation.body, operation.format ?? "yaml", operation.semanticLineBreaks !== false);
    case "set-frontmatter": return mutateMarkdownFrontmatter(text, { mode: "set", frontmatter: operation.frontmatter, format: operation.format });
    case "merge-frontmatter": return mutateMarkdownFrontmatter(text, { mode: "merge", patch: operation.patch, format: operation.format });
    case "delete-frontmatter": return mutateMarkdownFrontmatter(text, { mode: "delete", keys: operation.keys });
    case "rename-frontmatter": return mutateMarkdownFrontmatter(text, { mode: "rename", from: operation.from, to: operation.to, overwrite: operation.overwrite, format: operation.format });
    case "set-body": return bodyEdit(text, operation.body, operation.semanticLineBreaks !== false);
    case "prepend-body": { const current = parsed(text), separator = operation.separator ?? (current.body === "" || operation.text.endsWith("\n") ? "" : "\n"); return assemble(current.frontmatter, `${operation.text}${separator}${current.body}`, current.format); }
    case "append-body": { const current = parsed(text), separator = operation.separator ?? (current.body === "" || current.body.endsWith("\n") ? "" : "\n"); return assemble(current.frontmatter, `${current.body}${separator}${operation.text}`, current.format); }
    case "replace-text": return replaceMarkdownText(text, operation);
    case "replace-pattern": return replaceMarkdownText(text, operation);
    case "insert-lines": return replaceMarkdownLines(text, { startLine: operation.atLine, replacement: operation.text, insert: true });
    case "replace-lines": return replaceMarkdownLines(text, { startLine: operation.startLine, endLine: operation.endLine, replacement: operation.text });
    case "delete-lines": return replaceMarkdownLines(text, { startLine: operation.startLine, endLine: operation.endLine, replacement: "" });
    case "replace-section": { const current = parsed(text); return assemble(current.frontmatter, replaceMarkdownSection(current.body, { heading: operation.heading, level: operation.level, content: operation.body, mode: "replace", required: operation.required === true }), current.format); }
    case "upsert-section": { const current = parsed(text); return assemble(current.frontmatter, replaceMarkdownSection(current.body, { heading: operation.heading, level: operation.level, content: operation.body, mode: "upsert" }), current.format); }
    case "delete-section": { const current = parsed(text); return assemble(current.frontmatter, replaceMarkdownSection(current.body, { heading: operation.heading, level: operation.level, mode: "delete", required: operation.required === true }), current.format); }
    case "normalize-body": { if (operation.mode !== "semantic-line-breaks") throw new TypeError("unsupported body normalization"); const current = parsed(text); return assemble(current.frontmatter, current.body, current.format); }
    case "normalize-repo-markdown": return normalizeMarkdownDocument(text, { forbiddenFrontmatterKeys: operation.forbiddenKeys });
    default: throw new TypeError(`unsupported Markdown edit operation ${operation.operation}`);
  }
}

/** Apply a typed sequence of atomic Markdown transformations and report its receipt. */
export function applyMarkdownEdit(text, request) {
  if (typeof text !== "string" || request?.kind !== markdownEditRequestKind || !Array.isArray(request.operations)) throw new TypeError("text and a Markdown edit request are required");
  let next = text; for (const operation of request.operations) next = applyOne(next, operation);
  return Object.freeze({ text: next, receipt: Object.freeze({ kind: markdownEditReceiptKind, operations: request.operations.length, changed: next !== text, beforeBytes: Buffer.byteLength(text), afterBytes: Buffer.byteLength(next), frontmatterFormat: readMarkdownFrontmatter(next).format }) });
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string");
function isOperation(value) {
  if (!isRecord(value) || typeof value.operation !== "string") return false;
  switch (value.operation) {
    case "set-document": return typeof value.body === "string" && (value.frontmatter === undefined || value.frontmatter === null || isRecord(value.frontmatter));
    case "set-frontmatter": return isRecord(value.frontmatter);
    case "merge-frontmatter": return isRecord(value.patch);
    case "delete-frontmatter": return isStringArray(value.keys);
    case "rename-frontmatter": return typeof value.from === "string" && typeof value.to === "string";
    case "set-body": return typeof value.body === "string";
    case "prepend-body": case "append-body": return typeof value.text === "string";
    case "replace-text": return typeof value.search === "string" && typeof value.replacement === "string";
    case "replace-pattern": return typeof value.pattern === "string" && typeof value.replacement === "string";
    case "insert-lines": return Number.isInteger(value.atLine) && typeof value.text === "string";
    case "replace-lines": case "delete-lines": return Number.isInteger(value.startLine) && Number.isInteger(value.endLine);
    case "replace-section": case "upsert-section": return typeof value.heading === "string" && typeof value.body === "string";
    case "delete-section": return typeof value.heading === "string";
    case "normalize-body": return value.mode === "semantic-line-breaks";
    case "normalize-repo-markdown": return value.forbiddenKeys === undefined || isStringArray(value.forbiddenKeys);
    default: return false;
  }
}

/** Whether a value is an admissible Markdown edit request: its kind, and every operation well-formed. */
export function isMarkdownEditRequest(value) {
  return isRecord(value)
    && value.kind === markdownEditRequestKind
    && Array.isArray(value.operations)
    && value.operations.every(isOperation)
    && (value.initialText === undefined || typeof value.initialText === "string");
}
