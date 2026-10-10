import { base16, base32, base58, base64urlnopad } from "@scure/base";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/encode-json-byte-carrier";

const formats = Object.freeze({
  base16: { codec: base16, maximumBytes: 65536, maximumText: 131072 },
  base32: { codec: base32, maximumBytes: 65536, maximumText: 104864 },
  base58btc: { codec: base58, maximumBytes: 1024, maximumText: 1400 },
  base64url: { codec: base64urlnopad, maximumBytes: 65536, maximumText: 87382 },
});

function request(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype || keys.some(key => !Object.hasOwn(body, key)) || Object.keys(body).some(key => !keys.includes(key))) throw new TypeError(`request requires exactly ${keys.join(", ")}`);
}
function mediaType(value) {
  if (typeof value !== "string" || !value.isWellFormed() || value.length === 0 || value.length > 256 || value.trim() !== value) throw new TypeError("mediaType must be nonempty trimmed scalar text up to 256 characters");
  return value;
}

function encodeContent(body, encoding) {
  request(body, ["carrier"]);
  const { codec, maximumBytes } = formats[encoding];
  mediaType(body.carrier?.mediaType);
  if (typeof body.carrier.contentBase64 === "string" && body.carrier.contentBase64.length > 4 * Math.ceil(maximumBytes / 3)) throw new RangeError(`carrier exceeds ${maximumBytes} bytes`);
  const { bytes } = decodeJsonByteCarrier({ carrier: body.carrier }, { maximumBytes });
  return { encoding, text: codec.encode(Uint8Array.from(bytes)), mediaType: body.carrier.mediaType, byteLength: bytes.length };
}
function decodeContent(body, encoding) {
  request(body, ["text", "mediaType"]);
  const { codec, maximumBytes, maximumText } = formats[encoding];
  mediaType(body.mediaType);
  if (typeof body.text !== "string") throw new TypeError("text must be a string");
  if (body.text.length > maximumText) throw new RangeError(`encoded text exceeds ${maximumText} characters`);
  let bytes;
  try { bytes = codec.decode(body.text); }
  catch (cause) { throw new TypeError(`invalid ${encoding} text: ${String(cause.message ?? cause).slice(0, 512)}`, { cause }); }
  if (bytes.length > maximumBytes) throw new RangeError(`decoded content exceeds ${maximumBytes} bytes`);
  if (codec.encode(bytes) !== body.text) throw new TypeError(`text must be canonical ${encoding}`);
  return { encoding, carrier: encodeJsonByteCarrier({ bytes: Array.from(bytes), mediaType: body.mediaType }, { maximumBytes }), byteLength: bytes.length };
}

export const encodeBase16Content = body => encodeContent(body, "base16");
export const decodeBase16Content = body => decodeContent(body, "base16");
export const encodeBase32Content = body => encodeContent(body, "base32");
export const decodeBase32Content = body => decodeContent(body, "base32");
export const encodeBase58Content = body => encodeContent(body, "base58btc");
export const decodeBase58Content = body => decodeContent(body, "base58btc");
export const encodeBase64urlContent = body => encodeContent(body, "base64url");
export const decodeBase64urlContent = body => decodeContent(body, "base64url");
