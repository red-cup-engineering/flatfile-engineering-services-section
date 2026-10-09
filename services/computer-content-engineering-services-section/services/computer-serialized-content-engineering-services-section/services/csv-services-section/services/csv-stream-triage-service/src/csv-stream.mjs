/**
 * csv-stream: RFC 4180 CSV read incrementally. Input is any async or sync
 * iterable of byte chunks (Uint8Array) or string chunks; rows are yielded as
 * they complete, so memory stays flat however large the file is. Quoted
 * fields may hold commas, doubled quotes and line breaks. CRLF, LF and CR
 * endings are accepted, as is a leading byte-order mark. A chunk boundary
 * may fall anywhere, including inside a quote pair or between CR and LF.
 * Blank lines are skipped.
 * @packageDocumentation
 */

const QUOTE = 34;
const COMMA = 44;
const LF = 10;
const CR = 13;

/** Parser state carried across chunks. */
function newState() {
  return { field: "", row: [], quoted: false, inQuotes: false, quoteSeen: false, skipLineFeed: false, atStart: true };
}

/** Parses one text chunk, appending each completed row to `out`. Spans are copied with slice, not character by character. */
function parseChunk(text, state, out) {
  let i = 0;
  const n = text.length;
  if (state.atStart && n > 0) {
    state.atStart = false;
    if (text.charCodeAt(0) === 0xfeff) i = 1;
  }
  while (i < n) {
    if (state.skipLineFeed) {
      state.skipLineFeed = false;
      if (text.charCodeAt(i) === LF) { i += 1; continue; }
    }
    if (state.quoteSeen) {
      state.quoteSeen = false;
      if (text.charCodeAt(i) === QUOTE) { state.field += '"'; i += 1; continue; }
      state.inQuotes = false;
    }
    if (state.inQuotes) {
      const next = text.indexOf('"', i);
      if (next === -1) { state.field += text.slice(i); i = n; } else { state.field += text.slice(i, next); state.quoteSeen = true; i = next + 1; }
      continue;
    }
    let j = i;
    while (j < n) {
      const code = text.charCodeAt(j);
      if (code === COMMA || code === LF || code === CR || code === QUOTE) break;
      j += 1;
    }
    if (j > i) { state.field += text.slice(i, j); i = j; if (i >= n) break; }
    const code = text.charCodeAt(i);
    i += 1;
    if (code === QUOTE) {
      if (state.field === "" && !state.quoted) { state.inQuotes = true; state.quoted = true; } else state.field += '"';
    } else if (code === COMMA) {
      state.row.push(state.field); state.field = ""; state.quoted = false;
    } else {
      if (code === CR) state.skipLineFeed = true;
      if (state.row.length > 0 || state.field !== "" || state.quoted) { state.row.push(state.field); out.push(state.row); }
      state.row = []; state.field = ""; state.quoted = false;
    }
  }
}

/**
 * @param {AsyncIterable<Uint8Array|string>|Iterable<Uint8Array|string>} chunks
 * @returns {AsyncGenerator<string[]>}
 */
export async function* csvRows(chunks) {
  const decoder = new TextDecoder("utf-8");
  const state = newState();
  let out = [];
  for await (const chunk of chunks) {
    parseChunk(typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true }), state, out);
    if (out.length) { const done = out; out = []; yield* done; }
  }
  parseChunk(decoder.decode(), state, out);
  if (state.inQuotes && !state.quoteSeen) throw new SyntaxError("csv ended inside a quoted field");
  if (state.row.length > 0 || state.field !== "" || state.quoted) { state.row.push(state.field); out.push(state.row); }
  yield* out;
}

/**
 * Rows keyed by the header row. A row whose width differs from the header is
 * not guessed at: it is reported through `onMalformed` (with its 1-based row
 * number) and skipped.
 * @param {AsyncIterable<Uint8Array|string>|Iterable<Uint8Array|string>} chunks
 * @param {{onMalformed?: (rowNumber: number, width: number) => void}} [options]
 * @returns {AsyncGenerator<Record<string, string>>}
 */
export async function* csvRecords(chunks, { onMalformed = () => {} } = {}) {
  let header = null;
  let number = 0;
  for await (const row of csvRows(chunks)) {
    number += 1;
    if (header === null) {
      header = row;
      if (new Set(header).size !== header.length) throw new TypeError("csv header has duplicate column names");
      continue;
    }
    if (row.length !== header.length) { onMalformed(number, row.length); continue; }
    const record = {};
    for (let index = 0; index < header.length; index += 1) record[header[index]] = row[index];
    yield record;
  }
}
