function split(text) { const trailing = text.endsWith("\n"); const lines = text.split("\n"); if (trailing) lines.pop(); return { lines, trailing }; }
function join(lines, trailing) { return `${lines.join("\n")}${trailing ? "\n" : ""}`; }
/** Replace, delete, or insert a one-based Markdown line range without changing final-newline presence. */
export function replaceMarkdownLines(text, { startLine, endLine = startLine, replacement = "", insert = false } = {}) {
  if (typeof text !== "string" || !Number.isInteger(startLine) || !Number.isInteger(endLine) || typeof replacement !== "string") throw new TypeError("text, integer line bounds, and replacement are required");
  if (startLine < 1 || endLine < startLine) throw new TypeError("line bounds must be one-based startLine <= endLine");
  const source = split(text), replacementLines = split(replacement).lines;
  const start = Math.min(startLine - 1, source.lines.length);
  const end = insert ? start : Math.min(endLine, source.lines.length);
  return join([...source.lines.slice(0, start), ...replacementLines, ...source.lines.slice(end)], source.trailing);
}
