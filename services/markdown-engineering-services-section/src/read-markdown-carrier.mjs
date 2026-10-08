/** Read a confined Markdown source using the shared envelope and structure. */
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { readMarkdownDocument } from "./read-markdown-document.mjs";
import { isMarkdownPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";

const REFUSAL_KIND = "red-cup-engineering.markdown-vault.read-carrier.refusal";
const READ_KIND = "red-cup-engineering.markdown-vault.read-carrier";

function refusal(reason, extra = {}) {
  return Object.freeze({ kind: REFUSAL_KIND, reason, ...extra });
}

/**
 * Reads one Markdown carrier: parsed frontmatter, the heading outline, and
 * the body of one named `section` (case-insensitive exact heading-text
 * match) or the whole body when no `section` is named, truncated at
 * `maxCharacters`.
 *
 * @param {object} options
 * @param {string} options.root - real-path-confining repository root
 * @param {string} options.path - repository-relative Markdown carrier path
 * @param {string} [options.section] - heading text whose body to extract
 * @param {number} [options.headingDepth] - caps the reported outline to headings at or above this level (1-6)
 * @param {number} [options.maxCharacters] - truncates the returned body at this many characters (default 12000)
 * @returns {Promise<object>} a `{kind: "red-cup-engineering.markdown-vault.read-carrier", ...}` read, or a `{kind: "...refusal", reason, ...}` datum
 * @throws {TypeError} when `root` or `path` is missing or not a string
 */
export async function readMarkdownCarrier({
  root,
  path,
  section,
  headingDepth,
  maxCharacters = 12000,
}) {
  if (typeof root !== "string" || root.length === 0) throw new TypeError("root is required");
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path is required");
  if (!Number.isFinite(maxCharacters) || maxCharacters <= 0) throw new TypeError("maxCharacters must be a positive number");

  if (!isMarkdownPath(path)) return refusal("not-a-markdown-path", { path });

  let text;
  try {
    text = await readMarkdownFile({ path, root });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = message.includes("escapes the root") || message.includes("beneath root")
      ? "outside-repository-root"
      : message.includes("ENOENT") || message.includes("no such file")
        ? "not-found"
        : "unreadable";
    return refusal(reason, { path, detail: message });
  }

  return projectMarkdownCarrier({ path, ...readMarkdownDocument(text, { onInvalidFrontmatter: "diagnose", includeSource: true }) }, { section, headingDepth, maxCharacters });
}

/** Project a bounded section from the same document observation used by the catalogue. */
export function projectMarkdownCarrier({ path, source, format, frontmatter, structure, diagnostics = [] }, {
  section, headingDepth, maxCharacters = 12000,
} = {}) {
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) throw new TypeError("maxCharacters must be a positive integer");
  const { lines } = source;

  const outline = Object.freeze(structure.headings
    .filter((heading) => headingDepth === undefined || heading.level <= headingDepth)
    .map((heading) => Object.freeze({ title: heading.title, level: heading.level, line: heading.line })));

  let sectionBody, resolvedSection;
  if (section === undefined) {
    resolvedSection = null;
    sectionBody = lines.slice(structure.bodyStartLine - 1, structure.bodyEndLine).join("\n");
  } else {
    const needle = section.trim().toLowerCase();
    const match = structure.headings.find((heading) => heading.title.trim().toLowerCase() === needle);
    if (match === undefined) {
      return refusal("section-not-found", {
        path,
        section,
        availableHeadings: Object.freeze(structure.headings.map((heading) => heading.title)),
      });
    }
    resolvedSection = section;
    sectionBody = lines.slice(match.bodyStartLine - 1, match.endLine).join("\n");
  }
  // A heading (or the frontmatter fence) is conventionally followed by one
  // blank separator line; drop it so the reported body starts at real content.
  sectionBody = sectionBody.replace(/^\n+/u, "");

  const truncated = sectionBody.length > maxCharacters;
  return Object.freeze({
    kind: READ_KIND,
    path,
    frontmatterFormat: format,
    frontmatter: format === null ? null : frontmatter,
    diagnostics,
    outline,
    section: resolvedSection,
    body: truncated ? sectionBody.slice(0, maxCharacters) : sectionBody,
    truncated,
  });
}
