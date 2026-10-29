/**
 * YAML mapping codec and byte-preserving top-level mapping mutation.
 * `decodeYaml` delegates the complete language to the maintained YAML parser;
 * Markdown fence handling remains outside this package. `encodeYaml` retains
 * the established canonical JSON-record projection.
 *
 * Laws: decodeYaml(encodeYaml(record)) deep-equals record for every record in
 * the subset, and decodeYaml(encodeYaml(decodeYaml(text))) = decodeYaml(text)
 * for conforming texts (canonical serialization may normalize quoting and drop
 * comments; it never loses an entry).
 */
import { isObjectRecord, requireJsonValue, type JsonRecord, type JsonValue } from "../../../../json-services-section/src/index.mjs";
import { Document, isCollection, isMap, isScalar, isSeq, LineCounter, parseDocument } from "yaml";
import { isDeepStrictEqual } from "node:util";

const KEY_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/u;
// A plain scalar accepted in *key* position on decode. This is deliberately
// wider than KEY_PATTERN (which stays the canonical bare-vs-quoted choice
// encodeEntry writes) because YAML's plain-scalar grammar permits far more
// than word characters, dots, and dashes: interior spaces ("induced by"),
// leading digits or symbols ("$thing"), and non-ASCII letters ("ν_1",
// "leśniewski-mereology") are all legal. What a *plain scalar* may not do is
// start with a character that YAML reserves as an indicator (it would read
// as something else — a comment, an anchor, a flow-map open, ...), start
// with `-`, `?`, or `:` immediately followed by whitespace or end-of-string
// (those are the block-sequence, explicit-key, and mapping-value indicators),
// or contain a space immediately followed by `#` (that opens a comment
// mid-scalar). KEY_PATTERN already implies PLAIN_KEY_START_FORBIDDEN et al.
// for every string it accepts, so widening decode this way never changes the
// parse of a document that already parsed.
const PLAIN_KEY_START_FORBIDDEN = /^[#&*!|>'"%@`,[\]{}]/u;
const PLAIN_KEY_CONTROL_CHAR = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u;

/**
 * Whether a plain (unquoted) YAML scalar would misparse and therefore must be
 * quoted. Exported so a frontmatter repair tool can quote only the values
 * that actually need it, rather than reimplementing this predicate.
 */
export function needsQuoteAsPlainScalar(text: string): boolean {
  return needsQuote(text);
}

/** Quote a scalar the same way `encodeYaml` would, escaping as `encodeYaml` does. */
export function quoteYamlScalar(text: string): string {
  return quoteString(text);
}

function isPlainKey(key: string): boolean {
  if (key === "") return false;
  if (PLAIN_KEY_CONTROL_CHAR.test(key)) return false;
  if (PLAIN_KEY_START_FORBIDDEN.test(key)) return false;
  const first = key[0];
  if ((first === "-" || first === "?" || first === ":") && (key.length === 1 || /\s/u.test(key[1] ?? ""))) return false;
  if (key.includes(" #")) return false;
  return true;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?)?$/u;
const INTEGER_PATTERN = /^[+-]?\d+$/u;
const FLOAT_PATTERN = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/u;

/** Decode a YAML head (fence-free text) into a frozen JSON record. */
export function decodeYaml(text: string): JsonRecord {
  return decodeYamlDocument(text).record;
}

type YamlMappingPair = Readonly<{
  key?: Readonly<{ value?: unknown; range?: readonly [number, number, number] }> | null;
}>;

export function decodeYamlDocument(text: string, lineCounter?: LineCounter): Readonly<{ document: ReturnType<typeof parseDocument>; record: JsonRecord }> {
  if (typeof text !== "string") throw new TypeError("yaml: document must be a string");
  const document = parseDocument(text, {
    keepSourceTokens: true,
    ...(lineCounter === undefined ? {} : { lineCounter }),
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new TypeError(`yaml: invalid document: ${document.errors.map(({ message }) => message).join("; ")}`);
  }
  const value: unknown = document.contents === null ? {} : document.toJS({ maxAliasCount: 100 });
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("yaml: document must be a mapping");
  }
  return Object.freeze({ document, record: requireJsonValue(value, "yaml document") as JsonRecord });
}

export type YamlMappingSourceLocations = Readonly<Record<string, Readonly<{ line: number; column: number; offset: number }>>>;

/** Decode a YAML mapping and locate each top-level key in the original text. */
export function decodeYamlWithSourceLocations(text: string): Readonly<{ value: JsonRecord; keyLocations: YamlMappingSourceLocations }> {
  const lineCounter = new LineCounter();
  const { document, record } = decodeYamlDocument(text, lineCounter);
  const keyLocations: Record<string, Readonly<{ line: number; column: number; offset: number }>> = {};
  if (isMap(document.contents)) {
    for (const pair of document.contents.items as readonly YamlMappingPair[]) {
      const key = pair.key?.value;
      const offset = pair.key?.range?.[0];
      if (typeof key !== "string" || offset === undefined) continue;
      const { line, col } = lineCounter.linePos(offset);
      keyLocations[key] = Object.freeze({ line, column: col, offset });
    }
  }
  return Object.freeze({ value: record, keyLocations: Object.freeze(keyLocations) });
}

export type FlatScalarStringListRecord = Readonly<Record<string, string | readonly string[]>>;

/**
 * Project a full YAML mapping onto the older flat metadata contract.
 * Strings and string lists survive, null means an empty scalar, and nested or
 * typed values are omitted instead of being reinterpreted as strings.
 */
export function projectFlatScalarStringLists(record: JsonRecord): FlatScalarStringListRecord {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("yaml: flat projection requires a mapping");
  }
  const projected: Record<string, string | readonly string[]> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null) {
      projected[key] = "";
    } else if (typeof value === "string") {
      projected[key] = value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      projected[key] = Object.freeze([...value]);
    }
  }
  return Object.freeze(projected);
}

export type YamlTopLevelMappingMutation =
  | { mode: "delete"; keys: readonly string[] }
  | { mode: "rename"; from: string; to: string }
  | { mode: "set"; key: string; value: JsonValue; beforeKey?: string; flow?: boolean };

type SourceLine = Readonly<{ start: number; contentEnd: number; end: number; content: string }>;
type MappingEntry = Readonly<{ key: string; keyStart: number; keyEnd: number; start: number; end: number }>;

/**
 * Change one or more top-level mapping fields without serializing unrelated
 * YAML. Valid maps use parsed CST ranges so nested same-name keys remain
 * untouched. Invalid YAML falls back to a conservative lexical assay that
 * refuses duplicate targets, nested target collisions, and ambiguous keys.
 */
export function mutateYamlTopLevelMapping(text: string, mutation: YamlTopLevelMappingMutation): string {
  if (typeof text !== "string") throw new TypeError("yaml: document must be a string");
  if (mutation === null || typeof mutation !== "object") throw new TypeError("yaml: mutation must be an object");
  const keys = mutation.mode === "delete" ? mutation.keys : mutation.mode === "rename" ? [mutation.from, mutation.to] : [mutation.key];
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== "string" || key.length === 0)) {
    throw new TypeError("yaml: mutation keys must be nonempty strings");
  }
  const uniqueTargets = [...new Set(keys)];
  const ast = parseDocument(text, { keepSourceTokens: true, prettyErrors: false, strict: true, uniqueKeys: true });
  if (ast.errors.length === 0 && isMap(ast.contents) && ast.contents.flow === true) {
    // A flow mapping is one syntactic carrier: commas and braces belong to
    // its collection, so field deletion must be serialized by the YAML AST.
    if (mutation.mode === "delete") {
      if (!mutation.keys.some((key) => ast.has(key))) return text;
      for (const key of mutation.keys) ast.delete(key);
    } else if (mutation.mode === "rename") {
      if (!ast.has(mutation.from) || mutation.from === mutation.to) return text;
      if (ast.has(mutation.to)) throw new TypeError(`yaml: top-level key ${mutation.to} already exists`);
      const pair = ast.contents.items.find((pair) => isScalar(pair.key) && pair.key.value === mutation.from);
      if (pair !== undefined && isScalar(pair.key)) pair.key.value = mutation.to;
    } else {
      if (isDeepStrictEqual(decodeYaml(text)[mutation.key], mutation.value)) return text;
      ast.set(mutation.key, mutation.value);
    }
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    return ast.toString({ lineWidth: 0 }).replaceAll("\n", newline);
  }
  const { entries, nestedKeys } = scanTopLevelMapping(text);
  for (const key of uniqueTargets) {
    const matches = entries.filter((entry) => entry.key === key);
    if (matches.length > 1) throw new TypeError(`yaml: duplicate top-level key ${key}`);
    if (nestedKeys.has(key)) throw new TypeError(`yaml: nested key ${key} makes top-level mutation ambiguous`);
  }

  if (mutation.mode === "delete") {
    const spans = entries.filter(({ key }) => uniqueTargets.includes(key)).sort((left, right) => right.start - left.start);
    return spans.reduce((result, { start, end }) => `${result.slice(0, start)}${result.slice(end)}`, text);
  }

  if (mutation.mode === "rename") {
    const source = entries.find(({ key }) => key === mutation.from);
    if (source === undefined) return text;
    if (entries.some(({ key }) => key === mutation.to)) throw new TypeError(`yaml: top-level key ${mutation.to} already exists`);
    return `${text.slice(0, source.keyStart)}${renderMappingKey(mutation.to)}${text.slice(source.keyEnd)}`;
  }

  const existing = entries.find(({ key }) => key === mutation.key);
  if (existing !== undefined) {
    const parsed = parsedTopLevelMapping(text);
    if (parsed !== null && isDeepStrictEqual(decodeYaml(text)[mutation.key], mutation.value)) return text;
  }
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const rendered = renderChangedPair(text, mutation).replaceAll("\n", newline);
  if (existing !== undefined) return `${text.slice(0, existing.start)}${rendered}${text.slice(existing.end)}`;
  const before = entries.find(({ key }) => key === mutation.beforeKey);
  if (before !== undefined) return `${text.slice(0, before.start)}${rendered}${text.slice(before.start)}`;
  const separator = text.length === 0 || text.endsWith("\n") || text.endsWith("\r") ? "" : newline;
  return `${text}${separator}${rendered}`;
}

/** Serialize only the changed pair using the maintained YAML AST. */
function renderChangedPair(text: string, mutation: Extract<YamlTopLevelMappingMutation, { mode: "set" }>): string {
  const parsed = parseDocument(text, { keepSourceTokens: true, prettyErrors: false, strict: true, uniqueKeys: true });
  if (parsed.errors.length > 0 || (parsed.contents !== null && !isMap(parsed.contents))) {
    return encodeYaml({ [mutation.key]: mutation.value });
  }
  const previous = parsed.get(mutation.key, true);
  const output = new Document({ [mutation.key]: mutation.value });
  const node = output.get(mutation.key, true);
  if (node && typeof node === "object" && previous && typeof previous === "object") {
    for (const property of ["comment", "commentBefore", "anchor", "spaceBefore", "tag"] as const) {
      if (property in previous) Object.assign(node, { [property]: (previous as Record<string, unknown>)[property] });
    }
    if (isScalar(node) && isScalar(previous) && previous.type !== undefined) node.type = previous.type;
    if (isCollection(node) && isCollection(previous) && previous.flow !== undefined) node.flow = previous.flow;
    if (isSeq(node) && isSeq(previous)) {
      node.items = node.items.map((item) => {
        const retained = previous.items.find((old) => isScalar(old) && isScalar(item) && isDeepStrictEqual(old.value, item.value));
        return retained && isScalar(retained) ? retained.clone() : item;
      });
    }
  }
  if (isCollection(node) && mutation.flow !== undefined) node.flow = mutation.flow;
  const originalPair = isMap(parsed.contents) ? parsed.contents.items.find((pair) => isScalar(pair.key) && pair.key.value === mutation.key) : undefined;
  if (originalPair && isScalar(originalPair.key) && isMap(output.contents)) {
    output.contents.items[0]!.key = originalPair.key.clone();
    delete (output.contents.items[0]!.key as typeof originalPair.key).commentBefore;
    (output.contents.items[0]!.key as typeof originalPair.key).spaceBefore = false;
  }
  return output.toString({ lineWidth: 0 });
}

function scanTopLevelMapping(text: string): Readonly<{ entries: readonly MappingEntry[]; nestedKeys: ReadonlySet<string> }> {
  const parsed = parsedTopLevelMapping(text);
  if (parsed !== null) return parsed;
  return scanLexicalTopLevelMapping(text);
}

type CstRange = readonly [number, number, number];
type CstPair = Readonly<{
  key?: Readonly<{ value?: unknown; range?: CstRange }>;
  value?: Readonly<{ range?: CstRange }> | null;
  srcToken?: unknown;
}>;

/**
 * Select exact top-level pairs from a valid YAML map. Nested same-name keys
 * are not candidates and therefore remain byte-identical. Invalid documents
 * deliberately fall through to the conservative lexical refusal path.
 */
function parsedTopLevelMapping(text: string): Readonly<{ entries: readonly MappingEntry[]; nestedKeys: ReadonlySet<string> }> | null {
  const document = parseDocument(text, { keepSourceTokens: true, prettyErrors: false, strict: true, uniqueKeys: true });
  if (document.errors.length > 0 || !isMap(document.contents)) return null;
  const entries: MappingEntry[] = [];
  for (const pair of document.contents.items as readonly CstPair[]) {
    const key = pair.key?.value;
    const keyRange = pair.key?.range;
    if (typeof key !== "string" || keyRange === undefined) continue;
    const start = keyRange[0];
    const end = Math.max(keyRange[2], pair.value?.range?.[2] ?? start, sourceTokenEnd(pair.srcToken));
    if (end < start || end > text.length) return null;
    entries.push(Object.freeze({ key, keyStart: keyRange[0], keyEnd: keyRange[1], start, end }));
  }
  return Object.freeze({ entries: Object.freeze(entries), nestedKeys: new Set<string>() });
}

function sourceTokenEnd(value: unknown, seen = new Set<object>()): number {
  if (Array.isArray(value)) return value.reduce((maximum, item) => Math.max(maximum, sourceTokenEnd(item, seen)), 0);
  if (value === null || typeof value !== "object" || seen.has(value)) return 0;
  seen.add(value);
  const token = value as Readonly<Record<string, unknown>>;
  let maximum = typeof token.offset === "number" && typeof token.source === "string" ? token.offset + token.source.length : 0;
  for (const child of Object.values(token)) maximum = Math.max(maximum, sourceTokenEnd(child, seen));
  return maximum;
}

function scanLexicalTopLevelMapping(text: string): Readonly<{ entries: readonly MappingEntry[]; nestedKeys: ReadonlySet<string> }> {
  const lines = sourceLines(text);
  const starts: Array<Omit<MappingEntry, "end"> & { lineIndex: number }> = [];
  const nestedKeys = new Set<string>();
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line === undefined || line.content.trim() === "" || line.content.trimStart().startsWith("#")) continue;
    const indent = line.content.length - line.content.trimStart().length;
    const parsed = parseMappingKey(line.content.slice(indent));
    if (parsed === null) continue;
    if (indent > 0) {
      nestedKeys.add(parsed.key);
      continue;
    }
    starts.push({
      key: parsed.key,
      keyStart: line.start + parsed.start,
      keyEnd: line.start + parsed.end,
      start: line.start,
      lineIndex,
    });
  }
  const entries = starts.map((entry) => {
    let end = lines[entry.lineIndex]?.end ?? text.length;
    for (let index = entry.lineIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line === undefined) break;
      const trimmed = line.content.trim();
      const indent = line.content.length - line.content.trimStart().length;
      if (trimmed === "" || (indent === 0 && trimmed.startsWith("#"))) break;
      if (indent === 0 && parseMappingKey(line.content) !== null) break;
      if (indent === 0 && !line.content.startsWith("-") && !line.content.startsWith("? ")) break;
      end = line.end;
    }
    return Object.freeze({ key: entry.key, keyStart: entry.keyStart, keyEnd: entry.keyEnd, start: entry.start, end });
  });
  return Object.freeze({ entries: Object.freeze(entries), nestedKeys });
}

function sourceLines(text: string): readonly SourceLine[] {
  const lines: SourceLine[] = [];
  const pattern = /[^\r\n]*(?:\r\n|\n|\r|$)/gu;
  for (const match of text.matchAll(pattern)) {
    if (match[0] === "") continue;
    const start = match.index;
    const content = match[0].replace(/(?:\r\n|\n|\r)$/u, "");
    lines.push(Object.freeze({ start, contentEnd: start + content.length, end: start + match[0].length, content }));
  }
  return Object.freeze(lines);
}

function parseMappingKey(line: string): Readonly<{ key: string; start: number; end: number }> | null {
  if (line.startsWith("'") || line.startsWith('"')) {
    const quote = line[0];
    let end = 1;
    while (end < line.length) {
      if (quote === "'" && line[end] === "'" && line[end + 1] === "'") { end += 2; continue; }
      if (line[end] === quote && (quote === "'" || line[end - 1] !== "\\")) break;
      end += 1;
    }
    if (end >= line.length) return null;
    const separator = line.slice(end + 1).match(/^\s*:/u);
    if (separator === null) return null;
    const token = line.slice(0, end + 1);
    const decoded = parseDocument(`${token}: null`, { prettyErrors: false, strict: true });
    if (decoded.errors.length > 0) return null;
    const mapping = decoded.toJS() as Record<string, unknown>;
    const key = Object.keys(mapping)[0];
    return key === undefined ? null : Object.freeze({ key, start: 0, end: end + 1 });
  }
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== ":") continue;
    const next = line[index + 1];
    if (next !== undefined && !/[ \t]/u.test(next)) continue;
    const key = line.slice(0, index).trimEnd();
    if (key === "" || /^[\-?:](?:\s|$)/u.test(key)) return null;
    return Object.freeze({ key, start: 0, end: key.length });
  }
  return null;
}

function renderMappingKey(key: string): string {
  if (isPlainKey(key) && !key.includes(":")) return key;
  return JSON.stringify(key);
}

/** Encode a JSON record as YAML head text (fence-free, trailing newline). */
export function encodeYaml(record: JsonRecord): string {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("yaml: document must be a plain record");
  }
  const lines: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    encodeEntry(lines, key, value as JsonValue, 0, key);
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

// — encoding —

function encodeEntry(lines: string[], rawKey: string, value: JsonValue, indent: number, where: string): void {
  const key = KEY_PATTERN.test(rawKey) ? rawKey : quoteString(rawKey);
  const pad = " ".repeat(indent);
  if (isObjectRecord(value)) {
    lines.push(`${pad}${key}:`);
    for (const [childKey, child] of Object.entries(value)) {
      if (child === undefined) continue;
      encodeEntry(lines, childKey, child as JsonValue, indent + 2, `${where}.${childKey}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad}${key}: []`);
      return;
    }
    lines.push(`${pad}${key}:`);
    encodeSequence(lines, value, indent + 2, where);
    return;
  }
  if (typeof value === "string" && value.includes("\n")) {
    encodeBlockScalar(lines, `${pad}${key}:`, value, indent + 2);
    return;
  }
  lines.push(`${pad}${key}: ${encodeScalar(value)}`);
}

function encodeSequence(lines: string[], value: readonly JsonValue[], indent: number, where: string): void {
  const pad = " ".repeat(indent);
  for (const [index, item] of value.entries()) {
    const itemWhere = `${where}[${index}]`;
    if (isObjectRecord(item)) {
      encodeSequenceMapItem(lines, item, indent, itemWhere);
      continue;
    }
    if (Array.isArray(item)) {
      lines.push(`${pad}- ${encodeInlineArray(item, itemWhere)}`);
      continue;
    }
    if (typeof item === "string" && item.includes("\n")) {
      throw new TypeError(`${itemWhere}: multi-line strings are not encodable as sequence items`);
    }
    lines.push(`${pad}- ${encodeScalar(item)}`);
  }
}

function encodeSequenceMapItem(lines: string[], item: Readonly<Record<string, unknown>>, indent: number, where: string): void {
  const entries = Object.entries(item).filter(([, child]) => child !== undefined);
  if (entries.length === 0) throw new TypeError(`${where}: sequence map items must have at least one entry`);
  const dash = `${" ".repeat(indent)}- `;
  const before = lines.length;
  for (const [key, child] of entries) {
    encodeEntry(lines, key, child as JsonValue, indent + 2, `${where}.${key}`);
  }
  const first = lines[before];
  if (first !== undefined) lines[before] = `${dash}${first.slice(indent + 2)}`;
}

function encodeInlineArray(value: readonly JsonValue[], where: string): string {
  const items = value.map((item, index) => {
    if (isObjectRecord(item)) throw new TypeError(`${where}[${index}]: records inside nested arrays are not encodable`);
    if (Array.isArray(item)) return encodeInlineArray(item, `${where}[${index}]`);
    if (typeof item === "string" && item.includes("\n")) throw new TypeError(`${where}[${index}]: multi-line strings are not encodable inline`);
    return encodeScalar(item);
  });
  return `[${items.join(", ")}]`;
}

function encodeBlockScalar(lines: string[], keyLine: string, value: string, indent: number): void {
  const pad = " ".repeat(indent);
  const chomp = value.endsWith("\n") ? "" : "-";
  const body = value.endsWith("\n") ? value.slice(0, -1) : value;
  lines.push(`${keyLine} |${chomp}`);
  for (const line of body.split("\n")) {
    lines.push(line === "" ? "" : `${pad}${line}`);
  }
}

function encodeScalar(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("yaml: numbers must be finite");
    return String(value);
  }
  if (typeof value !== "string") throw new TypeError("yaml: scalars are strings, numbers, booleans, or null");
  return needsQuote(value) ? quoteString(value) : value;
}

function needsQuote(text: string): boolean {
  if (text === "" || text !== text.trim()) return true;
  if (DATE_PATTERN.test(text)) return false;
  if (/^[[\]{}"'>|*&!?@%#,`-]/u.test(text)) return true;
  if (/\s#/u.test(text) || text.includes("\n")) return true;
  // ": " and a trailing ":" are YAML's mapping indicator, so a plain scalar
  // cannot carry them: `- a: b` reads back as the map {a: "b"}, not the string
  // "a: b". Unquoted, a string silently becomes an object — the value changes
  // type on a round-trip through this encoder, which no caller can defend
  // against because nothing in the value is malformed.
  if (/:(?:\s|$)/u.test(text)) return true;
  if (/^(?:true|false|null|~)$/iu.test(text)) return true;
  if (INTEGER_PATTERN.test(text) || FLOAT_PATTERN.test(text)) return true;
  return false;
}

function quoteString(text: string): string {
  let out = '"';
  for (const char of text) {
    if (char === "\\" || char === '"') out += `\\${char}`;
    else if (char === "\n") out += "\\n";
    else if (char === "\t") out += "\\t";
    else if (char === "\r") out += "\\r";
    else out += char;
  }
  return `${out}"`;
}


export type YamlScalarRepair = Readonly<{
  ok: true; text: string; changes: readonly Readonly<{ line: number; before: string; after: string }>[];
}> | Readonly<{ ok: false; reason: string; line: number | null }>;

/** Explicit repair of parser-identified plain scalar defects; never used by normal decoding. */
export function repairYamlPlainScalars(source: string): YamlScalarRepair {
  if (typeof source !== "string") throw new TypeError("yaml: document must be a string");
  let text = source;
  const changes: Array<{ line: number; before: string; after: string }> = [];
  for (let iteration = 0; iteration < 50; iteration += 1) {
    const lineCounter = new LineCounter();
    const document = parseDocument(text, { strict: true, uniqueKeys: true, prettyErrors: false, keepSourceTokens: true, lineCounter });
    const error = document.errors[0];
    if (error === undefined) {
      try { decodeYaml(text); }
      catch (cause) { return { ok: false, reason: cause instanceof Error ? cause.message : String(cause), line: null }; }
      return { ok: true, text, changes };
    }
    const offset = error.pos[0];
    const lineNumber = lineCounter.linePos(offset).line;
    const line = sourceLines(text)[lineNumber - 1];
    const refused = { ok: false as const, reason: error.message, line: lineNumber };
    if (line === undefined || !["BLOCK_AS_IMPLICIT_KEY", "BAD_SCALAR_START", "UNEXPECTED_TOKEN"].includes(error.code)) return refused;
    // The parser's CST supplies value starts and comment boundaries. Only the
    // offending scalar is quoted; separators, comments and mixed newlines are
    // source slices, not reconstructed Markdown or a second YAML grammar.
    const starts: number[] = [], comments: number[] = [];
    const visit = (token: unknown): void => {
      if (Array.isArray(token)) { for (const item of token) visit(item); return; }
      if (token === null || typeof token !== "object") return;
      const value = token as Record<string, unknown>;
      if (value.type === "comment" && typeof value.offset === "number" && value.offset >= line.start && value.offset < line.contentEnd) comments.push(value.offset);
      if ((value.type === "block-map" || value.type === "block-seq") && Array.isArray(value.items)) for (const item of value.items) {
        const candidate = item?.value, start = candidate?.offset;
        // A collection introduced on a previous line, or a sequence's compact
        // mapping, is structure. Its own inline child value is the candidate.
        if (item?.key?.offset < line.start || candidate?.type === "block-seq" || (value.type === "block-seq" && candidate?.type === "block-map")) continue;
        if (typeof start === "number" && start >= line.start && start <= offset && start < line.contentEnd) starts.push(start);
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(document.contents?.srcToken);
    const start = starts.includes(offset) ? offset : Math.min(...starts);
    if (!Number.isFinite(start)) return refused;
    const commentStart = comments.length === 0 ? line.contentEnd : Math.min(...comments);
    const value = text.slice(start, commentStart).trimEnd();
    if (value === "" || /^["']/u.test(value) || !needsQuoteAsPlainScalar(value)) return refused;
    // A malformed collection is not assumed to have been a string. The one
    // supported flow-looking scalar is a complete Markdown link in a value.
    if (/^[\[{]/u.test(value) && !(error.code === "UNEXPECTED_TOKEN" && /^\[[^\r\n]*\]\([^\r\n]*\)$/u.test(value))) return refused;
    const replacement = quoteYamlScalar(value);
    const next = text.slice(0, start) + replacement + text.slice(start + value.length);
    changes.push({ line: lineNumber, before: line.content, after: text.slice(line.start, start) + replacement + text.slice(start + value.length, line.contentEnd) });
    text = next;
  }
  return { ok: false, reason: "did not converge within 50 iterations", line: null };
}
