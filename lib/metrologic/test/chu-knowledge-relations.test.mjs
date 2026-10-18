import test from "node:test";
import assert from "node:assert/strict";
import { chuSpace } from "../src/chu.mjs";
import {
  composeKnowledgeRelations as compose,
  leftResidualKnowledgeRelation as residualLeft,
  rightResidualKnowledgeRelation as residualRight,
  meetKnowledgeRelations as meet,
  leqKnowledgeRelations as leq,
} from "../src/chu-knowledge-relations.mjs";
import { knowledgeMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const R = ["absurd", "potential", "active", "stable"];
const singleton = (reading, row = "r", col = "c") =>
  chuSpace([row], [col], () => reading);

test("all FOUR combinations satisfy both finite relation residuation adjunctions", () => {
  for (const a of R) for (const b of R) for (const w of R) {
    const A = singleton(a, "r", "m");
    const B = singleton(b, "r", "c");
    const W = singleton(w, "m", "c");
    const lhs = leq(compose(A, W), B);
    assert.equal(lhs, leq(W, residualLeft(A, B)), "left residual: " + a + b + w);
    assert.equal(lhs, leq(A, residualRight(B, W)), "right residual: " + a + b + w);
  }
});

test("FOUR preserves opposed evidence and permuted source middle coordinates", () => {
  const A = chuSpace(["r"], ["m", "n"], (_r, c) => c === "m" ? "potential" : "active");
  const W = chuSpace(["n", "m"], ["c"], r => r === "m" ? "potential" : "active");
  assert.equal(compose(A, W).matrix[0][0], "stable");
  const B = chuSpace(["r"], ["c"], () => "stable");
  assert.equal(leq(compose(A, W), B), true);
  assert.equal(meet(B, singleton("potential")).matrix[0][0], "potential");
});

test("empty middle and empty left-support folds obey knowledge bounds", () => {
  const A = chuSpace(["r"], [], () => "active");
  const W = chuSpace([], ["c"], () => "potential");
  const B = chuSpace(["r"], ["c"], () => "absurd");
  assert.equal(compose(A, W).matrix[0][0], "absurd");
  assert.equal(residualLeft(chuSpace([], ["m"], () => "active"),
    chuSpace([], ["c"], () => "potential")).matrix[0][0], "stable");
  assert.equal(leq(compose(A, W), B), true);
});

test("forged cross-carrier identification refuses instead of deleting an edge", () => {
  const A = singleton("potential", "a", "original");
  const B = singleton("potential", "same", "out");
  assert.throws(() => compose(A, B), /carriers differ|unique mutually admitted/);
  const permuted = chuSpace(["r2", "r1"], ["c"], r => r === "r1" ? "potential" : "active");
  const other = chuSpace(["r1", "r2"], ["c"], r => r === "r1" ? "active" : "potential");
  assert.equal(meet(permuted, other).matrix[0][0], "absurd");
  const original = { label: "shared" }, copy = { label: "shared" };
  assert.throws(() => compose(singleton("potential", "r", original),
    singleton("potential", copy, "c")), /unique mutually admitted/);
});

test("pointwise matrix meet equals Data FOUR knowledge meet, never truth-order tensor", () => {
  for (const a of R) for (const b of R) {
    assert.equal(meet(singleton(a), singleton(b)).matrix[0][0],
      knowledgeMeetReading(a, b));
  }
});
