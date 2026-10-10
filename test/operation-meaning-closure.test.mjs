import test from "node:test";
import assert from "node:assert/strict";
import { admitOperationMeaningClosure, bindOperationMeaningClosure } from "../src/artifact-fabrication.mjs";

// The code-fabrication specification (2026-09-04): a work order is the meaning-closure and carries no
// source or tests. Stage 2 of the fabrication line: one language-neutral order, many bindings.

const candidate = () => ({
  type: "OperationMeaningClosureCandidate", version: 1,
  operations: [
    { name: "double-value", description: "Double a finite number.", inputSchema: { type: "number" }, outputSchema: { type: "number" } },
    { name: "increment-value", description: "Double, then add one.", inputSchema: { type: "number" }, outputSchema: { type: "number" } },
  ],
  examples: [
    { name: "double-seven", operation: "double-value", input: 7, output: 14 },
    { name: "increment-seven", operation: "increment-value", input: 7, output: 15 },
  ],
  dependencies: [],
});

test("an operation closure names no file, export or language", () => {
  const closure = admitOperationMeaningClosure(candidate());
  assert.equal(closure.type, "OperationMeaningClosure", JSON.stringify(closure));
  assert.match(closure.closureDigest, /^ni:/u);
  for (const operation of closure.operations) assert.deepEqual(Object.keys(operation).sort(), ["description", "inputSchema", "name", "outputSchema"]);
  const withSource = { ...candidate(), operations: [{ ...candidate().operations[0], module: "src/double.mjs" }] };
  assert.equal(admitOperationMeaningClosure(withSource).code, "UNEXPECTED_FIELDS");
});

test("every operation needs an admitted example, and dependencies are exact and ecosystem-named", () => {
  assert.equal(admitOperationMeaningClosure({ ...candidate(), examples: [candidate().examples[0]] }).code, "UNEXEMPLIFIED_OPERATION");
  assert.equal(admitOperationMeaningClosure({ ...candidate(), dependencies: [{ ecosystem: "npm", name: "left-pad", version: "^1.3.0" }] }).code, "INEXACT_DEPENDENCY");
  assert.equal(admitOperationMeaningClosure({ ...candidate(), dependencies: [{ ecosystem: "cargo", name: "serde", version: "1.0.0" }] }).code, "UNKNOWN_ECOSYSTEM");
});

test("one order binds to Node, Racket, Guile and Python with the same examples and schemas", () => {
  const closure = admitOperationMeaningClosure(candidate());
  const bound = Object.fromEntries(["javascript-node", "racket", "guile", "python"].map((language) => [language, bindOperationMeaningClosure(closure, language, { unit: "arithmetic" })]));
  assert.deepEqual(bound["javascript-node"].operations[1].module, "src/increment-value.mjs");
  assert.deepEqual(bound["javascript-node"].operations[1].symbol, "incrementValue");
  assert.deepEqual(bound.racket.operations[1], { ...closure.operations[1], module: "increment-value.rkt", symbol: "increment-value" });
  assert.deepEqual(bound.guile.operations[1].module, "(arithmetic increment-value)");
  assert.deepEqual(bound.python.operations[1], { ...closure.operations[1], module: "src/arithmetic/increment_value.py", symbol: "increment_value" });
  for (const value of Object.values(bound)) {
    assert.equal(value.type, "BoundOperationMeaningClosure");
    assert.equal(value.closureDigest, closure.closureDigest);
    assert.deepEqual(value.examples, closure.examples);
  }
});

test("a binding refuses a dependency it cannot resolve rather than dropping it", () => {
  const closure = admitOperationMeaningClosure({ ...candidate(), dependencies: [{ ecosystem: "npm", name: "@scope/numbers", version: "1.2.3" }] });
  assert.deepEqual(bindOperationMeaningClosure(closure, "javascript-node").dependencies, { "@scope/numbers": "1.2.3" });
  assert.equal(bindOperationMeaningClosure(closure, "python", { unit: "arithmetic" }).code, "FOREIGN_DEPENDENCY");
  assert.equal(bindOperationMeaningClosure(closure, "cobol").code, "UNKNOWN_LANGUAGE");
});
