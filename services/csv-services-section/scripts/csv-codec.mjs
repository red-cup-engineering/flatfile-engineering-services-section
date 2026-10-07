/**
 * csv-codec — comma-separated values (RFC 4180): `decodeCsvRows` reads text into rows of fields,
 * `decodeCsv` reads it into records keyed by the header row, and `encodeCsv` writes records back
 * out. Quoted fields may hold commas, doubled quotes and line breaks; CRLF and LF line endings and
 * a leading byte-order mark are accepted. Pure string ↔ value functions, no I/O.
 * @packageDocumentation
 */

/** Rows of fields. Blank lines are dropped; an unterminated quoted field is an error. */
export function decodeCsvRows(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let started = false;
  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    field = "";
    started = false;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && !started) { quoted = true; started = true; }
    else if (char === ",") { row.push(field); field = ""; started = false; }
    else if (char === "\n") endRow();
    else if (char === "\r" && source[index + 1] === "\n") { endRow(); index += 1; }
    else { field += char; started = true; }
  }
  if (quoted) throw new SyntaxError("CSV text ends inside a quoted field");
  if (started || field !== "" || row.length > 0) endRow();
  return rows;
}

/** Records keyed by the header row; a short row's missing fields read as "". */
export function decodeCsv(text) {
  const [columns, ...rows] = decodeCsvRows(text);
  if (!columns) return [];
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])));
}

/**
 * Records as CSV text with a header row, every field quoted, LF line endings and a final newline.
 * Columns default to the first record's keys.
 */
export function encodeCsv(records, { columns = records.length ? Object.keys(records[0]) : [] } = {}) {
  if (records.length === 0) return "";
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...records.map((record) => columns.map((column) => cell(record[column])).join(","))].join("\n") + "\n";
}
