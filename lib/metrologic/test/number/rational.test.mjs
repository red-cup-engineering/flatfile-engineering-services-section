import assert from "node:assert/strict";
import test from "node:test";
import { addHostRatio, admitHostRatio, compareHostRatio, hostRatio, nonnegativeHostRatio, positiveHostRatio, subtractHostRatio } from "@red-cup-engineering/metrologic/number/wire-ratio";

test("host ratios retain arbitrary precision and reduce signs", () => {
  const value = hostRatio("1000000000000000001", "-3000000000000000003");
  assert.deepEqual(value, { numerator: "-1", denominator: "3" });
  assert.deepEqual(addHostRatio(value, hostRatio("1", "3")), { numerator: "0", denominator: "1" });
  assert.deepEqual(subtractHostRatio(hostRatio("1", "1000000000000000000"), hostRatio("1", "1000000000000000001")), { numerator: "1", denominator: "1000000000000000001000000000000000000" });
  assert.equal(compareHostRatio(hostRatio("1000000000000000001", "3"), hostRatio("1000000000000000000", "3")), 1);
});

test("host ratios reject noncanonical wire values", () => {
  assert.throws(() => hostRatio("1.5", "1"), /canonical integer/);
  assert.throws(() => hostRatio("1", "0"), /zero denominator/);
  assert.throws(() => admitHostRatio({ numerator: "2", denominator: "4" }), /reduced/);
  assert.throws(() => nonnegativeHostRatio("-1"), /nonnegative/);
  assert.throws(() => positiveHostRatio("0"), /positive/);
});
