import { sanitizeSegment, desanitizeSegment } from "./segments.mjs";
import { requireJsonValue } from "@red-cup-engineering/json-services-section/require-json-value";

const JSON_TERM_PREFIX = "~json:";
const STRING_TERM_PREFIX = "~string:";
const canonicalTermValue = (value) => {
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("termKey: non-finite numbers are not addressable terms");
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalTermValue);
  const out = {};
  for (const [name, item] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    Object.defineProperty(out, name, { value: canonicalTermValue(item), enumerable: true });
  }
  return out;
};

/** The canonical key for a term: plain strings unchanged (reserved prefixes
 *  escaped), non-strings serialized to stable JSON with sorted keys. */
export function termKey(term) {
  requireJsonValue(term, "address term");
  if (typeof term === "string") {
    return term.startsWith(JSON_TERM_PREFIX) || term.startsWith(STRING_TERM_PREFIX)
      ? `${STRING_TERM_PREFIX}${term}`
      : term;
  }
  return `${JSON_TERM_PREFIX}${JSON.stringify(canonicalTermValue(term))}`;
}

export const segment = (term) => sanitizeSegment(termKey(term));
const segmentsOf = (term) => {
  if (Array.isArray(term)) return term.map(termKey);
  return typeof term === "string"
    ? term.split("/").map((part) => part.trim()).filter(Boolean)
    : [termKey(term)];
};

const typeOf = (type) => {
  const text = String(type ?? "").trim().replace(/^\.+/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(text)) throw new TypeError("address: a typed filepath needs a safe type extension");
  return text;
};

const addressOfSegments = (root, segments, type) => {
  if (segments.length === 0) throw new TypeError("address: the empty term has no address");
  const leaf = segments[segments.length - 1] ;
  const prefix = root.replace(/\/+$/, "");
  const suffix = [...segments, `${leaf}.${typeOf(type)}`].join("/");
  return prefix ? `${prefix}/${suffix}` : `${root.startsWith("/") ? "/" : ""}${suffix}`;
};

/** The typed filepath for a term under a root. */
export function address(root, term, type) {
  return addressOfSegments(root, segmentsOf(term).map(sanitizeSegment), type);
}

/** The address of a term's append-only log under a root (the `jsonl` type). */
export const logPath = (root, term) => address(root, term, "jsonl");

const termSegmentsOfPath = (root, path) => {
  const base = root.replace(/\/+$/, "");
  const prefix = base ? `${base}/` : (root.startsWith("/") ? "/" : "");
  if (!path.startsWith(prefix)) throw new TypeError("termOf: path is outside the root");
  const parts = path.slice(prefix.length).split("/");
  const file = parts.pop();
  const leaf = parts.at(-1);
  if (!leaf || !file?.startsWith(`${leaf}.`) || file.length === leaf.length + 1) throw new TypeError("termOf: path is not a typed term address");
  return parts.map(desanitizeSegment);
};

/** The slash-separated term recovered from a filepath under a root. */
export function termOf(root, path) {
  return termSegmentsOfPath(root, path).join("/");
}

/** The typed filepath for a term given as already-split parts. */
export function addressNested(root, parts, type) {
  const list = Array.isArray(parts) ? parts : [parts];
  return addressOfSegments(root, list.map((part) => sanitizeSegment(termKey(part))), type);
}

/** The term parts recovered from a filepath under a root (unjoined). */
export function termOfNested(root, path) {
  return termSegmentsOfPath(root, path);
}

/** A slash-separated term built from a namespace and optional parts. */
export function composeTerm(namespace, parts = []) {
  const list = Array.isArray(parts) ? parts : [parts];
  return [sanitizeSegment(termKey(namespace)), ...list.map((part) => sanitizeSegment(termKey(part)))].join("/");
}

/** The frozen decomposition of a slash-separated term into namespace and parts. */
export function decomposeTerm(term) {
  const atoms = term.split("/").filter(Boolean);
  if (atoms.length === 0) return Object.freeze({ namespace: "", parts: Object.freeze([]) });
  return Object.freeze({
    namespace: desanitizeSegment(atoms[0] ),
    parts: Object.freeze(atoms.slice(1).map(desanitizeSegment)),
  });
}

/** The namespace of a slash-separated term: its first segment desanitized. */
export function namespaceOf(term) {
  const head = term.split("/").filter(Boolean)[0];
  return head === undefined ? "" : desanitizeSegment(head);
}

/** Whether a term belongs to a namespace (its first segment is that namespace). */
export function withinNamespace(term, namespace) {
  const head = term.split("/").filter(Boolean)[0];
  return head !== undefined && head === sanitizeSegment(termKey(namespace));
}

