import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";

function finding(rule, severity, message, extra = {}) { return Object.freeze({ rule, severity, message, ...extra }); }
function forbiddenKeyFindings(value, forbidden, path = "") {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry, index) => forbiddenKeyFindings(entry, forbidden, `${path}[${index}]`));
  const findings = [];
  for (const [key, entry] of Object.entries(value)) {
    const here = path === "" ? key : `${path}.${key}`;
    if (forbidden.has(key)) findings.push(finding("forbidden-frontmatter-key", "warning", `frontmatter key ${here} should not be present`, { path: here }));
    findings.push(...forbiddenKeyFindings(entry, forbidden, here));
  }
  return findings;
}

/**
 * Validate one Markdown document and return its immutable quality report.
 *
 * The report names malformed frontmatter, non-semantic linefeeds, forbidden
 * nested metadata keys, scalar/empty tags, and a title duplicated by its
 * leading H1. `forbiddenFrontmatterKeys` defaults to `author` and `authors`.
 */
export function validateMarkdownDocument(text, { forbiddenFrontmatterKeys = ["author", "authors"] } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (!Array.isArray(forbiddenFrontmatterKeys) || forbiddenFrontmatterKeys.some((key) => typeof key !== "string")) throw new TypeError("forbiddenFrontmatterKeys must be a string array");
  const findings = [];
  let parseable = true, format = null, frontmatter = null, body = text;
  try {
    const parsed = readMarkdownFrontmatter(text);
    format = parsed.format;
    frontmatter = parsed.frontmatter === null ? null : Object.freeze({ ...parsed.frontmatter });
    body = parsed.body;
  } catch (error) {
    parseable = false;
    const fence = splitMarkdownFrontmatterFence(text);
    format = fence?.format ?? null;
    body = fence?.body ?? text;
    findings.push(finding("parseable-frontmatter", "error", error instanceof Error ? error.message : String(error)));
  }
  const normalizedBody = normalizeLinefeeds(body);
  if (normalizedBody !== body) findings.push(finding("semantic-linefeeds", "warning", "body prose is not normalized to semantic linefeeds"));
  if (frontmatter !== null) {
    findings.push(...forbiddenKeyFindings(frontmatter, new Set(forbiddenFrontmatterKeys)));
    const tags = frontmatter.tags;
    if (tags !== undefined && (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string" && tag.trim() !== ""))) {
      findings.push(finding("tags-list", "warning", "frontmatter tags should be a non-empty string list", { path: "tags" }));
    }
    const title = frontmatter.title;
    const source = readMarkdownSource(body, { frontmatter: false });
    const firstLine = source.lines.findIndex((line) => line.trim() !== "") + 1;
    const heading = projectMarkdownStructure(source).headings.find(({ line }) => line === firstLine);
    if (typeof title === "string" && title.trim() !== "" && heading?.level === 1 && heading.title === title.trim()) {
      findings.push(finding("title-duplicates-h1", "warning", "body starts with an H1 duplicating frontmatter title", { value: title.trim() }));
    }
  }
  return Object.freeze({ kind: "red-cup-engineering.markdown.validation-report", parseable, conformant: parseable && findings.length === 0, format, frontmatter, body, normalizedBody, semanticLinefeeds: Object.freeze({ normalized: normalizedBody === body }), findings: Object.freeze(findings) });
}
