/** Loss-refusing JSON carrier for native RFC 9651 fields, not legacy HTTP field grammars. */
import * as sf from "./structured-fields.mjs";
import { canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical-json";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";

const envelope = { ...JSON_RESOURCE_ENVELOPE, maxCanonicalBytes: 65536, maxSourceBytes: 65536, maxNodes: 8192 };
const kinds = ["item", "list", "dictionary"];
const parse = { item: sf.parseItem, list: sf.parseList, dictionary: sf.parseDictionary };
const serialize = { item: sf.serializeItem, list: sf.serializeList, dictionary: sf.serializeDictionary };
function request(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body) || fields.some(k => !Object.hasOwn(body, k)) || Object.keys(body).some(k => !fields.includes(k))) throw new TypeError(`request requires exactly ${fields.join(", ")}`);
  canonicalizeJson(body, envelope);
  if (!kinds.includes(body.kind)) throw new TypeError("kind must be item, list or dictionary");
}
function field(text) {
  if (typeof text !== "string" || !text.isWellFormed() || new TextEncoder().encode(text).length > 16384) throw new TypeError("field text must be well-formed text up to 16384 bytes");
  // Field values are ASCII on the wire; Unicode is represented by Display String.
  if (/[^\x20-\x7e\t]/u.test(text)) throw new TypeError("field text must contain only printable ASCII and horizontal tabs");
  return text;
}
const checked = value => canonicalizeJson(value, envelope).value;
function encodeBare(value) {
  return value.type === "byteSequence" ? { type: value.type, value: Buffer.from(value.value).toString("base64") } : { type: value.type, value: value.value };
}
const encodeParameters = parameters => Array.from(parameters, ([key, value]) => [key, encodeBare(value)]);
function encodeEntry(entry) {
  return { type: entry.type, value: entry.type === "innerList" ? entry.value.map(encodeEntry) : encodeBare(entry.value), parameters: encodeParameters(entry.parameters) };
}
function encode(kind, value) {
  return kind === "dictionary" ? Array.from(value, ([key, entry]) => [key, encodeEntry(entry)]) : kind === "list" ? value.map(encodeEntry) : encodeEntry(value);
}
function record(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value) || fields.some(k => !Object.hasOwn(value, k)) || Object.keys(value).some(k => !fields.includes(k))) throw new TypeError(`value requires exactly ${fields.join(", ")}`);
}
function decodeBare(value) {
  record(value, ["type", "value"]);
  const { type, value: v } = value;
  switch (type) {
    case "integer": case "date": if (!Number.isSafeInteger(v)) throw new TypeError(`${type} requires integer seconds/value`); return sf[type](v);
    case "decimal": if (typeof v !== "number" || !Number.isFinite(v) || Number(v.toFixed(3)) !== v) throw new TypeError("decimal must have at most three fractional digits; rounding is refused"); return sf.decimal(v);
    case "string": case "token": case "displayString": if (typeof v !== "string") throw new TypeError(`${type} requires text`); return sf[type](v);
    case "boolean": if (typeof v !== "boolean") throw new TypeError("boolean requires true or false"); return sf.boolean(v);
    case "byteSequence": return sf.byteSequence(Uint8Array.from(decodeJsonByteCarrier({ carrier: { mediaType: "application/octet-stream", contentBase64: v }, maximumBytes: 16384 }).bytes));
    default: throw new TypeError("unknown structured-field bare type");
  }
}
function pairs(value, transform) {
  if (!Array.isArray(value) || value.length > 2048) throw new TypeError("ordered pairs must be an array of at most 2048 entries");
  const seen = new Set();
  return value.map(pair => {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || seen.has(pair[0])) throw new TypeError("ordered pairs require distinct string keys and exactly two elements");
    seen.add(pair[0]); return [pair[0], transform(pair[1])];
  });
}
function decodeEntry(entry, allowInner = true) {
  record(entry, ["type", "value", "parameters"]);
  const parameters = sf.parameters(pairs(entry.parameters, decodeBare));
  if (entry.type === "item") return sf.itemConstruct(decodeBare(entry.value), parameters);
  if (entry.type !== "innerList" || !allowInner || !Array.isArray(entry.value) || entry.value.length > 2048) throw new TypeError("entry must be an item or one bounded inner list");
  return sf.innerList(entry.value.map(item => decodeEntry(item, false)), parameters);
}
function decode(kind, value) {
  if (kind === "dictionary") return new Map(pairs(value, decodeEntry));
  if (kind === "item") return decodeEntry(value, false);
  if (!Array.isArray(value) || value.length > 2048) throw new TypeError("list must be an array of at most 2048 entries");
  return value.map(entry => decodeEntry(entry));
}
function read(body) {
  request(body, ["kind", "text"]);
  try { return checked({ kind: body.kind, value: encode(body.kind, parse[body.kind](field(body.text))) }); }
  catch (error) { if (error instanceof sf.ParseError) throw new TypeError(error.message); throw error; }
}
export function fieldToJson(body) { return read(body); }
export function jsonToField(body) {
  request(body, ["kind", "value"]);
  try { return checked({ text: field(serialize[body.kind](decode(body.kind, body.value))) }); }
  catch (error) { if (error instanceof sf.SerializeError) throw new TypeError(error.message); throw error; }
}
export function validateField(body) {
  request(body, ["kind", "text"]); field(body.text);
  try { const result = read(body); return { valid: true, kind: body.kind, canonical: jsonToField(result).text }; }
  catch (error) { if (error instanceof TypeError || error instanceof sf.ParseError || error instanceof RangeError) return { valid: false, kind: body.kind, message: error.message }; throw error; }
}
