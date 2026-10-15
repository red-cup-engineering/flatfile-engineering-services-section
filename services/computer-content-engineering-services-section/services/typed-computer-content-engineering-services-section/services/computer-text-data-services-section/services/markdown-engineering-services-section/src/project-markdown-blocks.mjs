import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { projectMarkdownTables } from "./read-markdown-table.mjs";

function thematicBreak(line) { return /^ {0,3}((?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/u.test(line); }
function callout(line) { const match = line.match(/^ {0,3}>[ \t]*\[!([A-Za-z0-9_-]+)\][ \t]*(.*)$/u); return match === null ? null : { type: match[1].toLowerCase(), title: match[2].trim() || null }; }
function listMarker(line) { const expanded = expandLeadingTabs(line); const match = expanded.match(/^(\s*)((?:[-+*])|(?:\d{1,9}[.)]))\s+(?:\[([ xX])\]\s+)?(.*)$/u); return match === null ? null : { indent: match[1].length, ordered: /^\d/u.test(match[2]), marker: match[2], checkbox: match[3] === undefined ? null : /x/iu.test(match[3]) ? "checked" : "unchecked", text: match[4] }; }
function expandLeadingTabs(line) { const leading = line.match(/^\s*/u)?.[0] ?? ""; return leading.replace(/\t/gu, "  ") + line.slice(leading.length); }
function indentWidth(line) { return expandLeadingTabs(line).match(/^\s*/u)?.[0].length ?? 0; }
function removeIndentColumns(line, columns) { let index = 0, remaining = columns; while (index < line.length && remaining > 0) { if (line[index] === " ") { remaining -= 1; index += 1; continue; } if (line[index] === "\t") { remaining -= 2; index += 1; continue; } break; } return line.slice(index); }
const codeAnnotationLine = /^\s*(?:\[|\()\s*([^\[\(\]\)]+?)\s*::\s*(.*?)\s*(?:\]|\))\s*$/u;

function annotatedFences(lines, fences) {
  const result = new Map();
  for (let start = 0; start < lines.length; start += 1) {
    const annotations = {};
    let index = start;
    while (index < lines.length) {
      const match = codeAnnotationLine.exec(lines[index]);
      if (match === null) break;
      annotations[match[1].trim()] = match[2].trim();
      index += 1;
    }
    const fence = fences.get(index);
    if (index > start && fence !== undefined) result.set(start, Object.freeze({ fence, annotations: Object.freeze(annotations) }));
  }
  return result;
}

function codeBlock(source, fence, annotations = null) {
  const token = fence.info.split(/\s+/u)[0] || "";
  return Object.freeze({
    kind: "code",
    info: /\w/u.test(token) ? token : null,
    code: source.text.slice(fence.contentStart, fence.contentEnd).replace(/\n$/u, ""),
    annotations,
  });
}

function quotedLines(lines, index) {
  const quoted = [];
  while (index < lines.length && (/^ {0,3}>/u.test(lines[index]) || lines[index].trim() === "")) quoted.push(lines[index++].replace(/^ {0,3}>\s?/u, ""));
  return { quoted, next: index };
}

function projectBlocks(lines, headingOffset) {
  const source = readMarkdownSource(lines.join("\n"), { frontmatter: false });
  const fences = new Map(source.codeRanges.filter(({ type }) => type === "fenced-code").map((range) => [range.startLine - 1, range]));
  const annotations = annotatedFences(lines, fences);
  const headings = new Map(projectMarkdownStructure(source).headings.map((heading) => [heading.line - 1, heading]));
  const tables = new Map(projectMarkdownTables(source).map((table) => [table.line - 1, table]));
  const isBlockStart = (index) => annotations.has(index) || tables.has(index) || fences.has(index) || headings.has(index) || thematicBreak(lines[index]) || callout(lines[index]) !== null || /^ {0,3}>/u.test(lines[index]) || listMarker(lines[index]) !== null;
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") { index += 1; continue; }
    const annotated = annotations.get(index);
    if (annotated !== undefined) { blocks.push(codeBlock(source, annotated.fence, annotated.annotations)); index = annotated.fence.endLine; continue; }
    const fence = fences.get(index);
    if (fence !== undefined) { blocks.push(codeBlock(source, fence)); index = fence.endLine; continue; }
    const title = headings.get(index);
    if (title !== undefined) { blocks.push(Object.freeze({ kind: "heading", level: Math.min(6, title.level + headingOffset), text: title.title })); index = title.declarationEndLine; continue; }
    const table = tables.get(index);
    if (table !== undefined) {
      blocks.push(Object.freeze({
        kind: "table",
        headers: Object.freeze([...table.headers]),
        rows: Object.freeze(table.cells.map((cells) => Object.freeze(table.headers.map((_, column) => cells[column] ?? "")))),
      }));
      index = table.endLine;
      continue;
    }
    if (thematicBreak(line)) { blocks.push(Object.freeze({ kind: "rule" })); index += 1; continue; }
    const notice = callout(line);
    if (notice !== null) {
      const { quoted, next } = quotedLines(lines, index + 1);
      blocks.push(Object.freeze({ kind: "callout", type: notice.type, title: notice.title, blocks: projectBlocks(quoted, headingOffset) }));
      index = next;
      continue;
    }
    if (/^ {0,3}>/u.test(line)) {
      const { quoted, next } = quotedLines(lines, index);
      blocks.push(Object.freeze({ kind: "quote", blocks: projectBlocks(quoted, headingOffset) }));
      index = next;
      continue;
    }
    const first = listMarker(line);
    if (first !== null) {
      const items = [];
      while (index < lines.length) {
        const marker = listMarker(lines[index]);
        if (marker === null || marker.indent !== first.indent || marker.ordered !== first.ordered) break;
        const itemLines = [`${marker.checkbox === null ? "" : marker.checkbox === "checked" ? "[x] " : "[ ] "}${marker.text}`];
        index += 1;
        while (index < lines.length) {
          const continuation = lines[index], next = listMarker(continuation);
          if (next !== null && next.indent === first.indent) break;
          if (continuation.trim() !== "" && indentWidth(continuation) <= first.indent) break;
          itemLines.push(continuation.trim() === "" ? "" : removeIndentColumns(continuation, first.indent + 2));
          index += 1;
        }
        items.push(Object.freeze({ blocks: projectBlocks(itemLines, headingOffset) }));
      }
      const digits = first.marker.replace(/\D/gu, "");
      blocks.push(Object.freeze({ kind: "list", ordered: first.ordered, start: first.ordered && digits !== "1" ? digits : null, items: Object.freeze(items) }));
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== "" && (paragraph.length === 0 || !isBlockStart(index))) paragraph.push(lines[index++].trim());
    blocks.push(Object.freeze({ kind: "paragraph", text: paragraph.join(" ") }));
  }
  return Object.freeze(blocks);
}

/**
 * Read Markdown into its block structure, independent of any output format:
 * immutable descriptors of kind `heading` (level, text), `paragraph` (text),
 * `list` (ordered, start, items of blocks), `code` (info, code, annotations),
 * `table` (headers, rows), `quote` (blocks), `callout` (type, title, blocks)
 * and `rule`. Inline text stays Markdown, for `projectMarkdownInline` to read
 * into whatever carrier the renderer writes. HTML is one rendering of these
 * blocks (`renderMarkdownBlockHtml`); RFCXML is another.
 * @param {string} markdown
 * @param {{headingOffset?: number}} [options] added to every heading level, capped at 6
 * @returns {readonly object[]} the block descriptors, in document order
 */
export function projectMarkdownBlocks(markdown, { headingOffset = 0 } = {}) {
  if (typeof markdown !== "string") throw new TypeError("markdown must be a string");
  if (!Number.isInteger(headingOffset) || headingOffset < 0 || headingOffset > 5) throw new RangeError("headingOffset must be an integer from 0 to 5");
  const normalized = markdown.replace(/\r\n?/gu, "\n").trim();
  return normalized === "" ? Object.freeze([]) : projectBlocks(normalized.split("\n"), headingOffset);
}
