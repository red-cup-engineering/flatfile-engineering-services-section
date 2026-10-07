/**
 * analysis/closure-rule-system - finite immediate-consequence operators.
 *
 * Executable shadow of RelMath.Closure.ClosureRuleSystem. Rules are represented
 * as positive finite threshold antecedents over FOUR-valued valuation cells, with
 * one consequent that raises a cell by knowledge join.
 */
import { readValuationFiber, sameValuationFiber, valuationFiberCarrier, valuationLeqKnowledge } from "../../valuation-fiber-algebra.mjs";
import { valuationKnowledgeJoin } from "../../closure-operator-fiber.mjs";
import { signatureOfCell, cellSignatureKey } from "../../../fibration.mjs";
import { readingFamilies, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * The earned runtime image of Lean's `PredicationCell`.  A closure system may
 * retain string keys for the finite valuation implementation, but admission of
 * a proof-traceable system starts from actual subject–predicate–object cells;
 * the key is derived structurally, never supplied as new metadata.
 */
export const predicationCellKey = (cell) => cellSignatureKey(signatureOfCell(cell));
const unique = (items) => new Set(items).size === items.length;
const freezeRecord = (record) => Object.freeze({ ...record });
const knowledgeLeqValue = (left, right) => knowledgeJoinReading(left, right) === right;
const knowledgeJoinValueName = (left, right) => knowledgeJoinReading(left, right);
function requireReading(value, caller) {
    if (!readingFamilies.knowledge.includes(value))
        throw new TypeError(`${caller}: ${value} is not a reading`);
}
function requireCell(cells, cell, caller) {
    if (!cells.includes(cell))
        throw new TypeError(`${caller}: cell ${cell} is not in the finite carrier`);
}
export function closureRule(name, antecedent, consequent) {
    for (const condition of antecedent)
        requireReading(condition.atLeast, "closureRule");
    requireReading(consequent.reading, "closureRule");
    return Object.freeze({
        kind: "closureRule.rule.carrier",
        name,
        antecedent: Object.freeze(antecedent.map((condition) => Object.freeze({ ...condition }))),
        consequent: Object.freeze({ ...consequent }),
    });
}
export const alwaysRule = (cell, reading) => closureRule(`always:${cell}:${reading}`, [], { cell, reading });
export function closureRuleSystem(cells, rules) {
    if (cells.length === 0)
        throw new RangeError("closureRuleSystem: carrier must be nonempty");
    if (!unique(cells))
        throw new TypeError("closureRuleSystem: duplicate cells are not a finite carrier");
    for (const rule of rules) {
        requireCell(cells, rule.consequent.cell, "closureRuleSystem");
        for (const condition of rule.antecedent)
            requireCell(cells, condition.cell, "closureRuleSystem");
    }
    return Object.freeze({
        kind: "closureRule.system.carrier",
        cells: Object.freeze([...cells]),
        rules: Object.freeze([...rules]),
    });
}
/**
 * Typed admission path for `Obsmetrologia.Closure.RuleSystem`: its finite
 * valuation coordinates are derived from actual `PredicationCell`s.  The
 * restricted runtime rule language remains positive threshold firing over
 * FOUR-valued knowledge joins; no additional cell metadata is introduced.
 */
export function predicationClosureRuleSystem(predicationCells, rules) {
    const cells = predicationCells.map(predicationCellKey);
    const system = closureRuleSystem(cells, rules);
    return Object.freeze({
        ...system,
        predicationCells: Object.freeze([...predicationCells]),
    });
}
export function knowledgeLeastValuation(cells) {
    return valuationFiberCarrier(cells, Object.fromEntries(cells.map((cell) => [cell, "absurd"])));
}
export function valuation(cells, values) {
    const filled = Object.fromEntries(cells.map((cell) => {
        const value = (Object.hasOwn(values, cell) ? values[cell] : undefined) ?? "absurd";
        requireReading(value, "closureRule.valuation");
        return [cell, value];
    }));
    return valuationFiberCarrier(cells, freezeRecord(filled));
}
export function antecedentHolds(rule, carrier) {
    return rule.antecedent.every((condition) => knowledgeLeqValue(condition.atLeast, readValuationFiber(carrier, condition.cell)));
}
export function ruleFire(rule, carrier) {
    if (!antecedentHolds(rule, carrier))
        return knowledgeLeastValuation(carrier.points);
    return valuation(carrier.points, { [rule.consequent.cell]: rule.consequent.reading });
}
export function fire(system, carrier) {
    let fired = knowledgeLeastValuation(system.cells);
    for (const rule of system.rules)
        fired = valuationKnowledgeJoin(fired, ruleFire(rule, carrier));
    return fired;
}
export function tstep(system, carrier) {
    return valuationKnowledgeJoin(carrier, fire(system, carrier));
}
export function closureOrbit(system, seed, maxSteps = Math.max(4, system.cells.length * readingFamilies.knowledge.length + system.rules.length + 1)) {
    const orbit = [seed];
    let current = seed;
    for (let step = 0; step < maxSteps; step += 1) {
        const next = tstep(system, current);
        orbit.push(next);
        if (sameValuationFiber(next, current))
            break;
        current = next;
    }
    return Object.freeze(orbit);
}
/** The exact three-step `clS` definition used by the Lean RuleSystem module. */
export function clS(system, seed) {
    return tstep(system, tstep(system, tstep(system, seed)));
}
/** Eventual finite runtime closure; distinct from Lean's three-step `clS`. */
export function eventualClosure(system, seed) {
    const orbit = closureOrbit(system, seed);
    return orbit[orbit.length - 1];
}
/**
 * Lean's `clS` is exactly three `Tstep`s.  This receipt is intentionally
 * unavailable unless that candidate is fixed, the explicit `hfix` premise of
 * `generated_closure_is_least` and `immediate_consequence_lfp`.  Longer
 * cross-cell cascades remain available through `closureOrbit`/`closureRuleReceipt`
 * as eventual runtime closure, not as this theorem.
 */
export function threeStepClosureReceipt(system, seed) {
    const threeStep = tstep(system, tstep(system, tstep(system, seed)));
    if (!sameValuationFiber(tstep(system, threeStep), threeStep)) {
        throw new RangeError("threeStepClosureReceipt: Lean clS is not fixed; use eventual runtime closure without the three-step theorem claim");
    }
    return Object.freeze({
        kind: "closureRule.threeStep.receipt:theorem-aligned",
        system,
        seed,
        threeStep,
        fixed: true,
        theorem: "Obsmetrologia.Closure.RuleSystem.immediate_consequence_lfp",
    });
}
// Compile-time boundary assay: a typed predication carrier remains admissible
// anywhere the ordinary finite closure carrier is required.
const threeStepFromPredicationSystem = (system, seed) => threeStepClosureReceipt(system, seed);
void threeStepFromPredicationSystem;
function* valuationRecords(cells, index = 0, record = {}) {
    if (index === cells.length) {
        yield freezeRecord(record);
        return;
    }
    const cell = cells[index];
    for (const value of readingFamilies.knowledge) {
        yield* valuationRecords(cells, index + 1, { ...record, [cell]: value });
    }
}
function allValuations(cells) {
    return Object.freeze([...valuationRecords(cells)].map((values) => valuation(cells, values)));
}
function ruleRespecting(system, carrier) {
    return system.rules.every((rule) => !antecedentHolds(rule, carrier)
        || knowledgeLeqValue(rule.consequent.reading, readValuationFiber(carrier, rule.consequent.cell)));
}
function checkMonotone(system) {
    const all = allValuations(system.cells);
    return all.every((left) => all.every((right) => !valuationLeqKnowledge(left, right) || valuationLeqKnowledge(tstep(system, left), tstep(system, right))));
}
function checkLeastClosed(system, seed, closed) {
    if (system.cells.length > 4) {
        throw new RangeError("closureRuleReceipt: exhaustive least-closed check is limited to at most 4 cells");
    }
    return allValuations(system.cells).every((candidate) => !(valuationLeqKnowledge(seed, candidate) && sameValuationFiber(tstep(system, candidate), candidate))
        || valuationLeqKnowledge(closed, candidate));
}
export function firedRuleNames(system, carrier) {
    return Object.freeze(system.rules.filter((rule) => antecedentHolds(rule, carrier)).map((rule) => rule.name));
}
export function closureRuleReceipt(system, seed) {
    const orbit = closureOrbit(system, seed);
    const closed = orbit[orbit.length - 1];
    const fixed = sameValuationFiber(tstep(system, closed), closed);
    const inflationary = valuationLeqKnowledge(seed, closed);
    const monotone = checkMonotone(system);
    const respecting = ruleRespecting(system, closed);
    const leastClosed = checkLeastClosed(system, seed, closed);
    if (!fixed || !inflationary || !monotone || !respecting || !leastClosed) {
        throw new TypeError("closureRuleReceipt: finite immediate-consequence laws failed");
    }
    return Object.freeze({
        kind: "closureRule.system.receipt:witness",
        system,
        seed,
        orbit,
        closed,
        fixed: true,
        inflationary: true,
        monotone: true,
        ruleRespecting: true,
        leastClosed: true,
        eventualFixedPoint: true,
        firedAtSeed: firedRuleNames(system, seed),
    });
}
export function alwaysRuleReceipt(cell = "cell", reading = "potential") {
    const system = closureRuleSystem([cell], [alwaysRule(cell, reading)]);
    return closureRuleReceipt(system, knowledgeLeastValuation(system.cells));
}
export const consequentJoin = (current, consequent) => knowledgeJoinValueName(current, consequent);
