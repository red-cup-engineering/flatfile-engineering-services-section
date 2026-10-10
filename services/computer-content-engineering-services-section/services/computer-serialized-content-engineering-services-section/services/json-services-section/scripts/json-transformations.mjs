/** Bounded JSON transformations for untrusted documents; no I/O or seller state. */
import { admitCanonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "./canonical-json.mjs";
import { parseJsonPointer, resolveJsonPointer } from "./resolve-json-pointer.mjs";

export const TRANSFORMATION_ENVELOPE = Object.freeze({ ...JSON_RESOURCE_ENVELOPE, maxSourceBytes: 65536, maxCanonicalBytes: 65536, maxNodes: 8192, maxArrayLength: 4096 });
const own = (value, key) => Object.hasOwn(value, key);
function request(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body) || keys.some(key => !own(body, key)) || Object.keys(body).some(key => !keys.includes(key))) throw new TypeError(`request requires exactly ${keys.join(", ")}`);
  canonicalizeJson(body, TRANSFORMATION_ENVELOPE);
}
export function canonicalizeJsonText(body) {
  request(body, ["text"]);
  if (typeof body.text !== "string") throw new TypeError("text must be JSON text");
  const result = admitCanonicalJson(body.text, TRANSFORMATION_ENVELOPE);
  return { text: result.text, byteLength: result.byteLength, standard: "RFC8785" };
}
export function selectJsonPointer(body) {
  request(body, ["value", "pointer"]);
  if (typeof body.pointer !== "string") throw new TypeError("pointer must be an RFC 6901 string");
  parseJsonPointer(body.pointer);
  const value = resolveJsonPointer(body.value, body.pointer);
  return value === undefined ? { found: false } : { found: true, value };
}
export function applyJsonMergePatch(body) {
  request(body, ["value", "patch"]);
  function merge(target, patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
    const result = {};
    const set = (key, value) => Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
    if (target && typeof target === "object" && !Array.isArray(target)) for (const [key, value] of Object.entries(target)) set(key, value);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete result[key];
      else set(key, merge(own(result, key) ? result[key] : undefined, value));
    }
    return result;
  }
  // Validate and return an ordinary JSON carrier, including keys such as __proto__.
  return canonicalizeJson(merge(body.value, body.patch), TRANSFORMATION_ENVELOPE).value;
}
