import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/encode-json-byte-carrier";

const MAXIMUM_BYTES = 65536;
const UTF8_MEDIA_TYPE = "text/plain;charset=utf-8";
const encoder = new TextEncoder();

function request(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype || keys.some(key => !Object.hasOwn(body, key)) || Object.keys(body).some(key => !keys.includes(key))) throw new TypeError(`request requires exactly ${keys.join(", ")}`);
}

function textBytes(text) {
  if (typeof text !== "string" || !text.isWellFormed()) throw new TypeError("text must be a Unicode scalar string; lone surrogates are refused");
  if (text.length > MAXIMUM_BYTES) throw new RangeError(`text exceeds ${MAXIMUM_BYTES} UTF-8 bytes`);
  const bytes = encoder.encode(text);
  if (bytes.length > MAXIMUM_BYTES) throw new RangeError(`text exceeds ${MAXIMUM_BYTES} UTF-8 bytes`);
  return bytes;
}

/** Exact UTF-8; no replacement, normalization, newline conversion or BOM insertion. */
export function encodeUtf8Text(body) {
  request(body, ["text"]);
  const bytes = textBytes(body.text);
  return { carrier: encodeJsonByteCarrier({ bytes: Array.from(bytes), mediaType: UTF8_MEDIA_TYPE }, { maximumBytes: MAXIMUM_BYTES }), byteLength: bytes.length };
}

/** Fatal native decoding preserves a leading BOM as U+FEFF instead of stripping it. */
export function decodeUtf8Text(body) {
  request(body, ["carrier"]);
  if (typeof body.carrier?.contentBase64 === "string" && body.carrier.contentBase64.length > 4 * Math.ceil(MAXIMUM_BYTES / 3)) throw new RangeError(`carrier exceeds ${MAXIMUM_BYTES} UTF-8 bytes`);
  const { bytes } = decodeJsonByteCarrier({ carrier: body.carrier, expectedMediaType: UTF8_MEDIA_TYPE }, { maximumBytes: MAXIMUM_BYTES });
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Uint8Array.from(bytes));
  return { text, byteLength: bytes.length };
}

/** Caller-selected native Unicode normalization; compatibility forms may alter meaning. */
export function normalizeUnicodeText(body) {
  request(body, ["text", "form"]);
  if (!["NFC", "NFD", "NFKC", "NFKD"].includes(body.form)) throw new TypeError("form must be NFC, NFD, NFKC or NFKD");
  const input = textBytes(body.text);
  const text = body.text.normalize(body.form);
  const output = textBytes(text);
  return { text, form: body.form, changed: text !== body.text, inputBytes: input.length, outputBytes: output.length };
}
