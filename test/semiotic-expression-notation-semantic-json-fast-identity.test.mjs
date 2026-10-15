import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, semanticIdOf } from "../src/semiotic-expression-notation/semantic-content-identity.mjs";

// `semanticIdOf` writes envelope, term and type in one pass of canonical CBOR; its id, or its
// refusal, must be that of the full route for every JSON value, NFC or not.
test("one-pass JSON semantic id equals the full route's id or refusal", () => {
  const id = semanticIdOf("metroplat.artifact");
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const strings = ["", "a", "café", "café", "\ń", "x\u0001́", "\u0001́", "日本語", "😀", "a\"b\\c", "Å", "Å", "true", "\ud800"];
  const numbers = [0, 1, -1, 1.5, 1e21, 7400, 2 ** 53, -(2 ** 60), 0.1, 1e-7, 65504, 3.4e38];
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const generate = (depth) => {
    const r = rnd();
    if (depth > 4 || r < 0.35) {
      const k = rnd();
      return k < 0.25 ? null : k < 0.4 ? rnd() < 0.5 : k < 0.7 ? pick(strings) : pick(numbers);
    }
    if (r < 0.65) return Array.from({ length: Math.floor(rnd() * 4) }, () => generate(depth + 1));
    const object = {};
    for (let count = Math.floor(rnd() * 4); count > 0; count -= 1) object[pick(strings)] = generate(depth + 1);
    return object;
  };
  const outcome = (run) => { try { return { id: run() }; } catch (error) { return { refusal: error.message }; } };
  for (let index = 0; index < 4000; index += 1) {
    const value = generate(0);
    assert.deepEqual(
      outcome(() => id(value)),
      outcome(() => identifyJsonSemanticContent({ objectKind: "metroplat.artifact", value, witnessRoot: EMPTY_WITNESS_ROOT }).id),
      JSON.stringify(value),
    );
  }
  for (const value of [undefined, NaN, -0, new Date(), [, "hole"], { a: undefined }]) {
    assert.deepEqual(
      outcome(() => id(value)),
      outcome(() => identifyJsonSemanticContent({ objectKind: "metroplat.artifact", value, witnessRoot: EMPTY_WITNESS_ROOT }).id),
    );
  }
});
