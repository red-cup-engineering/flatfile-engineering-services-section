import assert from "node:assert/strict";
import test from "node:test";
import { dK, dF, settledMask, valuedSheafReceipt, subset } from "../../src/sheaf/topology/d-frame.mjs";

const NAMES = Object.freeze({ bottom: "nothing", positiveOnly: "yes", negativeOnly: "no", top: "both" });

const VALUATION = Object.freeze([
  Object.freeze({ cell: "a", reading: "yes" }),
  Object.freeze({ cell: "b", reading: "both" }),
  Object.freeze({ cell: "c", reading: "no" }),
  Object.freeze({ cell: "d", reading: "nothing" }),
]);

test("dK is exactly the positive-only-or-top cells", () => {
  assert.deepEqual(dK(NAMES, VALUATION).elements, ["a", "b"]);
});

test("dF is exactly the negative-only-or-top cells", () => {
  assert.deepEqual(dF(NAMES, VALUATION).elements, ["b", "c"]);
});

test("settledMask excludes only bottom-charged cells", () => {
  assert.deepEqual(settledMask(NAMES, VALUATION, subset(["a", "b", "c", "d"])).elements, ["a", "b", "c"]);
});

test("valuedSheafReceipt verifies the finite d-frame-valued sheaf laws for a lawful valuation", () => {
  const receipt = valuedSheafReceipt(NAMES, VALUATION);
  assert.equal(receipt.kind, "dFrame.valuedSheaf:witness");
  assert.deepEqual(receipt.positiveSupport.elements, ["a", "b"]);
  assert.deepEqual(receipt.negativeSupport.elements, ["b", "c"]);
});

test("dK/dF/settledMask/valuedSheafReceipt run over ANY caller's own four-valued vocabulary (e.g. FeltOS's claim names), not just one hardcoded set", () => {
  const CLAIM_NAMES = Object.freeze({ bottom: "unknown", positiveOnly: "held", negativeOnly: "denied", top: "contested" });
  const claimValuation = Object.freeze([
    Object.freeze({ cell: "a", reading: "held" }),
    Object.freeze({ cell: "b", reading: "contested" }),
    Object.freeze({ cell: "c", reading: "denied" }),
    Object.freeze({ cell: "d", reading: "unknown" }),
  ]);
  assert.deepEqual(dK(CLAIM_NAMES, claimValuation).elements, ["a", "b"]);
  assert.deepEqual(dF(CLAIM_NAMES, claimValuation).elements, ["b", "c"]);
  const receipt = valuedSheafReceipt(CLAIM_NAMES, claimValuation);
  assert.equal(receipt.kind, "dFrame.valuedSheaf:witness");
});
