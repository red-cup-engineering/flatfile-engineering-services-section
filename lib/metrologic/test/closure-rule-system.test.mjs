import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    closureRule, closureRuleSystem, closureRuleReceipt, knowledgeLeastValuation,
    closureOrbit, threeStepClosureReceipt, firedRuleNames,
} from "../src/articulation/predicating/positing/settling/analysis/closure-rule-system.mjs";
import { readValuationFiber } from "../src/articulation/predicating/positing/valuation-fiber-algebra.mjs";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const schema = JSON.parse(readFileSync(new URL("../specifications/closure-rule-system.schema.json", import.meta.url), "utf8"));
const lex = (a, b) => a < b ? -1 : a > b ? 1 : 0;

test("schema reading names agree with source-owned FOUR; no private alternate bilattice", () => {
    assert.deepEqual(schema.$defs.knowledgeReading.enum, readingFamilies.knowledge);
    assert.equal(schema.properties.kind.const, "closureRule.system.carrier");
    assert.equal(schema.$defs.rule.properties.kind.const, "closureRule.rule.carrier");
    assert.equal(schema.$defs.rule.properties.antecedent.items.$ref, "#/$defs/antecedent");
});

test("finite schema declaration computes a paraconsistent, non-explosive fixed point", () => {
    const declaration = {
        kind: "closureRule.system.carrier",
        cells: ["claim:A", "claim:B", "claim:unrelated"],
        rules: [
            {kind:"closureRule.rule.carrier",name:"observe-for",antecedent:[],consequent:{cell:"claim:A",reading:"potential"}},
            {kind:"closureRule.rule.carrier",name:"carry-for",antecedent:[{cell:"claim:A",atLeast:"potential"}],consequent:{cell:"claim:B",reading:"potential"}},
            {kind:"closureRule.rule.carrier",name:"observe-against",antecedent:[],consequent:{cell:"claim:A",reading:"active"}},
        ],
    };
    const system = closureRuleSystem(declaration.cells, declaration.rules);
    const receipt = closureRuleReceipt(system, knowledgeLeastValuation(system.cells));
    assert.equal(readValuationFiber(receipt.closed, "claim:A"), "stable"); // both sides, not explosion
    assert.equal(readValuationFiber(receipt.closed, "claim:B"), "potential");
    assert.equal(readValuationFiber(receipt.closed, "claim:unrelated"), "absurd");
    assert.equal(receipt.leastClosed, true);
    assert.deepEqual(receipt.firedAtSeed, ["observe-against","observe-for"]);
    assert.deepEqual(receipt.firingTrace[0].firedRules, ["observe-against","observe-for"]);
    assert.equal(receipt.fixed, true);
    const threeStep = threeStepClosureReceipt(system, knowledgeLeastValuation(system.cells));
    assert.equal(threeStep.theorem, "Obsmetrologia.ClosureRule.immediate_consequence_lfp");
    assert.deepEqual(threeStep.threeStep, receipt.closed);
});

test("positive rule grammar settles 30 cells; no hidden four-cell enumeration ceiling", () => {
    const cells = [...Array.from({ length: 29 }, (_, i) => "claim:" + i), "independent"];
    const rules = [
        closureRule("z:seed-for", [], { cell:"claim:0", reading:"potential" }),
        closureRule("a:seed-against", [], { cell:"claim:0", reading:"active" }),
    ];
    for (let i = 1; i < 29; i += 1) {
        rules.push(closureRule("z:forward-for:" + i,
            [{ cell:"claim:" + (i - 1), atLeast:"potential" }],
            { cell:"claim:" + i, reading:"potential" }));
        rules.push(closureRule("a:forward-against:" + i,
            [{ cell:"claim:" + (i - 1), atLeast:"active" }],
            { cell:"claim:" + i, reading:"active" }));
    }
    const system = closureRuleSystem(cells, [...rules].reverse());
    const seed = knowledgeLeastValuation(cells);
    const receipt = closureRuleReceipt(system, seed);
    assert.equal(readValuationFiber(receipt.closed, "claim:28"), "stable");
    assert.equal(readValuationFiber(receipt.closed, "independent"), "absurd");
    assert.ok(receipt.orbit.length <= 2 * cells.length + 2);
    assert.equal(receipt.finiteHeightBound, 2 * cells.length + 1);
    const names = system.rules.map(x => x.name);
    assert.deepEqual(names, [...names].sort(lex));
    for (const entry of receipt.firingTrace)
        assert.deepEqual(entry.firedRules, [...entry.firedRules].sort(lex));
    assert.deepEqual(firedRuleNames(system, seed), receipt.firedAtSeed);
    assert.throws(() => threeStepClosureReceipt(system, seed),
        /threeStepClosureReceipt: Lean clS is not fixed/);
    assert.throws(() => closureOrbit(system, seed, 2), /no fixed point/);
});

test("rejects malformed or nonmonotone grammar instead of silently widening admitted computation", () => {
    assert.throws(() => closureRule("", [], {cell:"x",reading:"potential"}), /nonempty/);
    assert.throws(() => closureRule("r", [{cell:"x",atLeast:"false-as-failure"}], {cell:"x",reading:"potential"}), /reading/);
    assert.throws(() => closureRuleSystem(["x", "x"], []), /duplicate cells/);
    assert.throws(() => closureRuleSystem(["x"], [
        closureRule("dangling", [], {cell:"y",reading:"potential"})
    ]), /not in the finite carrier/);
    const twice = closureRule("repeat", [], {cell:"x",reading:"potential"});
    assert.throws(() => closureRuleSystem(["x"], [twice, twice]), /duplicate rule names/);
    assert.throws(() => closureRuleReceipt({
        kind:"closureRule.system.carrier", cells:["x"],
        rules:[{kind:"closureRule.rule.carrier",name:"broken",antecedent:[{cell:"x",atLeast:"not-both"}],consequent:{cell:"x",reading:"active"}}],
    }, knowledgeLeastValuation(["x"])), /unadmitted/);
});
