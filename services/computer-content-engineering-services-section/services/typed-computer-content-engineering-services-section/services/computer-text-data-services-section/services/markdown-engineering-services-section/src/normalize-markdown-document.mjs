import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { encodeToml } from "@red-cup-engineering/toml-file-codec-service";
import { encodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";

function withoutKeys(value, forbidden) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => withoutKeys(entry, forbidden));
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => forbidden.has(key) ? [] : [[key, withoutKeys(entry, forbidden)]]));
}
function normalizeTags(value) {
  if (Array.isArray(value)) { const tags = value.flatMap((entry) => typeof entry === "string" && entry.trim() !== "" ? [entry.trim()] : []); return tags.length === 0 ? undefined : tags; }
  if (typeof value === "string") { const tags = value.split(",").map((entry) => entry.trim()).filter(Boolean); return tags.length === 0 ? undefined : tags; }
  return value;
}
function removeDuplicateDocumentHeading(body, names) {
  const expected = new Set(names.flatMap((value) => typeof value === "string" && value.trim() !== "" ? [value.trim()] : []));
  if (expected.size === 0) return body;
  const source = readMarkdownSource(body, { frontmatter: false });
  const lines = [...source.lines], index = lines.findIndex((line) => line.trim() !== "");
  const heading = projectMarkdownStructure(source).headings.find(({ line }) => line === index + 1);
  if (heading?.level !== 1 || !expected.has(heading.title)) return body;
  lines.splice(index, heading.declarationEndLine - heading.line + 1); while (lines[0] === "") lines.shift();
  return lines.join("\n") + (body.endsWith("\n") && lines.length ? "\n" : "");
}

/** Normalize one Markdown document to repository metadata and linefeed conventions. */
export function normalizeMarkdownDocument(text, { forbiddenFrontmatterKeys = ["author", "authors"] } = {}) {
  if (typeof text !== "string" || !Array.isArray(forbiddenFrontmatterKeys) || forbiddenFrontmatterKeys.some((key) => typeof key !== "string")) throw new TypeError("text and string forbiddenFrontmatterKeys are required");
  const parsed = readMarkdownFrontmatter(text), forbidden = new Set(forbiddenFrontmatterKeys);
  if (parsed.frontmatter === null) return normalizeLinefeeds(parsed.body);
  const frontmatter = withoutKeys(parsed.frontmatter, forbidden), tags = normalizeTags(frontmatter.tags);
  if (tags === undefined) delete frontmatter.tags; else frontmatter.tags = tags;
  const body = normalizeLinefeeds(removeDuplicateDocumentHeading(parsed.body, [frontmatter.name, frontmatter.title]));
  if (Object.keys(frontmatter).length === 0) return body;
  return parsed.format === "toml" ? `+++\n${encodeToml(frontmatter)}+++\n${body}` : `---\n${encodeYaml(frontmatter)}---\n${body}`;
}
