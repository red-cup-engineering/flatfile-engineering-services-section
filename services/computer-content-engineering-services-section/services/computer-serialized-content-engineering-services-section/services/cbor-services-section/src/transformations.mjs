/** Bounded RFC 8949 conversions on the caller's exact JSON or CBOR carrier. */
import { decode, SequenceEvents } from "cbor2/decoder";
import { diagnose } from "cbor2/diagnostic";
import { encodeCanonical } from "./cbor.mjs";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";

const MAX_BYTES = 65536, MAX_DEPTH = 64, MAX_NODES = 8192;
const OPTIONS = Object.freeze({ maxDepth: MAX_DEPTH, ignoreGlobalTags: true, preferMap: true });
function request(body, field) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.hasOwn(body, field) || Object.keys(body).some(key => key !== field)) throw new TypeError(`request requires only ${field}`);
}
function native(action) {
  try { return action(); } catch (cause) { if (cause instanceof TypeError || cause instanceof RangeError) throw cause; throw new TypeError(cause.message, { cause }); }
}
function jsonValue(value) {
  const stack = [{ value, depth: 0 }], ancestors = new Set(); let nodes = 0;
  while (stack.length) {
    const item = stack.pop();
    if (item.exit) { ancestors.delete(item.value); continue; }
    if (++nodes > MAX_NODES || item.depth > MAX_DEPTH) throw new RangeError("JSON exceeds 8192 nodes or depth 64");
    const member = item.value;
    if (member === null || typeof member === "boolean") continue;
    if (typeof member === "number") {
      if (!Number.isFinite(member) || Object.is(member, -0)) throw new TypeError("ordinary JSON cannot preserve nonfinite numbers or negative zero");
      continue;
    }
    if (typeof member === "string") { if (!member.isWellFormed()) throw new TypeError("JSON strings must have paired Unicode surrogates"); continue; }
    if (!Array.isArray(member) && !(member && Object.getPrototypeOf(member) === Object.prototype)) throw new TypeError("CBOR value has no lossless ordinary JSON representation");
    if (ancestors.has(member)) throw new TypeError("cyclic JSON value");
    ancestors.add(member); stack.push({ exit: true, value: member });
    for (const [key, child] of Object.entries(member)) {
      if (!key.isWellFormed()) throw new TypeError("JSON keys must have paired Unicode surrogates");
      stack.push({ value: child, depth: item.depth + 1 });
    }
  }
  const byteLength = Buffer.byteLength(JSON.stringify(value));
  if (byteLength > MAX_BYTES) throw new RangeError("JSON representation exceeds 65536 UTF-8 bytes");
  return byteLength;
}
function content(body) {
  request(body, "carrier");
  const label = body.carrier?.mediaType;
  if (label !== "application/cbor") throw new TypeError("carrier.mediaType must be application/cbor");
  const bytes = Uint8Array.from(decodeJsonByteCarrier({ carrier: body.carrier }, { maximumBytes: MAX_BYTES }).bytes);
  return native(() => {
    let count = 0;
    for (const event of new SequenceEvents(bytes, OPTIONS)) {
      if (++count > MAX_NODES) throw new RangeError("CBOR exceeds 8192 parsing events");
    }
    // Exactly one complete item; no trailing item or truncated structure.
    decode(bytes, OPTIONS);
    return bytes;
  });
}
function jsonMap(pairs) {
  const keys = new Set();
  for (const [key] of pairs) {
    if (typeof key !== "string" || keys.has(key)) throw new TypeError("JSON requires unique text-string map keys");
    keys.add(key);
  }
  return Object.fromEntries(pairs.map(([key, value]) => [key, value]));
}
export function encodeJsonCbor(body) {
  request(body, "value");
  const jsonByteLength = jsonValue(body.value), bytes = encodeCanonical(body.value);
  if (bytes.length > MAX_BYTES) throw new RangeError("CBOR representation exceeds 65536 bytes");
  const carrier = { mediaType: "application/cbor", contentBase64: bytes.toString("base64") };
  content({ carrier }); // The emitted representation is admitted by the readers too.
  return { carrier, byteLength: bytes.length, jsonByteLength };
}
export function decodeCborJson(body) {
  const bytes = content(body);
  const value = native(() => decode(bytes, { ...OPTIONS, preferMap: false, createObject: jsonMap }));
  const jsonByteLength = jsonValue(value);
  return { value, byteLength: bytes.length, jsonByteLength };
}
export function diagnoseCbor(body) {
  const bytes = content(body), diagnostic = native(() => diagnose(bytes, OPTIONS));
  if (Buffer.byteLength(diagnostic) > 524288) throw new RangeError("diagnostic output exceeds 524288 UTF-8 bytes");
  return { diagnostic, byteLength: bytes.length };
}
/** Encoding-level check only: tag meaning and application validity are separate. */
export function checkDeterministicCbor(body) {
  const bytes = content(body);
  try {
    decode(bytes, { ...OPTIONS, cde: true, rejectLongFloats: true, rejectDuplicateKeys: true });
    return { deterministic: true, byteLength: bytes.length, profile: "RFC8949-core-deterministic", reason: null };
  } catch (cause) {
    return { deterministic: false, byteLength: bytes.length, profile: "RFC8949-core-deterministic", reason: cause.message.slice(0,1024) };
  }
}
