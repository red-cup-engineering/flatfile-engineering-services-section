import { projectMarkdownAssertions } from "./project-markdown-assertions.mjs";
import { projectMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";

/** Read source once into the document used by editing, catalogues and projections.
 * Feature coordinates are relative to the LF-normalized body; heading lines
 * remain relative to the complete source. Invalid metadata is an explicit
 * diagnostic only when requested, and never becomes prose relation evidence.
 */
export function readMarkdownDocument(text, options = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const diagnostics = [];
  let metadata;
  try { metadata = readMarkdownFrontmatter(text, options); }
  catch (error) {
    if (options.onInvalidFrontmatter !== "diagnose") throw error;
    const envelope = splitMarkdownFrontmatterFence(text);
    metadata = { format: envelope?.format ?? null, frontmatter: null, body: envelope?.body ?? text };
    diagnostics.push(Object.freeze({ kind: "invalid-frontmatter", message: error.message }));
  }
  const source = readMarkdownSource(text, { frontmatter: metadata.format !== null });
  const offset = source.bodyStartOffset;
  const bodySource = {
    text: source.text.slice(offset),
    codeRanges: source.codeRanges.map((range) => ({
      ...range, start: range.start - offset, end: range.end - offset,
      ...(range.contentStart === undefined ? {} : { contentStart: range.contentStart - offset, contentEnd: range.contentEnd - offset }),
    })),
  };
  const projected = projectMarkdownAssertions({
    frontmatter: metadata.frontmatter, body: metadata.body,
    coordinate: options.coordinate, subject: options.subject,
  });
  return Object.freeze({
    ...(options.includeSource === true ? { source } : {}),
    subject: projected.subject,
    format: metadata.format,
    frontmatter: diagnostics.length ? null : Object.freeze({ ...(metadata.frontmatter ?? {}) }),
    body: metadata.body,
    structure: projectMarkdownStructure(source),
    features: projectMarkdownFeatures(bodySource),
    assertions: projected.assertions,
    diagnostics: Object.freeze(diagnostics),
  });
}
