import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";

const SEPARATOR_CELL = /^:?-{1,}:?$/u;

function looksLikeRow(line) {
  return typeof line === "string" && line.trim().length > 0 && line.includes("|");
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) trimmed = trimmed.slice(0, -1);
  const cells = [];
  let current = "";
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === "\\" && trimmed[index + 1] === "|") {
      current += "\\|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line) {
  if (!looksLikeRow(line)) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL.test(cell));
}

/** Project table coordinates and cells from the observed Markdown body. */
export function projectMarkdownTables(source, { startLine = source.bodyStartLine, endLine = source.lines.length } = {}) {
  const lines = source.lines;
  const excluded = new Set();
  for (const range of source.codeRanges) {
    if (range.type === "fenced-code") for (let line = range.startLine; line <= range.endLine; line += 1) excluded.add(line);
  }
  const startIndex = Math.max(0, startLine - 1);
  const endIndex = Math.min(lines.length - 1, endLine - 1);
  const tables = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (excluded.has(index + 1) || excluded.has(index + 2) || !looksLikeRow(headerLine) || !isSeparatorRow(separatorLine)) continue;
    const headers = splitTableRow(headerLine);
    if (headers.length !== splitTableRow(separatorLine).length) continue;
    const cells = [];
    let cursor = index + 2;
    while (cursor <= endIndex && !excluded.has(cursor + 1) && looksLikeRow(lines[cursor]) && !isSeparatorRow(lines[cursor])) {
      cells.push(splitTableRow(lines[cursor]));
      cursor += 1;
    }
    tables.push({ headers, cells, line: index + 1, endLine: cursor });
    index = cursor - 1;
  }
  return tables;
}

/**
 * Reads one GitHub-flavored Markdown table as headers and header-keyed rows.
 * @param {object} request A record with `text` (Markdown source), optional `heading` (a heading title whose section is searched first; default the whole text), and optional `tableIndex` (0-based table position within the searched scope; default 0).
 * @returns {object} `{headers: string[], rows: object[], rowCount: number, position: {line: number}}` on success, or `{refused: "NO_TABLE_FOUND", heading, tableIndex}` when no GitHub-flavored table exists at that position.
 * @throws {TypeError} When `request.text` is not a string.
 */
export function readMarkdownTable(request) {
  if (typeof request?.text !== "string") throw new TypeError("text is required");
  const heading = typeof request.heading === "string" ? request.heading : null;
  const tableIndex = Number.isInteger(request.tableIndex) ? request.tableIndex : 0;
  const source = readMarkdownSource(request.text);
  let startLine = source.bodyStartLine;
  let endLine = source.lines.length;
  if (heading !== null) {
    const structure = projectMarkdownStructure(source);
    const section = structure.headings.find((entry) => entry.title === heading);
    if (section === undefined) return { refused: "NO_TABLE_FOUND", heading, tableIndex };
    startLine = section.bodyStartLine;
    endLine = section.endLine;
  }
  const tables = projectMarkdownTables(source, { startLine, endLine });
  const table = tables[tableIndex];
  if (table === undefined) return { refused: "NO_TABLE_FOUND", heading, tableIndex };
  const rows = table.cells.map((cells) => Object.fromEntries(table.headers.map((header, index) => [header, cells[index] ?? ""])));
  return { headers: table.headers, rows, rowCount: rows.length, position: { line: table.line } };
}
