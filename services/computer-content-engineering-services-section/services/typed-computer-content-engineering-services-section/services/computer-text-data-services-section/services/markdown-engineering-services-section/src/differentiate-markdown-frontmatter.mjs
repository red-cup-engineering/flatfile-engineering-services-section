import { differentiateData } from "@red-cup-engineering/json-services-section/differentiate-data";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
/** Differentiate the decoded frontmatter JSON forms of two Markdown texts. */
export function differentiateMarkdownFrontmatter(before, after) { if (typeof before !== "string" || typeof after !== "string") throw new TypeError("before and after must be strings"); return differentiateData(readMarkdownFrontmatter(before).frontmatter ?? {}, readMarkdownFrontmatter(after).frontmatter ?? {}); }
