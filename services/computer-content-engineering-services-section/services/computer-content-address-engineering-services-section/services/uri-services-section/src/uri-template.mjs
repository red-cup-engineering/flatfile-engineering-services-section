/** RFC 6570 level-4 URI references. No fetching, URL normalization or hidden variables. */
const encoder = new TextEncoder();
const LIMIT = 65536;
const specifier = /^((?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+(?:\.(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+)*)(?:(\*)|:([1-9][0-9]{0,3}))?$/u;
const unreserved = /^[A-Za-z0-9._~-]$/u;
const reserved = /^[:/?#[\]@!$&'()*+,;=]$/u;
const triplet = /^%[0-9A-Fa-f]{2}$/u;
const operators = Object.freeze({
  "": ["", ",", false, "", false], "+": ["", ",", false, "", true],
  "#": ["#", ",", false, "", true], ".": [".", ".", false, "", false],
  "/": ["/", "/", false, "", false], ";": [";", ";", true, "", false],
  "?": ["?", "&", true, "=", false], "&": ["&", "&", true, "=", false],
});

function text(value, field, max = LIMIT) {
  if (typeof value !== "string" || !value.isWellFormed()) throw new TypeError(`${field} must be well-formed Unicode text`);
  if (encoder.encode(value).length > max) throw new RangeError(`${field} exceeds ${max} UTF-8 bytes`);
  return value;
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function request(body, keys) {
  if (!record(body) || keys.some(key => !Object.hasOwn(body, key)) || Object.keys(body).some(key => !keys.includes(key))) throw new TypeError(`request requires ${keys.join(", ")}`);
}
function unicodeLiteral(cp) {
  if ((cp & 0xffff) >= 0xfffe) return false;
  return (cp >= 0xa0 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfdcf) ||
    (cp >= 0xfdf0 && cp <= 0xffef) || (cp >= 0x10000 && cp <= 0xdfffd) ||
    (cp >= 0xe1000 && cp <= 0x10fffd);
}
function encode(value, allowReserved) {
  let out = "";
  for (let i = 0; i < value.length;) {
    const c = String.fromCodePoint(value.codePointAt(i));
    if (allowReserved && c === "%" && triplet.test(value.slice(i, i + 3))) {
      out += value.slice(i, i + 3); i += 3;
    } else {
      out += unreserved.test(c) || (allowReserved && reserved.test(c)) ? c :
        encodeURIComponent(c).replace(/[!'()*]/gu, v => "%" + v.charCodeAt(0).toString(16).toUpperCase());
      i += c.length;
    }
  }
  return out;
}
function parse(template) {
  text(template, "template", 8192);
  const parts = []; let literal = "", specs = 0;
  for (let i = 0; i < template.length;) {
    const c = String.fromCodePoint(template.codePointAt(i));
    if (c === "{") {
      if (literal) { parts.push(literal); literal = ""; }
      const end = template.indexOf("}", i + 1);
      if (end < 0) throw new TypeError(`unclosed template expression at ${i}`);
      let expression = template.slice(i + 1, end), operator = "";
      if (Object.hasOwn(operators, expression[0])) { operator = expression[0]; expression = expression.slice(1); }
      const variables = expression.split(",").map(value => {
        const match = specifier.exec(value);
        if (!match) throw new TypeError(`invalid or unsupported template expression at ${i}`);
        if (++specs > 1024) throw new RangeError("template exceeds 1024 variable references");
        return { name: match[1], explode: Boolean(match[2]), prefix: match[3] === undefined ? null : Number(match[3]) };
      });
      parts.push({ operator, variables }); i = end + 1;
    } else if (c === "%" && triplet.test(template.slice(i, i + 3))) {
      literal += template.slice(i, i + 3); i += 3;
    } else {
      const cp = c.codePointAt(0);
      if (!(cp < 128 ? cp > 32 && cp < 127 && !/["%<>\\^`{|}]/u.test(c) : unicodeLiteral(cp))) throw new TypeError(`invalid template literal at ${i}`);
      literal += encode(c, true); i += c.length;
    }
  }
  if (literal) parts.push(literal);
  return parts;
}
function scalar(value) {
  if (value === null) return null;
  if (typeof value === "string") return text(value, "variable");
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return String(value);
  throw new TypeError("variables admit strings, finite JSON numbers, booleans, null, and flat lists/maps of those values");
}
function variables(input) {
  if (!record(input) || Object.keys(input).length > 256) throw new TypeError("variables must be an own-property map of at most 256 names");
  const result = Object.create(null); let nodes = 0, bytes = 0;
  const count = value => { if (++nodes > 8192) throw new RangeError("variables exceed 8192 scalar members"); const v = scalar(value); bytes += v === null ? 4 : encoder.encode(v).length; if (bytes > LIMIT) throw new RangeError("variables exceed 65536 UTF-8 value bytes"); return v; };
  for (const [name, value] of Object.entries(input)) {
    text(name, "variable name", 8192); bytes += encoder.encode(name).length;
    if (Array.isArray(value)) {
      if (value.length > 1024) throw new RangeError("variable list exceeds 1024 members");
      result[name] = value.map(count).filter(v => v !== null);
    } else if (record(value)) {
      if (Object.keys(value).length > 1024) throw new RangeError("variable map exceeds 1024 pairs");
      const pairs = [];
      for (const [key, item] of Object.entries(value)) { text(key, "map key"); bytes += encoder.encode(key).length; const v = count(item); if (v !== null) pairs.push([key, v]); }
      result[name] = { pairs };
    } else result[name] = count(value);
    if (bytes > LIMIT) throw new RangeError("variables exceed 65536 UTF-8 bytes");
  }
  return result;
}
// A prefix counts Unicode characters, including one complete UTF-8 character
// expressed as percent triplets. Preserve the source spelling and escape case.
function prefix(value, maximum) {
  let i = 0, n = 0;
  while (i < value.length && n++ < maximum) {
    if (triplet.test(value.slice(i, i + 3))) {
      const first = parseInt(value.slice(i + 1, i + 3), 16);
      const length = first < 0x80 ? 1 : first >= 0xc2 && first <= 0xdf ? 2 : first >= 0xe0 && first <= 0xef ? 3 : first >= 0xf0 && first <= 0xf4 ? 4 : 0;
      const source = value.slice(i, i + length * 3);
      if (length > 0 && /^(?:%[0-9A-Fa-f]{2})+$/u.test(source) && source.length === length * 3) {
        try { if ([...decodeURIComponent(source)].length === 1) { i += source.length; continue; } } catch { /* invalid UTF-8 triplets retain individual octets */ }
      }
      i += 3;
    } else i += String.fromCodePoint(value.codePointAt(i)).length;
  }
  return value.slice(0, i);
}

/** Bounded paid representation. Output is a URI reference, not fetched or authorized. */
export function expandUriTemplate(body) {
  request(body, ["template", "variables"]);
  const parts = parse(body.template), input = variables(body.variables);
  let uri = "", bytes = 0;
  const append = chunk => { bytes += encoder.encode(chunk).length; if (bytes > LIMIT) throw new RangeError("expanded URI exceeds 65536 UTF-8 bytes"); uri += chunk; };
  for (const part of parts) {
    if (typeof part === "string") { append(part); continue; }
    const [start, separator, named, empty, allowReserved] = operators[part.operator]; let first = true;
    const emit = value => { append(first ? start : separator); append(value); first = false; };
    const namedValue = (name, value) => named ? name + (value === "" ? empty : "=" + value) : value;
    for (const variable of part.variables) {
      if (!Object.hasOwn(input, variable.name) || input[variable.name] === null) continue;
      const value = input[variable.name], e = v => encode(v, allowReserved);
      if (typeof value === "string") { emit(namedValue(variable.name, e(variable.prefix === null ? value : prefix(value, variable.prefix)))); continue; }
      if (variable.prefix !== null) throw new TypeError("prefix modifiers require scalar values");
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        if (variable.explode) for (const item of value) emit(namedValue(variable.name, e(item)));
        else emit(namedValue(variable.name, value.map(e).join(",")));
      } else {
        if (value.pairs.length === 0) continue;
        if (variable.explode) for (const [key, item] of value.pairs) {
          const k = e(key), v = e(item); emit(k + (v === "" && !["?", "&"].includes(part.operator) ? "" : "=" + v));
        }
        else emit(namedValue(variable.name, value.pairs.flatMap(([k, v]) => [e(k), e(v)]).join(",")));
      }
    }
  }
  return { uri, byteLength: bytes };
}

/** Inspect the supported grammar and variables without expanding or contacting a target. */
export function inspectUriTemplate(body) {
  request(body, ["template"]);
  const parts = parse(body.template), references = parts.filter(p => typeof p !== "string").flatMap(p => p.variables.map(v => ({ operator: p.operator, ...v })));
  return { template: body.template, variables: [...new Set(references.map(v => v.name))], references };
}
