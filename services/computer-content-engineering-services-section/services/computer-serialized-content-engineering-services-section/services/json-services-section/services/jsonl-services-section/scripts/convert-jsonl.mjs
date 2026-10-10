import { parseLines } from "./parse-jsonl.mjs";
import { serializeLines } from "./serialize-jsonl.mjs";
import { canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical-json";

const envelope = Object.freeze({ ...JSON_RESOURCE_ENVELOPE, maxSourceBytes: 65536, maxCanonicalBytes: 65536, maxNodes: 8192, maxArrayLength: 4096 });
export function jsonlToJson(body) {
  if (!body || Object.keys(body).join() !== "text" || typeof body.text !== "string") throw new TypeError("request requires only text");
  if (new TextEncoder().encode(body.text).length > 65536) throw new TypeError("JSON Lines is limited to 65536 UTF-8 bytes");
  const values = parseLines(body.text);
  canonicalizeJson(values, envelope);
  return { values, count: values.length };
}
export function jsonToJsonl(body) {
  if (!body || Object.keys(body).join() !== "values" || !Array.isArray(body.values)) throw new TypeError("request requires only values as an array");
  canonicalizeJson(body.values, envelope);
  const text = serializeLines(body.values);
  if (new TextEncoder().encode(text).length > 65536) throw new TypeError("JSON Lines output exceeds 65536 UTF-8 bytes");
  return { text, mediaType: "application/x-ndjson", count: body.values.length };
}
