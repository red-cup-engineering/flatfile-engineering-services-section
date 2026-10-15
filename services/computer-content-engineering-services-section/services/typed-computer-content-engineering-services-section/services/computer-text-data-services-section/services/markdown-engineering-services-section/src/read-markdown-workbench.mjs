import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { applyMarkdownEdit, markdownEditRequestKind } from "./apply-markdown-edit.mjs";
import { readMarkdownDocument } from "./read-markdown-document.mjs";
import { readMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { renderMarkdownBlockHtml } from "./render-markdown-block-html.mjs";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";
import { validateMarkdownDocument } from "./validate-markdown-document.mjs";

export const markdownWorkbenchKind = "red-cup-engineering.markdown.workbench";

/** The edit operations applyMarkdownEdit admits, offered with every workbench readout. */
export const MARKDOWN_WORKBENCH_EDIT_OPERATIONS = Object.freeze([
  "set-document", "set-frontmatter", "merge-frontmatter", "delete-frontmatter", "rename-frontmatter",
  "set-body", "prepend-body", "append-body", "replace-text", "replace-pattern",
  "insert-lines", "replace-lines", "delete-lines",
  "replace-section", "upsert-section", "delete-section",
  "normalize-body", "normalize-repo-markdown",
]);

function lineCount(text) {
  if (text === "") return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function textReadout(text) {
  return Object.freeze({ text, bytes: Buffer.byteLength(text, "utf8"), lines: lineCount(text), hasFinalNewline: text.endsWith("\n") });
}

function candidate(original, text) {
  return Object.freeze({ changed: text !== original, text, bytes: Buffer.byteLength(text, "utf8") });
}

function semanticLinefeedDocument(text) {
  const fence = splitMarkdownFrontmatterFence(text);
  if (fence === null) return normalizeLinefeeds(text);
  return `${text.slice(0, fence.source.bodyStart)}${normalizeLinefeeds(fence.body)}`;
}

function fallbackDocument(text, validation, options) {
  const frontmatter = Object.freeze({ ...(validation.frontmatter ?? {}) });
  const coordinate = options.coordinate ?? "markdown";
  const subject = options.subject ?? (typeof frontmatter.slug === "string" && frontmatter.slug.trim() !== "" ? frontmatter.slug : coordinate);
  return Object.freeze({
    subject, format: validation.format, frontmatter, body: validation.body,
    structure: readMarkdownStructure(text), features: readMarkdownFeatures(validation.body), assertions: Object.freeze([]),
  });
}

/**
 * One programmatic surface for a Markdown document: its read document,
 * structure, features and assertions, its validation report, its HTML
 * projection, and the semantic-linefeed and repository normalizations it
 * would take, as one JSON-safe readout. A document whose frontmatter cannot
 * be read still yields a readout, from what validation could recover.
 */
export function readMarkdownWorkbench(text, options = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const forbidden = options.forbiddenFrontmatterKeys === undefined ? {} : { forbiddenFrontmatterKeys: options.forbiddenFrontmatterKeys };
  const validation = validateMarkdownDocument(text, forbidden);
  let document;
  try { document = readMarkdownDocument(text, options); }
  catch { document = fallbackDocument(text, validation, options); }
  const semanticText = semanticLinefeedDocument(text);
  const repoText = validation.parseable
    ? applyMarkdownEdit(text, {
      kind: markdownEditRequestKind,
      operations: [{ operation: "normalize-repo-markdown", ...(options.forbiddenFrontmatterKeys === undefined ? {} : { forbiddenKeys: options.forbiddenFrontmatterKeys }) }],
    }).text
    : semanticText;
  return Object.freeze({
    kind: markdownWorkbenchKind,
    subject: document.subject,
    format: document.format,
    source: textReadout(text),
    frontmatter: document.frontmatter,
    body: document.body,
    structure: document.structure,
    features: document.features,
    assertions: document.assertions,
    validation,
    html: renderMarkdownBlockHtml(document.body),
    normalization: Object.freeze({
      semanticLinefeedDocument: candidate(text, semanticText),
      repoMarkdownDocument: candidate(text, repoText),
    }),
    editOperations: MARKDOWN_WORKBENCH_EDIT_OPERATIONS,
  });
}
