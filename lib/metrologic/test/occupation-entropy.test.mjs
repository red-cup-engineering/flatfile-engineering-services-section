import assert from "node:assert/strict";
import test from "node:test";
import { occupationEntropy } from "../src/models/physics/models/kinetic-theory/boltzmann-entropy.mjs";

test("occupation entropy counts the microstates of an occupation in bits", () => {
  assert.deepEqual(occupationEntropy([1, 1]), { cells: 2, totalObjects: 2, configH: 0, entropyBits: 1 });
  const three = occupationEntropy([2, 0, 1]);
  assert.equal(three.configH, 1);
  assert.ok(Math.abs(three.entropyBits - Math.log2(3)) < 1e-9);
});

test("occupation entropy refuses an empty or negative occupation", () => {
  assert.throws(() => occupationEntropy([]), TypeError);
  assert.throws(() => occupationEntropy([-1]), RangeError);
});
