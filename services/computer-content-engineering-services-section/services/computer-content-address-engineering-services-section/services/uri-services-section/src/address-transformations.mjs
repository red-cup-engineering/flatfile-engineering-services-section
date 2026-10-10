/** Pure bounded address representations; native URL/form algorithms, exact NI bytes. */
import { canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical-json";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";
import { makeNiUri, isNiUri, niWellKnownPath } from "./ni-uri.mjs";

const LIMIT = 65536;
const envelope = Object.freeze({...JSON_RESOURCE_ENVELOPE,maxSourceBytes:LIMIT,maxCanonicalBytes:LIMIT,maxNodes:8192,maxArrayLength:4096});
function request(body, required, optional = []) {
  if (!body || typeof body !== "object" || Array.isArray(body) || required.some(k => !Object.hasOwn(body,k)) || Object.keys(body).some(k => !required.includes(k) && !optional.includes(k))) throw new TypeError(`request requires ${required.join(", ")}`);
  return body;
}
function text(value, field) {
  if (typeof value !== "string" || !value.isWellFormed()) throw new TypeError(`${field} must be well-formed Unicode text`);
  if (new TextEncoder().encode(value).byteLength > LIMIT) throw new RangeError(`${field} exceeds ${LIMIT} bytes`);
  return value;
}
function result(value) { return canonicalizeJson(value,envelope).value; }
export function normalizeUrl(body) {
  request(body,["url"],["base"]);
  canonicalizeJson(body,envelope);
  const input = text(body.url,"url");
  const base = Object.hasOwn(body,"base") ? text(body.base,"base") : undefined;
  const url = new URL(input,base);
  return result(Object.fromEntries(["href","origin","protocol","username","password","host","hostname","port","pathname","search","hash"].map(key => [key,url[key]])));
}
export function formToJson(body) {
  request(body,["text"]);
  const input = text(body.text,"text");
  // This endpoint is the loss-refusing UTF-8 profile: native form parsing
  // otherwise replaces malformed UTF-8 with U+FFFD or leaves broken escapes.
  try {
    for (const entry of input.split("&")) {
      const separator = entry.indexOf("=");
      const fields = separator < 0 ? [entry] : [entry.slice(0,separator),entry.slice(separator+1)];
      for (const field of fields) decodeURIComponent(field.replaceAll("+"," "));
    }
  } catch (cause) {
    if (!(cause instanceof URIError)) throw cause;
    throw new TypeError("form contains malformed percent escapes or UTF-8");
  }
  const pairs = Array.from(new URLSearchParams(input));
  if (pairs.length > 2048) throw new RangeError("form exceeds 2048 ordered pairs");
  return result({pairs});
}
export function jsonToForm(body) {
  request(body,["pairs"]);
  canonicalizeJson(body,envelope);
  if (!Array.isArray(body.pairs) || body.pairs.length > 2048 || body.pairs.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(value => typeof value !== "string" || !value.isWellFormed()))) throw new TypeError("pairs must contain at most 2048 ordered string pairs");
  return {text:text(new URLSearchParams(body.pairs).toString(),"form output")};
}
function content(body, verification = false) {
  request(body,verification ? ["carrier","uri"] : ["carrier"]);
  return Uint8Array.from(decodeJsonByteCarrier({carrier:body.carrier},{maximumBytes:LIMIT}).bytes);
}
export function nameContent(body) {
  const bytes = content(body);
  const uri = makeNiUri(bytes);
  return {uri,wellKnownPath:niWellKnownPath(uri),byteLength:bytes.length};
}
export function verifyContentName(body) {
  const bytes = content(body,true);
  if (!isNiUri(body.uri)) throw new TypeError("uri must be a canonical authority-free sha-256 NI name");
  const computedUri = makeNiUri(bytes);
  return {matches:computedUri===body.uri,uri:body.uri,computedUri,byteLength:bytes.length};
}
