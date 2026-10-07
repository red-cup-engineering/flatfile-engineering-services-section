const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const SAFE_BYTE = /^[A-Za-z0-9._-]$/u;

const escapedByte = (byte) => `~${byte.toString(16).padStart(2, "0")}`;

/** Reversible POSIX segment encoding. Only ASCII [A-Za-z0-9._-] passes raw. */
export function sanitizeSegment(value) {
  if (typeof value !== "string" || !value.isWellFormed()) throw new TypeError("path segments require well-formed Unicode strings");
  if (value === "") return "~e";
  if (value === ".") return "~2e";
  if (value === "..") return "~2e~2e";
  let out = "";
  let first = true;
  for (const character of value) {
    if (character === "~" || (first && character === ".") || !SAFE_BYTE.test(character)) {
      for (const byte of encoder.encode(character)) out += escapedByte(byte);
    } else {
      out += character;
    }
    first = false;
  }
  return out;
}

export function desanitizeSegment(value) {
  if (value === "~e") return "";
  if (value === "" || value === "." || value === ".." || value.startsWith(".")) {
    throw new TypeError("path segment is empty, hidden, or traversal-bearing");
  }
  const bytes = [];
  for (let index = 0; index < value.length;) {
    const character = value[index] ;
    if (character === "~") {
      const hex = value.slice(index + 1, index + 3);
      if (!/^[0-9a-f]{2}$/u.test(hex)) throw new TypeError("path segment has an invalid escape");
      bytes.push(Number.parseInt(hex, 16));
      index += 3;
      continue;
    }
    if (!SAFE_BYTE.test(character)) throw new TypeError("path segment contains a noncanonical raw byte");
    bytes.push(character.charCodeAt(0));
    index += 1;
  }
  let decoded        ;
  try {
    decoded = decoder.decode(Uint8Array.from(bytes));
  } catch {
    throw new TypeError("path segment is not valid UTF-8");
  }
  if (sanitizeSegment(decoded) !== value) throw new TypeError("path segment is not canonical");
  return decoded;
}

