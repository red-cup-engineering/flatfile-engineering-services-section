import { dumpMarkdownFrontmatter } from "./dump-markdown-frontmatter.mjs";

/** Render a frontmatter record and explicit heading sections as one Markdown carrier. */
export function renderMarkdownSectionDocument({ frontmatter = null, sections, format = "yaml" } = {}) {
  if (!Array.isArray(sections) || sections.length === 0) throw new TypeError("sections must be a non-empty array");
  if (format !== "yaml" && format !== "toml") throw new TypeError("format must be yaml or toml");
  const body = sections.map((section) => {
    if (!section || !Number.isInteger(section.level) || section.level < 1 || section.level > 6 || typeof section.title !== "string" || section.title.trim() === "" || typeof section.body !== "string") {
      throw new TypeError("each section requires a heading level, title, and body");
    }
    return `${"#".repeat(section.level)} ${section.title}\n\n${section.body}`;
  }).join("\n\n");
  return dumpMarkdownFrontmatter(frontmatter, `${body}\n`, format);
}
