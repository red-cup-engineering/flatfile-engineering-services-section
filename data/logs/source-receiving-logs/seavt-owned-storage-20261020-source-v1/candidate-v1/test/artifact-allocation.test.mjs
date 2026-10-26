import assert from "node:assert/strict";
import test from "node:test";
import { addressArtifact, admitArtifact, artifactId, verifyArtifact } from "../src/identity/artifact.mjs";

const options = { maxBytes: 2 * 1024 * 1024 };
const value = Array.from({ length: 12 }, () => "x".repeat(100_000));
const limitRefusal = (run) => assert.throws(run, (error) => error.code === "canonical-limit");
const sourceRefusal = (run) => assert.throws(run, (error) => error.code === "source-limit");

test("explicit bytes admit and verify complete large artifacts without changing identity or defaults", () => {
  limitRefusal(() => addressArtifact(value));
  const addressed = addressArtifact(value, options);
  assert.deepEqual(addressed.canonical.value, value);
  assert.equal(addressed.ref, artifactId(value));
  sourceRefusal(() => admitArtifact(addressed.canonical.text));
  assert.equal(admitArtifact(addressed.canonical.text, options).ref, addressed.ref);
  assert.equal(verifyArtifact(addressed.ref, addressed.canonical.text, options).ref, addressed.ref);
  assert.throws(() => verifyArtifact(artifactId([]), addressed.canonical.text, options), (error) => error.code === "digest-mismatch");
});

test("byte allocation is finite and retains strict structural and value admission", () => {
  for (const maxBytes of [0, -1, NaN, Infinity, 1.5, "2000000", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => addressArtifact({}, { maxBytes }), /positive safe integer/u);
    assert.throws(() => admitArtifact("{}", { maxBytes }), /positive safe integer/u);
    assert.throws(() => verifyArtifact(artifactId({}), "{}", { maxBytes }), /positive safe integer/u);
  }
  limitRefusal(() => addressArtifact(value, { maxBytes: 1_100_000 }));
  sourceRefusal(() => admitArtifact(JSON.stringify(value), { maxBytes: 1_100_000 }));
  assert.throws(() => addressArtifact("x".repeat(262_145), options), (error) => error.code === "string-limit");
  assert.throws(() => addressArtifact({ missing: undefined }, options));
  assert.throws(() => admitArtifact('{"a":1,"a":2}', options));
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => addressArtifact(cyclic, options));
});

test("canonical and source byte allocations accept equality and refuse the next byte", () => {
  const value = { x: "é" };
  const source = JSON.stringify(value);
  const maxBytes = Buffer.byteLength(source, "utf8");
  const addressed = addressArtifact(value, { maxBytes });
  assert.equal(admitArtifact(source, { maxBytes }).ref, addressed.ref);
  assert.equal(verifyArtifact(addressed.ref, source, { maxBytes }).ref, addressed.ref);
  limitRefusal(() => addressArtifact(value, { maxBytes: maxBytes - 1 }));
  sourceRefusal(() => admitArtifact(source + " ", { maxBytes }));
  sourceRefusal(() => verifyArtifact(addressed.ref, source + " ", { maxBytes }));
});
