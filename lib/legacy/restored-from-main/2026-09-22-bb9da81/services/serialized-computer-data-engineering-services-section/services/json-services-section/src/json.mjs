/** JSON value admission and canonical JSON/JSON Lines codecs. No I/O or runtime imports. */
/** @type {"RFC8785"} */
export const CANONICAL_JSON_PROFILE = "RFC8785";

function isPlainRecord(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function fail(path, reason) {
  throw new TypeError(`canonicalJson: ${path} ${reason}`);
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xdc00 || value.charCodeAt(index + 1) > 0xdfff) return true;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function assertAt(value, path, ancestors, canonical = true) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (canonical && hasLoneSurrogate(value)) fail(path, "must not contain a lone Unicode surrogate");
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(path, "must be a finite JSON number");
    return;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) fail(path, "must not contain a cycle");
    ancestors.add(value);
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) fail(`${path}[${index}]`, "must not be a sparse array hole");
      assertAt(value[index], `${path}[${index}]`, ancestors, canonical);
    }
    ancestors.delete(value);
    return;
  }
  if (isPlainRecord(value)) {
    if (ancestors.has(value)) fail(path, "must not contain a cycle");
    ancestors.add(value);
    for (const key of Object.keys(value)) {
      if (canonical && hasLoneSurrogate(key)) fail(`${path}.${key}`, "must not contain a lone Unicode surrogate key");
      assertAt(value[key], `${path}.${key}`, ancestors, canonical);
    }
    ancestors.delete(value);
    return;
  }
  fail(path, "must be a JSON value");
}

/**
 * Asserts that a value is an admitted RFC 8785 JSON value.
 * @param {unknown} value Value to validate.
 * @returns {unknown} The admitted value.
 * @throws {TypeError} When the value contains a non-JSON JavaScript value, sparse array, cycle, non-finite number, or lone surrogate.
 */
export function assertCanonicalJson(value) {
  assertAt(value, "$", new Set());
  return value;
}

/**
 * Tests whether a value is admitted by RFC 8785 JSON validation.
 * @param {unknown} value Value to validate.
 * @returns {boolean} Whether the value is admitted.
 */
export function isCanonicalJson(value) {
  try {
    assertCanonicalJson(value);
    return true;
  } catch {
    return false;
  }
}

function encode(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
  const record = value;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${encode(record[key])}`).join(",")}}`;
}

/**
 * Produces RFC 8785 canonical JSON text using ECMAScript primitive serialization.
 * @param {unknown} value An admitted JSON value.
 * @returns {string} Canonical JSON text.
 * @throws {TypeError} When the value is not admitted JSON.
 */
export function canonicalJson(value) {
  return encode(assertCanonicalJson(value));
}

export default canonicalJson;

/** Whether a value inhabits the JSON universe (finite numbers only, plain objects). */
export function isJsonValue(value) {
  try { assertAt(value, "$", new Set(), false); return true; }
  catch { return false; }
}
/** Whether a value is a JSON object (not null, not an array). */
export function isJsonRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
/**
 * Whether a value is an object record at a runtime boundary.
 *
 * Unlike isJsonRecord, this preserves the permissive object semantics used by
 * callers that intentionally admit class instances or null-prototype records.
 * It is not evidence that the contained values are JSON.
 */
export function isObjectRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Witness a value as JSON or throw — the free-data gate. */
export function requireJsonValue(value, context) {
    if (!isJsonValue(value))
        throw new TypeError(`${context}: not a JSON value`);
    return value;
}
/** Describe a value for a JSON boundary error. */
export function describeJsonValue(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    return typeof value;
}
function isJsonKind(value, kind) {
    return kind === "array" ? Array.isArray(value) : kind === "object" ? isJsonRecord(value) : typeof value === kind;
}
function requireJsonKind(value, context, kind, errorPrefix) {
    const json = requireJsonValue(value, context);
    if (!isJsonKind(json, kind))
        throw new TypeError(`${errorPrefix}: expected ${kind} for ${context}, got ${describeJsonValue(value)}`);
    return json;
}
/** Require a JSON object, retaining the caller's error vocabulary. */
export const requireJsonRecord = (value, context, errorPrefix = "json-codec") => requireJsonKind(value, context, "object", errorPrefix);
/** Require a JSON string, retaining the caller's error vocabulary. */
export const requireJsonString = (value, context, errorPrefix = "json-codec") => requireJsonKind(value, context, "string", errorPrefix);
/** Require a finite JSON number, retaining the caller's error vocabulary. */
export const requireJsonNumber = (value, context, errorPrefix = "json-codec") => requireJsonKind(value, context, "number", errorPrefix);
/** Require a JSON array, retaining the caller's error vocabulary. */
export const requireJsonArray = (value, context, errorPrefix = "json-codec") => requireJsonKind(value, context, "array", errorPrefix);
/** Require a JSON boolean, retaining the caller's error vocabulary. */
export const requireJsonBoolean = (value, context, errorPrefix = "json-codec") => requireJsonKind(value, context, "boolean", errorPrefix);
/** Read a present JSON record field, retaining the caller's error vocabulary. */
export function requireJsonField(record, key, context, errorPrefix = "json-codec") {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
        throw new TypeError(`${errorPrefix}: missing field "${key}" in ${context}`);
    }
    return record[key];
}
/** Parse JSON text and witness the result as a JSON value. */
export function parse(text) {
    return requireJsonValue(JSON.parse(text), "json");
}
/** Witness an arbitrary runtime value as a JSON resource by round-tripping it
 *  through JSON and checking membership. The boundary gate for carriers (frozen
 *  class instances, etc.) whose enumerable shape is JSON. */
export function jsonResource(value, context = "json resource") {
    return requireJsonValue(JSON.parse(JSON.stringify(value)), context);
}
export function canonical(value) {
    return canonicalJson(value);
}
/**
 * Witnesses generic JSON admission before producing RFC 8785 canonical bytes.
 */
export function canonicalChecked(value, context = "canonical JSON") {
    return canonicalJson(requireJsonValue(value, context));
}
/** The non-blank lines of a document. */
export const nonBlankLines = (content) => content.split("\n").filter((line) => line.trim() !== "");
/** Parse newline-delimited JSON, skipping blank lines; each line witnessed. */
export function parseLines(content) {
  const values = [];
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "") continue;
    try { values.push(parse(line)); }
    catch (error) { throw new TypeError(`JSON Lines line ${index + 1}: ${error instanceof Error ? error.message : "invalid JSON"}`); }
  }
  return values;
}

/** Serialize values as newline-delimited canonical JSON (trailing newline). */
export function serializeLines(values) {
    return values.length === 0 ? "" : `${values.map((value) => canonicalChecked(value, "jsonl item")).join("\n")}\n`;
}

export const isJson = isJsonValue;
export const json = (value, context = "JSON value") => requireJsonValue(value, context);
export const encodeJson = canonicalChecked;
export const decodeJson = parse;
export const encodeJsonLines = serializeLines;
export const decodeJsonLines = parseLines;
