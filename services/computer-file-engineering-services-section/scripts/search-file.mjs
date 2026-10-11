import { readFileBytes } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";

function requirePath(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
}

function requireNeedle(needle) {
  if (!(needle instanceof Uint8Array)) throw new TypeError("needle must be a Uint8Array or Buffer");
  if (needle.byteLength === 0) throw new TypeError("needle must be nonempty");
}

function byteSpan({ byteOffset, byteLength }) {
  return Object.freeze({ type: "ByteSpan", byteOffset, byteLength });
}

/** Find every overlapping occurrence of needle within haystack, in ascending byte order. */
function findByteMatches(haystack, needle) {
  const matches = [];
  const lastStart = haystack.byteLength - needle.byteLength;
  for (let byteOffset = 0; byteOffset <= lastStart; byteOffset += 1) {
    let equal = true;
    for (let index = 0; index < needle.byteLength; index += 1) {
      if (haystack[byteOffset + index] !== needle[index]) {
        equal = false;
        break;
      }
    }
    if (equal) matches.push(byteSpan({ byteOffset, byteLength: needle.byteLength }));
  }
  return matches;
}

/** Search one file's byte carrier for every overlapping byte sequence match. */
export async function searchFile({ path, needle } = {}) {
  requirePath(path);
  requireNeedle(needle);
  const carrier = Object.freeze({ type: "FileByteCarrier", path });
  const evidence = findByteMatches(await readFileBytes(path), needle);
  return Object.freeze({
    type: "SearchEvidence",
    carrier,
    relation: evidence.length > 0 ? "contains" : "absent",
    evidence: Object.freeze(evidence),
  });
}

function decodeNeedle(encoding, value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${encoding} needle must be nonempty`);
  if (encoding === "hex") {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) throw new TypeError("--needle-hex must contain complete hexadecimal bytes");
    return Buffer.from(value, "hex");
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new TypeError("--needle-base64 must be canonical base64");
  return Buffer.from(value, "base64");
}

export async function runSearchFile(argv, io) {
  if (argv.length !== 3 || !["--needle-hex", "--needle-base64"].includes(argv[0])) {
    throw new TypeError("usage: search-file (--needle-hex HEX | --needle-base64 BASE64) PATH");
  }
  const needle = decodeNeedle(argv[0] === "--needle-hex" ? "hex" : "base64", argv[1]);
  const result = await searchFile({ path: argv[2], needle });
  io.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runSearchFile(argv, { stdin, stdout, stderr }),
  formatError: (error) => `search-file: ${error.message}\n`,
  exitCode: 64,
});
