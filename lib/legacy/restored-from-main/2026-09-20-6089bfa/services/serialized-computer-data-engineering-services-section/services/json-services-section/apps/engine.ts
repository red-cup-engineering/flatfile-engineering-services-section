/** The JSON and JSON Lines representation boundary. No I/O lives here. */
export type Json = null | boolean | number | string | readonly Json[] | JsonRecord;
export interface JsonRecord extends Readonly<Record<string, Json>> {}

const plainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

export const isJson = (value: unknown): value is Json => {
  const ancestors = new Set<object>();
  const visit = (candidate: unknown): candidate is Json => {
    if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") return true;
    if (typeof candidate === "number") return Number.isFinite(candidate);
    if (!Array.isArray(candidate) && !plainRecord(candidate)) return false;
    if (ancestors.has(candidate)) return false;
    ancestors.add(candidate);
    const valid = Array.isArray(candidate)
      ? Array.from({ length: candidate.length }, (_, index) => index in candidate && visit(candidate[index])).every(Boolean)
      : Object.values(candidate).every(visit);
    ancestors.delete(candidate);
    return valid;
  };
  return visit(value);
};

export const json = (value: unknown, context = "JSON value"): Json => {
  if (!isJson(value)) throw new TypeError(`${context} is not JSON`);
  return value;
};

/** RFC 8785-style deterministic JSON for admitted values. */
export const canonicalJson = (value: Json): string => {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as JsonRecord;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key]!)}`).join(",")}}`;
};

export const encodeJson = (value: unknown): string => canonicalJson(json(value));

export const decodeJson = (text: string): Json => {
  try { return json(JSON.parse(text), "JSON document"); }
  catch (error) { throw new TypeError(error instanceof Error ? error.message : "invalid JSON document"); }
};

/** Decode independent nonblank JSON documents, preserving their source line. */
export const decodeJsonLines = (text: string): readonly Json[] => text.split("\n").reduce<readonly Json[]>((values, source, index) => {
  const line = source.trim();
  if (line === "") return values;
  try { return [...values, decodeJson(line)]; }
  catch (error) { throw new TypeError(`JSON Lines line ${index + 1}: ${error instanceof Error ? error.message : "invalid JSON"}`); }
}, []);

/** Encode values as one canonical JSON document per line, with a final newline. */
export const encodeJsonLines = (values: readonly unknown[]): string =>
  values.length === 0 ? "" : `${values.map(encodeJson).join("\n")}\n`;
