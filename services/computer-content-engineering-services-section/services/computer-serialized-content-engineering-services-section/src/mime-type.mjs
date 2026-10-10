import { MIMEType } from "whatwg-mimetype";

const MAXIMUM_BYTES = 4096;
const encoder = new TextEncoder();

/** Native essence for existing header consumers; null means unparseable. */
export function mimeTypeEssence(value) {
  return typeof value === "string" ? MIMEType.parse(value)?.essence ?? null : null;
}

function request(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype || fields.some(name => !Object.hasOwn(body, name)) || Object.keys(body).some(name => !fields.includes(name))) throw new TypeError(`request requires exactly ${fields.join(", ")}`);
}
function text(value, name, maximum = MAXIMUM_BYTES) {
  if (typeof value !== "string" || !value.isWellFormed()) throw new TypeError(`${name} must be scalar text`);
  if (encoder.encode(value).length > maximum) throw new RangeError(`${name} exceeds ${maximum} UTF-8 bytes`);
  return value;
}
function representation(mime) {
  const serialized = mime.toString();
  text(serialized, "serialized MIME type");
  if (mime.parameters.size > 32) throw new RangeError("MIME type exceeds 32 parameters");
  return { type: mime.type, subtype: mime.subtype, essence: mime.essence, parameters: Array.from(mime.parameters, ([name, value]) => ({ name, value })), serialized };
}

/** WHATWG parsing is forgiving: first duplicate wins, bad parameters are skipped. */
export function parseMimeType(body) {
  request(body, ["mediaType"]);
  const mime = MIMEType.parse(text(body.mediaType, "mediaType"));
  if (!mime) throw new TypeError("mediaType is not parseable by the WHATWG MIME algorithm");
  return representation(mime);
}

/** Construct a MIME value without interpolating unvalidated tokens into a header. */
export function serializeMimeType(body) {
  request(body, ["type", "subtype", "parameters"]);
  text(body.type, "type"); text(body.subtype, "subtype");
  if (!Array.isArray(body.parameters) || body.parameters.length > 32) throw new TypeError("parameters must be an ordered array of at most 32 name/value pairs");
  const mime = new MIMEType("application/octet-stream");
  try {
    mime.type = body.type; mime.subtype = body.subtype;
    for (const parameter of body.parameters) {
      request(parameter, ["name", "value"]);
      text(parameter.name, "parameter name"); text(parameter.value, "parameter value");
      if (!parameter.name.length) throw new TypeError("parameter name must be nonempty");
      if (mime.parameters.has(parameter.name)) throw new TypeError("duplicate parameter names are refused instead of replacing an earlier value");
      mime.parameters.set(parameter.name, parameter.value);
    }
  } catch (cause) {
    if (cause instanceof TypeError || cause instanceof RangeError) throw cause;
    throw new TypeError(`invalid MIME type component: ${String(cause.message ?? cause).slice(0, 512)}`, { cause });
  }
  return representation(mime);
}
