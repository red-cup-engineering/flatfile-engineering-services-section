import assert from "node:assert/strict";
import test from "node:test";
import { JSON_RESOURCE_ENVELOPE, admitCanonicalJson, canonicalizeJson } from "../scripts/canonical-json.mjs";

const spine = (length) => {
  let tail = ["star"];
  for (let index = length - 1; index >= 0; index -= 1) tail = ["pair", index, tail];
  return tail;
};
const nest = (depth) => {
  let value = 0;
  for (let index = 0; index < depth; index += 1) value = [value];
  return value;
};
const refused = (thunk, code) => assert.throws(thunk, (error) => error.code === code);

test("a SEN pair-term list spine is not nesting: 5000 links canonicalize and admit identically", () => {
  const value = spine(5000);
  const canonical = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE);
  const admitted = admitCanonicalJson(canonical.text, JSON_RESOURCE_ENVELOPE);
  assert.equal(admitted.text, canonical.text);
});

test("the canonical text of a spine equals the text of the same value under no bounds", () => {
  const value = ["pair", ["mark", "x"], spine(30)];
  assert.equal(canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).text, canonicalizeJson(value).text);
});

test("genuinely nested hostile input still fails the depth guard, in values and in text", () => {
  refused(() => canonicalizeJson(nest(65), JSON_RESOURCE_ENVELOPE), "depth-limit");
  refused(() => admitCanonicalJson("[".repeat(65) + "0" + "]".repeat(65)), "depth-limit");
  // pair terms nested through the head position are nesting, not spine.
  let head = 0;
  for (let index = 0; index < 65; index += 1) head = ["pair", head, ["star"]];
  refused(() => canonicalizeJson(head, JSON_RESOURCE_ENVELOPE), "depth-limit");
  refused(() => admitCanonicalJson(JSON.stringify(head)), "depth-limit");
});

test("a spine longer than the envelope's maxArrayLength is refused", () => {
  const small = { ...JSON_RESOURCE_ENVELOPE, maxArrayLength: 10 };
  canonicalizeJson(spine(10), small);
  refused(() => canonicalizeJson(spine(12), small), "array-length-limit");
});
