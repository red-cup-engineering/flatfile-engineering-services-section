/** Parse an RFC 6901 pointer into decoded reference tokens. URI fragments are
 * accepted by lookup callers; JSON Patch paths must use the string form. */
export function parseJsonPointer(pointer, { allowFragment = true } = {}) {
  if (typeof pointer !== "string") throw new TypeError("JSON pointer must be a string");
  if (allowFragment && pointer.startsWith("#")) {
    try { pointer = decodeURIComponent(pointer.slice(1)); }
    catch { throw new TypeError("malformed pointer URI fragment"); }
  }
  if (pointer === "") return [];
  if (!pointer.startsWith("/") || /~(?![01])/u.test(pointer)) throw new TypeError("malformed RFC 6901 pointer");
  return pointer.slice(1).split("/").map(part => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

/** Resolve decoded tokens; absence is distinct from the JSON value null. */
export function resolveJsonPointerParts(document, parts) {
  let current = document;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    if (Array.isArray(current) && !/^(0|[1-9][0-9]*)$/u.test(part)) return undefined;
    if (!Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

/** Resolve an RFC 6901 pointer or URI fragment against one JSON document. */
export function resolveJsonPointer(document, pointer) {
  let parts;
  try { parts = parseJsonPointer(pointer); } catch { return undefined; }
  return resolveJsonPointerParts(document, parts);
}
