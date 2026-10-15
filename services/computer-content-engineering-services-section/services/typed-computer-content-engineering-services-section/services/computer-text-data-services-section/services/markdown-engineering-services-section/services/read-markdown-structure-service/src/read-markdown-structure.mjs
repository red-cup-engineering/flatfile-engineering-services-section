import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";

function linesOf(text) {
  const normalized = text.replace(/\r\n?/gu, "\n");
  if (normalized === "") return [];
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return lines;
}

/** One source reading supplies the heading and feature projections. Offsets refer to LF-normalized text. */
export function readMarkdownSource(source, { frontmatter: includeFrontmatter = true } = {}) {
  if (typeof source !== "string") throw new TypeError("text must be a string");
  const text = source.replace(/\r\n?/gu, "\n");
  const lines = linesOf(text);
  const split = includeFrontmatter ? splitMarkdownFrontmatterFence(text) : null;
  const prefixLength = split === null ? 0 : text.length - split.body.length;
  const prefixLines = prefixLength === 0 ? 0 : linesOf(text.slice(0, prefixLength)).length;
  const frontmatter = split === null ? null : Object.freeze({
    format: split.format, startLine: 1, endLine: prefixLines,
    contentStartLine: 2, contentEndLine: Math.max(1, prefixLines - 1),
  });
  const codeRanges = [];
  let fence = null;
  let offset = prefixLength;
  for (let index = prefixLines; index < lines.length; index += 1) {
    const line = lines[index];
    const end = Math.min(text.length, offset + line.length + 1);
    if (fence !== null) {
      const closing = /^ {0,3}(`{3,}|~{3,})[ \t]*$/u.exec(line);
      if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) {
        codeRanges.push(Object.freeze({ type: "fenced-code", start: fence.start, end, startLine: fence.startLine, endLine: index + 1, contentStart: fence.contentStart, contentEnd: offset, info: fence.info }));
        fence = null;
      }
    } else {
      const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
      if (opening && (opening[1][0] !== "`" || !opening[2].includes("`"))) {
        fence = { marker: opening[1][0], length: opening[1].length, start: offset, startLine: index + 1, contentStart: end, info: opening[2].trim() };
      }
    }
    offset = end;
  }
  if (fence !== null) codeRanges.push(Object.freeze({ type: "fenced-code", start: fence.start, end: text.length, startLine: fence.startLine, endLine: lines.length, contentStart: fence.contentStart, contentEnd: text.length, info: fence.info }));

  // Code spans close only at a run of exactly the opening length, including across lines.
  // Scan each prose interval separately so a span cannot cross a fenced block.
  const intervals = [];
  let start = prefixLength;
  const blocks = codeRanges.filter(({type}) => type === "fenced-code");
  let blockIndex = 0;
  offset = prefixLength;
  for (let index = prefixLines; index < lines.length; index += 1) {
    const line = lines[index];
    const end = Math.min(text.length, offset + line.length + 1);
    while (blocks[blockIndex]?.end <= offset) blockIndex += 1;
    if (blocks[blockIndex]?.start <= offset) {
      if (start < offset) intervals.push([start, offset]);
      start = end;
    } else if (line.trim() === "" || headingOf(line, lines[index + 1]) !== null || /^ {0,3}(?:>[ \t]?|[-+*][ \t]+|\d+[.)][ \t]+)/u.test(line)) {
      if (start < offset) intervals.push([start, offset]);
      if (line.trim() !== "") intervals.push([offset, end]);
      start = end;
    }
    offset = end;
  }
  if (start < text.length) intervals.push([start, text.length]);
  for (const [start, end] of intervals) {
    const runs = [...text.slice(start, end).matchAll(/`+/gu)];
    const nextByLength = new Map();
    const closes = new Map();
    for (let index = runs.length - 1; index >= 0; index -= 1) {
      if (nextByLength.has(runs[index][0].length)) closes.set(index, nextByLength.get(runs[index][0].length));
      nextByLength.set(runs[index][0].length, index);
    }
    for (let index = 0; index < runs.length; index += 1) {
      const opening = runs[index];
      const at = start + opening.index;
      let escapes = 0;
      for (let cursor = at - 1; cursor >= start && text[cursor] === "\\"; cursor -= 1) escapes += 1;
      if (escapes % 2) continue;
      const closing = closes.get(index);
      if (closing === undefined) continue;
      codeRanges.push(Object.freeze({ type: "inline-code", start: at, end: start + runs[closing].index + runs[closing][0].length, contentStart: at + opening[0].length, contentEnd: start + runs[closing].index }));
      index = closing;
    }
  }
  codeRanges.sort((left, right) => left.start - right.start);
  return Object.freeze({ text, lines: Object.freeze(lines), frontmatter, bodyStartLine: prefixLines + 1, bodyStartOffset: prefixLength, codeRanges: Object.freeze(codeRanges) });
}

function headingOf(line, next) {
  const match = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u);
  if (match !== null) return { level: match[1].length, title: match[2].replace(/[ \t]+#+[ \t]*$/u, "").trim(), declarationLines: 1 };
  if (line.trim() === "" || /^(?: {4}|\t)|^ {0,3}(?:[-*+][ \t]|\d{1,9}[.)][ \t]|>|#{1,6}(?:[ \t]|$)|`{3,}|~{3,})/u.test(line) || /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/u.test(line)) return null;
  const underline = next?.match(/^ {0,3}(=+|-+)[ \t]*$/u);
  return underline ? { level: underline[1][0] === "=" ? 1 : 2, title: line.trim(), declarationLines: 2 } : null;
}

export function readMarkdownStructure(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return projectMarkdownStructure(readMarkdownSource(text));
}

export function projectMarkdownStructure(source) {
  const { lines, frontmatter, bodyStartLine, codeRanges } = source;
  const headings = [], stack = [];
  let offset = lines.slice(0, bodyStartLine - 1).reduce((sum, line) => sum + line.length + 1, 0);
  const blockRanges = codeRanges.filter(({type}) => type === "fenced-code");
  let rangeIndex = 0;
  for (let index = Math.max(0, bodyStartLine - 1); index < lines.length; index += 1) {
    const lineOffset = offset;
    offset += lines[index].length + 1;
    while (rangeIndex < blockRanges.length && blockRanges[rangeIndex].end <= lineOffset) rangeIndex += 1;
    if (blockRanges[rangeIndex]?.start <= lineOffset) continue;
    const heading = headingOf(lines[index], lines[index + 1]);
    if (heading === null) continue;
    while (stack.length && stack.at(-1).level >= heading.level) stack.pop();
    const entry = { kind: "red-cup-engineering.markdown.heading", level: heading.level, title: heading.title, line: index + 1, startLine: index + 1, endLine: lines.length, declarationEndLine: index + heading.declarationLines, bodyStartLine: index + heading.declarationLines + 1, path: Object.freeze([...stack.filter((item) => item.level < heading.level).map((item) => item.title), heading.title]) };
    headings.push(entry); stack.push(entry);
    if (heading.declarationLines === 2) { index += 1; offset += lines[index].length + 1; }
  }
  const settled = headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    return Object.freeze({ ...heading, endLine: next === undefined ? lines.length : next.line - 1 });
  });
  return Object.freeze({ kind: "red-cup-engineering.markdown.structure", lines: lines.length, frontmatter, bodyStartLine, bodyEndLine: lines.length, headings: Object.freeze(settled) });
}
