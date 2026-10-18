import test from "node:test";
import assert from "node:assert/strict";
import { hostRatio, addHostRatio, floorNonnegativeHostRatio } from "../../src/number/wire-ratio.mjs";

test("exact whole resource projection preserves fractional residue with no silent round-up", () => {
  assert.deepEqual(floorNonnegativeHostRatio(hostRatio(101n * 500n, 10000n)),
    { whole: "5", remainder: { numerator: "1", denominator: "20" } });
  assert.deepEqual(floorNonnegativeHostRatio(hostRatio(4n * 500n, 10000n)),
    { whole: "0", remainder: { numerator: "1", denominator: "5" } });
  assert.deepEqual(floorNonnegativeHostRatio(hostRatio(10000n, 100n)),
    { whole: "100", remainder: { numerator: "0", denominator: "1" } });
});

test("the conservative decomposition is exact beyond IEEE754 and can never increase capacity", () => {
  for (const n of [0n,1n,5n,1001n,(1n<<128n)-1n,1n<<400n]) {
    for (const d of [1n,3n,11n,10000n]) {
      const ratio = hostRatio(n,d);
      const projected = floorNonnegativeHostRatio(ratio);
      const sum = addHostRatio(hostRatio(projected.whole),projected.remainder);
      assert.deepEqual(sum,ratio);
      assert.ok(BigInt(projected.whole)*BigInt(ratio.denominator)<=BigInt(ratio.numerator));
      assert.ok(BigInt(projected.remainder.numerator)<BigInt(projected.remainder.denominator));
      assert.equal(Object.isFrozen(projected),true);
    }
  }
  assert.throws(()=>floorNonnegativeHostRatio({numerator:"-1",denominator:"2"}),/nonnegative/);
  assert.throws(()=>floorNonnegativeHostRatio({numerator:"5",denominator:"10"}),/normalized|reduced/);
  assert.throws(()=>floorNonnegativeHostRatio({numerator:"1",denominator:"0"}),/zero denominator/);
});
