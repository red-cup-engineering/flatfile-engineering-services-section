import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/encode-json-byte-carrier";
import { inflateRawSync } from "node:zlib";

const MAXIMUM_BYTES = 65536;
const mediaTypes = { gzip: "application/gzip", deflate: "application/zlib", "deflate-raw": "application/octet-stream" };

function mediaType(value) {
  if (typeof value !== "string" || !value.isWellFormed() || value.length === 0 || value.length > 256 || value.trim() !== value) throw new TypeError("mediaType must be nonempty, trimmed, well-formed text up to 256 characters");
  return value;
}

function request(body, decompress) {
  const allowed = decompress ? ["format", "carrier", "decodedMediaType"] : ["format", "carrier"];
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.hasOwn(body, "format") || !Object.hasOwn(body, "carrier") || Object.keys(body).some(key => !allowed.includes(key))) throw new TypeError("request requires format and carrier");
  if (typeof body.format !== "string" || !Object.hasOwn(mediaTypes, body.format)) throw new TypeError("format must be gzip, deflate (zlib), or deflate-raw");
  mediaType(body.carrier?.mediaType);
  if (typeof body.carrier.contentBase64 === "string" && body.carrier.contentBase64.length > 4 * Math.ceil(MAXIMUM_BYTES / 3)) throw new RangeError(`input content exceeds ${MAXIMUM_BYTES} bytes`);
  const decodedMediaType = mediaType(decompress ? body.decodedMediaType ?? "application/octet-stream" : body.carrier.mediaType);
  const { bytes } = decodeJsonByteCarrier({ carrier: body.carrier }, { maximumBytes: MAXIMUM_BYTES });
  return { bytes: Uint8Array.from(bytes), decodedMediaType };
}

async function transform(bytes, format, decompress) {
  const codec = decompress ? new DecompressionStream(format) : new CompressionStream(format);
  const reader = new Blob([bytes]).stream().pipeThrough(codec).getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAXIMUM_BYTES) throw new RangeError(`transformed content exceeds ${MAXIMUM_BYTES} bytes`);
      chunks.push(value);
    }
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    return output;
  } catch (cause) {
    await reader.cancel(cause).catch(() => {});
    if (cause instanceof RangeError) throw cause;
    throw new TypeError(`invalid ${format} compressed content`, { cause });
  } finally {
    reader.releaseLock();
  }
}

/**
 * The length of the one stream the input begins with, once the native decoder has accepted it. The single-stream
 * profile refuses anything after it. The native zlib decoder refuses trailing input itself; the native raw-deflate
 * decoder stops at the final block and ignores what follows, and the native gzip decoder goes on into a further
 * member, so for these the stream is measured: the raw deflate by the bytes inflate consumed, the gzip member by its
 * header (RFC 1952: ten bytes, then the optional extra field, name, comment and header CRC), deflate body and trailer.
 */
function streamLength(bytes, format) {
  const deflated = (from) => inflateRawSync(bytes.subarray(from), { info: true, maxOutputLength: MAXIMUM_BYTES }).engine.bytesWritten;
  if (format === "deflate-raw") return deflated(0);
  const flags = bytes[3];
  let at = 10;
  if (flags & 4) at += 2 + (bytes[at] | (bytes[at + 1] << 8));
  if (flags & 8) while (bytes[at++] !== 0);
  if (flags & 16) while (bytes[at++] !== 0);
  if (flags & 2) at += 2;
  return at + deflated(at) + 8;
}

/** Lossless native byte compression. Compressed bytes are not a canonical encoding. */
export async function compressContent(body) {
  const { bytes, decodedMediaType } = request(body, false);
  const output = await transform(bytes, body.format, false);
  return { format: body.format, carrier: encodeJsonByteCarrier({ bytes: Array.from(output), mediaType: mediaTypes[body.format] }, { maximumBytes: MAXIMUM_BYTES }), decodedMediaType, inputBytes: bytes.length, outputBytes: output.length };
}

/** Native stream validation completes before returning any decoded content. */
export async function decompressContent(body) {
  const { bytes, decodedMediaType } = request(body, true);
  const output = await transform(bytes, body.format, true);
  if (body.format !== "deflate" && streamLength(bytes, body.format) !== bytes.length) {
    throw new TypeError(`invalid ${body.format} compressed content: input continues after the end of the stream`);
  }
  return { format: body.format, carrier: encodeJsonByteCarrier({ bytes: Array.from(output), mediaType: decodedMediaType }, { maximumBytes: MAXIMUM_BYTES }), inputBytes: bytes.length, outputBytes: output.length };
}
