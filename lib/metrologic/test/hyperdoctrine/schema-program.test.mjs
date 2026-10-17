import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readingFamilies, sidesOfReading, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { finiteIndexMorphismFromTable } from "../../src/hyperdoctrine/morphism.mjs";
import { evaluateFiniteQuantifierProgram, existsAlong, forallAlong } from "../../src/hyperdoctrine/adjoints.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/finite-quantifier-contradiction.json", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("../../specifications/finite-quantifier-program.schema.json", import.meta.url), "utf8"));

test("declarative index morphism is a total finite function, not supplied host code", () => {
  const transported = JSON.parse(JSON.stringify(fixture.stages[0]));
  const morphism = finiteIndexMorphismFromTable(transported.source, transported.target, transported.table);
  assert.equal(morphism.map("a:1"), "a");
  assert.equal(morphism.map("b:2"), "b");
  assert.throws(() => morphism.map("not-in-source"), /unknown source cell/);
  assert.throws(() => finiteIndexMorphismFromTable(["x"], ["z"], {}), /mapping must be total/);
  assert.throws(() => finiteIndexMorphismFromTable(["x"], ["z"], {x:"outside"}), /mapping must be total/);
  assert.throws(() => finiteIndexMorphismFromTable(["x"], ["z"], {x:"z",extra:"z"}), /mapping must be total/);
  assert.throws(() => finiteIndexMorphismFromTable(["x","x"], ["z"], {x:"z"}), /distinct/);
  assert.throws(() => finiteIndexMorphismFromTable(["x"], ["z"], () => "z"), /mapping table/);
});

test("finite forall-exists declaration is reusable executable FOUR semantics", () => {
  assert.deepEqual(schema.$defs.knowledgeReading.enum, readingFamilies.knowledge);
  const parsed = JSON.parse(JSON.stringify(fixture)); // no JS callbacks or executable strings
  const run = evaluateFiniteQuantifierProgram(parsed);
  assert.equal(run.kind, "hyperdoctrine.finiteQuantifierProgram.result");
  assert.equal(run.stages[0].result.a, "potential");
  assert.equal(run.stages[0].result.b, "stable");
  assert.equal(run.result.claim, "stable"); // positive AND negative; does not explode.
  const first = finiteIndexMorphismFromTable(parsed.stages[0].source, parsed.stages[0].target, parsed.stages[0].table);
  const second = finiteIndexMorphismFromTable(parsed.stages[1].source, parsed.stages[1].target, parsed.stages[1].table);
  const direct = forallAlong(second, existsAlong(first, new Map(Object.entries(parsed.initial)), "truth"), "truth");
  assert.equal(run.result.claim, direct.get("claim")); // exactly existing adjoints; no competing evaluator
  assert.deepEqual(evaluateFiniteQuantifierProgram(parsed), run); // deterministic portable replay
});

test("all 256 four-atom FOUR valuations obey the positive/negative forall-exists formula", () => {
  const cells = ["a:1","a:2","b:1","b:2"];
  for (const a of readingFamilies.knowledge)
  for (const b of readingFamilies.knowledge)
  for (const c of readingFamilies.knowledge)
  for (const d of readingFamilies.knowledge) {
    const values = [a,b,c,d];
    const initial = Object.fromEntries(cells.map((cell,i) => [cell, values[i]]));
    const schemaInput = {...fixture, initial};
    const got = evaluateFiniteQuantifierProgram(schemaInput).result.claim;
    const sides = values.map(sidesOfReading);
    const expectedPositive = (sides[0][0] || sides[1][0]) && (sides[2][0] || sides[3][0]);
    const expectedNegative = (sides[0][1] && sides[1][1]) || (sides[2][1] && sides[3][1]);
    const expected = readingOfSides("knowledge", expectedPositive, expectedNegative);
    assert.equal(got, expected, JSON.stringify(values));
  }
});

test("finite vacuity and arbitrary finite alternation are real algebra, not hard-coded depth", () => {
  const forEmpty = evaluateFiniteQuantifierProgram({
    kind:"hyperdoctrine.finiteQuantifierProgram", order:"truth",
    initial:{}, stages:[{quantifier:"forall",source:[],target:["empty"],table:{}}],
  });
  const existsEmpty = evaluateFiniteQuantifierProgram({
    kind:"hyperdoctrine.finiteQuantifierProgram", order:"truth",
    initial:{}, stages:[{quantifier:"exists",source:[],target:["empty"],table:{}}],
  });
  assert.equal(forEmpty.result.empty, "potential"); // truth top, empty conjunction
  assert.equal(existsEmpty.result.empty, "active"); // truth bottom, empty disjunction
  const stages = Array.from({length:20}, (_,i) => ({
    quantifier: i%2 ? "forall" : "exists", source:[String(i)], target:[String(i+1)],
    table:{[String(i)]:String(i+1)},
  }));
  const alternating = evaluateFiniteQuantifierProgram({
    kind:"hyperdoctrine.finiteQuantifierProgram", order:"truth",
    initial:{"0":"stable"}, stages,
  });
  assert.equal(alternating.result["20"], "stable");
  assert.equal(alternating.stages.length, stages.length);
});

test("reject undeclared effects, unknown readings, a broken diagram and unknown order", () => {
  const reject = (overrides) => assert.throws(() => evaluateFiniteQuantifierProgram({...fixture, ...overrides}), TypeError);
  reject({order:"transfinite"});
  reject({initial:{"a:1":"unknown"}});
  reject({script:"process.env"});
  reject({stages:[{...fixture.stages[0], table:{"a:1":"a"}}]});
  reject({stages:[{...fixture.stages[0], evaluator:"JS"}]});
  reject({stages:[fixture.stages[1]]}); // does not match initial source
  reject({stages:[{...fixture.stages[0], quantifier:"linear-consume"}]}); // no unearned !-modality
});
