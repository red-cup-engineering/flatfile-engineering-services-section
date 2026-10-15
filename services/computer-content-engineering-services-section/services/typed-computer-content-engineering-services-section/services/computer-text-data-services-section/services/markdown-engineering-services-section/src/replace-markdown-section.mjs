import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
function split(text) { const trailing = text.endsWith("\n"); const lines = text.split("\n"); if (trailing) lines.pop(); return { lines, trailing }; }
function join(lines, trailing) { return `${lines.join("\n")}${trailing ? "\n" : ""}`; }
function bounds(body, heading, level) {
  const title = heading.trim().replace(/^#+\s*/u, "").trim();
  const source = readMarkdownSource(body, { frontmatter: false });
  const match = projectMarkdownStructure(source).headings.find((item) => item.title === title && (level === undefined || item.level === level));
  return match ? { start: match.line - 1, end: match.endLine, level: match.level } : null;
}
/** Replace, append, or delete one heading-delimited Markdown section. */
export function replaceMarkdownSection(body, { heading, level, content = "", mode = "replace", required = false } = {}) {
  if (typeof body !== "string" || typeof heading !== "string" || heading.trim() === "" || !["replace", "upsert", "delete"].includes(mode)) throw new TypeError("body, heading, and a valid mode are required");
  body = body.replace(/\r\n?/gu, "\n");
  const found = bounds(body, heading, level);
  if (found === null) { if (required) throw new TypeError(`markdown section ${JSON.stringify(heading)} not found`); if (mode !== "upsert") return body; const finalLevel = level ?? 2, text = content.endsWith("\n") || content === "" ? content : `${content}\n`; return `${body === "" || body.endsWith("\n\n") ? body : body.endsWith("\n") ? `${body}\n` : `${body}\n\n`}${"#".repeat(finalLevel)} ${heading.trim().replace(/^#+\s*/u, "").trim()}\n\n${text}`; }
  const source = split(body); if (mode === "delete") return join([...source.lines.slice(0, found.start), ...source.lines.slice(found.end)], source.trailing);
  const text = content.endsWith("\n") || content === "" ? content : `${content}\n`, replacement = split(`${"#".repeat(level ?? found.level)} ${heading.trim().replace(/^#+\s*/u, "").trim()}\n\n${text}`).lines;
  return join([...source.lines.slice(0, found.start), ...replacement, ...source.lines.slice(found.end)], source.trailing);
}
