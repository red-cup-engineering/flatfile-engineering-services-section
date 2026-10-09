import assert from "node:assert/strict";
import test from "node:test";
import { createHash as nodeCreateHash } from "node:crypto";
import { sha256Bytes } from "../src/portable-sha256.mjs";

function nodeSha256Hex(str) {
  return nodeCreateHash("sha256").update(str, "utf8").digest("hex");
}

function sha256HexOf(str) {
  return sha256Bytes(new TextEncoder().encode(str));
}

// Deterministic pseudo-random generator — house convention, no Math.random().
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CASES = ["", "a", "abc", "proof-path", "the quick brown fox jumps over the lazy dog", "x".repeat(200)];
test("portable SHA-256 matches node:crypto byte-for-byte", () => {
  for (const value of CASES) {
    const bytes = new TextEncoder().encode(value);
    assert.equal(sha256Bytes(bytes), nodeCreateHash("sha256").update(value, "utf8").digest("hex"));
  }
});

// The following, wider cases were carried over from the cartridge package's
// former hand-rolled sha256Hex (src/sha256.mjs, deleted) when that package
// adopted this portable module: they cover NIST/FIPS 180-4 known vectors,
// the padding-boundary block transition, multi-byte UTF-8, a long-message
// multi-block vector, and a randomized property corpus, which the original
// six short fixed cases above did not exercise.
test("portable SHA-256: NIST/FIPS 180-4 known test vectors", () => {
  const vectors = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    [
      "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
      "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
    ],
  ];
  for (const [input, expected] of vectors) {
    assert.equal(sha256HexOf(input), expected, `mismatch for input ${JSON.stringify(input)}`);
    assert.equal(nodeSha256Hex(input), expected, `NIST vector itself disagrees with node:crypto for ${JSON.stringify(input)}`);
  }
});

test("portable SHA-256: one million repeated \"a\" (NIST long-message vector, exercises many 512-bit blocks)", () => {
  const input = "a".repeat(1_000_000);
  assert.equal(sha256HexOf(input), nodeSha256Hex(input));
});

test("portable SHA-256: matches node:crypto for exact padding-boundary lengths (55..73 bytes, spanning the single/double-block boundary)", () => {
  for (let len = 55; len <= 73; len++) {
    const input = "x".repeat(len);
    assert.equal(sha256HexOf(input), nodeSha256Hex(input), `length ${len}`);
  }
});

test("portable SHA-256: matches node:crypto for multi-byte UTF-8 input (accents, CJK, emoji/surrogate pairs)", () => {
  const inputs = ["café", "日本語", "😀🎮", "café ☃ 😀", " control-chars", "a".repeat(63) + "日"];
  for (const input of inputs) {
    assert.equal(sha256HexOf(input), nodeSha256Hex(input), `mismatch for ${JSON.stringify(input)}`);
  }
});

test("property — portable SHA-256 agrees with node:crypto on a corpus of randomly generated strings of varying length", () => {
  const rng = mulberry32(20260819);
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 {}[]\":,.-_日本語😀☃é\n\t";
  for (let trial = 0; trial < 200; trial++) {
    const len = Math.floor(rng() * 300);
    let s = "";
    for (let i = 0; i < len; i++) {
      s += alphabet[Math.floor(rng() * alphabet.length)];
    }
    assert.equal(sha256HexOf(s), nodeSha256Hex(s), `trial ${trial}, input ${JSON.stringify(s)}`);
  }
});

test("portable SHA-256: output is a 64-char lowercase hex string", () => {
  assert.match(sha256HexOf("anything"), /^[0-9a-f]{64}$/);
});
