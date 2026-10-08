/** JSON byte carriers: bytes as one media-typed Base64 object. Runtime module with no Node
 * imports (Base64 is btoa/atob), so any layer, browser bundles included, may import it; the
 * scripts of the same names are thin command-line callers of these functions. */

const base64Of = (bytes) => {
  let text = "";
  for (let index = 0; index < bytes.length; index += 0x2000) text += String.fromCharCode.apply(null, bytes.slice(index, index + 0x2000));
  return btoa(text);
};

/** Encode a JSON byte-integer array as one media-typed Base64 carrier. */
export function encodeJsonByteCarrier({ bytes, mediaType } = {}, { maximumBytes = Number.MAX_SAFE_INTEGER } = {}) {
  if (
    !Array.isArray(bytes) ||
    bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    throw new TypeError("JSON byte carrier bytes must be byte integers");
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new TypeError("maximumBytes must be a nonnegative safe integer");
  if (bytes.length > maximumBytes) throw new RangeError(`JSON byte carrier exceeds ${maximumBytes} bytes`);
  if (
    typeof mediaType !== "string" ||
    mediaType.length === 0 ||
    mediaType.trim() !== mediaType
  )
    throw new TypeError(
      "JSON byte carrier mediaType must be nonempty trimmed text",
    );
  return Object.freeze({
    mediaType,
    contentBase64: base64Of(Uint8Array.from(bytes)),
  });
}

/** Decode one exact media-typed Base64 carrier into JSON byte integers. */
export function decodeJsonByteCarrier({
  carrier,
  expectedMediaType,
  maximumBytes = Number.MAX_SAFE_INTEGER,
} = {}, { maximumBytes: ownerMaximumBytes = Number.MAX_SAFE_INTEGER } = {}) {
  if (
    carrier === null ||
    typeof carrier !== "object" ||
    Array.isArray(carrier) ||
    Object.getPrototypeOf(carrier) !== Object.prototype
  )
    throw new TypeError("JSON byte carrier must be one plain object");
  const fields = Object.keys(carrier).sort();
  if (
    fields.length !== 2 ||
    fields[0] !== "contentBase64" ||
    fields[1] !== "mediaType"
  )
    throw new TypeError(
      "JSON byte carrier must contain exactly mediaType and contentBase64",
    );
  const { mediaType, contentBase64 } = carrier;
  if (
    typeof mediaType !== "string" ||
    mediaType.length === 0 ||
    mediaType.trim() !== mediaType
  )
    throw new TypeError(
      "JSON byte carrier mediaType must be nonempty trimmed text",
    );
  if (expectedMediaType !== undefined && mediaType !== expectedMediaType)
    throw new TypeError(
      `JSON byte carrier mediaType must be ${expectedMediaType}`,
    );
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
    throw new TypeError(
      "JSON byte carrier maximumBytes must be a nonnegative safe integer",
    );
  if (!Number.isSafeInteger(ownerMaximumBytes) || ownerMaximumBytes < 0) throw new TypeError("owner maximumBytes must be a nonnegative safe integer");
  maximumBytes = Math.min(maximumBytes, ownerMaximumBytes);
  if (
    typeof contentBase64 !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      contentBase64,
    )
  )
    throw new TypeError(
      "JSON byte carrier contentBase64 must be canonical Base64",
    );
  const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0));
  if (base64Of(bytes) !== contentBase64)
    throw new TypeError(
      "JSON byte carrier contentBase64 must reproduce canonical Base64",
    );
  if (bytes.length > maximumBytes)
    throw new RangeError(`JSON byte carrier exceeds ${maximumBytes} bytes`);
  return Object.freeze({ mediaType, bytes: Array.from(bytes) });
}
