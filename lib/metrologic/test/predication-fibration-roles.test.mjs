import test from "node:test";
import assert from "node:assert/strict";
import {
  cellSignatureKey, signatureOfCell, finitePredicationValuation,
  embedding, reindexValuation, reindexBilatticeHomomorphism,
} from "../src/articulation/predicating/fibration.mjs";
import {
  fusionReading, residuumReading, truthMeetReading, truthImplyReading,
} from "@red-cup-engineering/computer-data-engineering-services-section/four";

const cell = (subject, predicate, object) =>
  Object.freeze({ kind: "predication.cellSignature", subject, predicate, object });

test("predication positions preserve distinct roles even when their text contains delimiters", () => {
  const a = cell("maker|receipt", "ACK", "case");
  const b = cell("maker", "receipt|ACK", "case");
  assert.notEqual(cellSignatureKey(a), cellSignatureKey(b));
  const map = Object.fromEntries([
    [cellSignatureKey(a), "potential"],
    [cellSignatureKey(b), "active"],
  ]);
  const valuation = finitePredicationValuation([a, b], map);
  assert.equal(valuation.cells.length, 2);
  assert.equal(valuation.values[cellSignatureKey(a)], "potential");
  assert.equal(valuation.values[cellSignatureKey(b)], "active");
  assert.deepEqual(JSON.parse(cellSignatureKey(a)), ["maker|receipt", "ACK", "case"]);
});

test("structured Mark values are serialized without equating different presented roles", () => {
  const present = (value) => ({ mark: { value } });
  const x = signatureOfCell({
    subject: present({ b: ["a|b"], a: 1 }),
    predicate: present({ name: "ack", mode: { status: "contested" } }),
    object: present(["value", { right: true, left: false }]),
  });
  const y = signatureOfCell({
    subject: present({ a: 1, b: ["a|b"] }),
    predicate: present({ mode: { status: "contested" }, name: "ack" }),
    object: present(["value", { left: false, right: true }]),
  });
  assert.equal(cellSignatureKey(x), cellSignatureKey(y), "same serialized payload has the same projected signature");
  assert.equal(x.kind, "predication.cellSignature");
});

test("valuation refuses an absent reading and duplicate positions instead of silently overwriting", () => {
  const a = cell("s", "p", "o");
  const key = cellSignatureKey(a);
  assert.throws(() => finitePredicationValuation([a], {}), /missing value/);
  assert.throws(() => finitePredicationValuation([a, a], { [key]: "potential" }), /duplicate cell/);
  assert.throws(() => cellSignatureKey({ subject: "s", predicate: "p" }), /three string roles/);
});

test("embedding is a resource-indexed function, not a last-writer-wins relation", () => {
  const a = cell("sender", "WIT", "claim");
  const b = cell("receiver", "ACK", "claim");
  const c = cell("observer", "ATT", "ack");
  const host = finitePredicationValuation([b, c], {
    [cellSignatureKey(b)]: "stable",
    [cellSignatureKey(c)]: "active",
  });
  assert.throws(() => embedding([[a, b], [a, c]]), /repeats a resource position/);
  const distinct = embedding([[a, b], [c, b]]);
  const read = reindexValuation(distinct, host);
  assert.equal(read.values[cellSignatureKey(a)], "stable");
  assert.equal(read.values[cellSignatureKey(c)], "stable");
  assert.equal(read.cells.length, 2);
});

test("fibration preserves actual multiplicative fusion and residuation, not their additive shadows", () => {
  const a = cell("claim", "WIT", "yes");
  const b = cell("claim", "ACK", "yes");
  const k1 = cellSignatureKey(a), k2 = cellSignatureKey(b);
  const first = finitePredicationValuation([a,b], { [k1]: "potential", [k2]: "stable" });
  const second = finitePredicationValuation([a,b], { [k1]: "active", [k2]: "potential" });
  const pullback = embedding([[a, b], [b, a]]);
  const receipt = reindexBilatticeHomomorphism(pullback, first, second);
  assert.equal(receipt.preservesFusion, true);
  assert.equal(receipt.preservesResidual, true);
  const values = ["absurd", "potential", "active", "stable"];
  assert.ok(values.some(a => values.some(b => fusionReading(a,b) !== truthMeetReading(a,b))),
    "the multiplicative and additive operators must not be conflated");
  assert.ok(values.some(a => values.some(b => residuumReading(a,b) !== truthImplyReading(a,b))),
    "the multiplicative residual and Heyting implication must not be conflated");
});
