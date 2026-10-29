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

function assertAt(value, path, ancestors) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (hasLoneSurrogate(value)) fail(path, "must not contain a lone Unicode surrogate");
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
      assertAt(value[index], `${path}[${index}]`, ancestors);
    }
    ancestors.delete(value);
    return;
  }
  if (isPlainRecord(value)) {
    if (ancestors.has(value)) fail(path, "must not contain a cycle");
    ancestors.add(value);
    for (const key of Object.keys(value)) {
      if (hasLoneSurrogate(key)) fail(`${path}.${key}`, "must not contain a lone Unicode surrogate key");
      assertAt(value[key], `${path}.${key}`, ancestors);
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
