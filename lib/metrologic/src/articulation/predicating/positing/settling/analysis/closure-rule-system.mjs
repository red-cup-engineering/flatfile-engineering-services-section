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
/** Code-point order is stable across locales, hosts and deployment languages. */
const lexical = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const onlyKeys = (record, allowed) => Object.keys(record).every((key) => allowed.includes(key));
const EVIDENCE_SIDES_PER_CELL = 2; // FOUR comes from independent for/against witness-presence sides.
const finiteHeightBound = (cells) => {
    const bound = EVIDENCE_SIDES_PER_CELL * cells.length + 1; // one extra round witnesses stasis.
    if (!Number.isSafeInteger(bound))
        throw new RangeError("closureRuleSystem: finite evidence-height bound exceeds the host's exact integer range");
    return bound;
};
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
/**
 * Admit the positive-threshold fragment only. Negated absence, arbitrary JS,
 * consumptive actions, and transfinite limit operators are NOT this grammar.
 */
export function closureRule(name, antecedent, consequent) {
    if (typeof name !== "string" || name.length === 0)
        throw new TypeError("closureRule: rule names must be nonempty strings");
    if (!Array.isArray(antecedent) || !consequent || typeof consequent !== "object")
        throw new TypeError("closureRule: expected antecedent conditions and a consequent");
    for (const condition of antecedent) {
        if (!condition || typeof condition !== "object" || typeof condition.cell !== "string"
            || !onlyKeys(condition, ["cell", "atLeast"]))
            throw new TypeError("closureRule: antecedents need only a cell and a FOUR threshold");
        requireReading(condition.atLeast, "closureRule");
    }
    if (typeof consequent.cell !== "string" || !onlyKeys(consequent, ["cell", "reading"]))
        throw new TypeError("closureRule: consequent needs only a cell and a FOUR reading");
    requireReading(consequent.reading, "closureRule");
    return Object.freeze({
        kind: "closureRule.rule.carrier",
        name,
        antecedent: Object.freeze(antecedent.map((condition) => Object.freeze({ cell: condition.cell, atLeast: condition.atLeast }))),
        consequent: Object.freeze({ cell: consequent.cell, reading: consequent.reading }),
    });
}
export const alwaysRule = (cell, reading) => closureRule(`always:${cell}:${reading}`, [], { cell, reading });

/** An admitted finite declaration is already executable; no rival DSL or interpreter. */
export function closureRuleSystem(cells, rules) {
    if (!Array.isArray(cells) || cells.length === 0 || !cells.every((cell) => typeof cell === "string" && cell.length > 0))
        throw new RangeError("closureRuleSystem: finite carrier must have nonempty string cell keys");
    if (!unique(cells))
        throw new TypeError("closureRuleSystem: duplicate cells are not a finite carrier");
    if (!Array.isArray(rules))
        throw new TypeError("closureRuleSystem: rules must be an array");
    finiteHeightBound(cells);
    const admitted = rules.map((rule) => {
        if (!rule || typeof rule !== "object"
            || (rule.kind !== undefined && rule.kind !== "closureRule.rule.carrier")
            || !onlyKeys(rule, ["kind", "name", "antecedent", "consequent"]))
            throw new TypeError("closureRuleSystem: invalid or unsupported rule carrier");
        return closureRule(rule.name, rule.antecedent, rule.consequent);
    });
    if (!unique(admitted.map((rule) => rule.name)))
        throw new TypeError("closureRuleSystem: duplicate rule names prevent an unambiguous replay trace");
    for (const rule of admitted) {
        requireCell(cells, rule.consequent.cell, "closureRuleSystem");
        for (const condition of rule.antecedent)
            requireCell(cells, condition.cell, "closureRuleSystem");
    }
    return Object.freeze({
        kind: "closureRule.system.carrier",
        cells: Object.freeze([...cells]),
        // Parallel immediate consequences still join commutatively; this order
        // canonicalizes receipts without changing their mathematical operator.
        rules: Object.freeze(admitted.sort((a, b) => lexical(a.name, b.name))),
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
/**
 * The finite FOUR knowledge-order carrier has two independent evidence bits
 * per cell. Every strict inflationary step adds at least one previously absent
 * bit, so there are at most 2|cells| strict steps. The final step checks stasis.
 * This bound is derived from the carrier, not a configurable four-cell cutoff.
 */
export function closureOrbit(system, seed, maxSteps = finiteHeightBound(system.cells)) {
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1)
        throw new RangeError("closureOrbit: steps must be a positive exact integer");
    const orbit = [seed];
    let current = seed;
    for (let step = 0; step < maxSteps; step += 1) {
        const next = tstep(system, current);
        orbit.push(next);
        if (sameValuationFiber(next, current))
            return Object.freeze(orbit);
        current = next;
    }
    // A caller-supplied smaller observational budget is not a settlement.
    throw new RangeError("closureOrbit: no fixed point within the supplied step budget");
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
/**
 * Structural least-closed certificate, independent of 4^n valuation search:
 * - each admitted antecedent uses an upward-closed knowledge threshold;
 * - each consequent joins a constant FOUR value, so T is monotone;
 * - the join with the old state makes T inflationary;
 * - induction puts every orbit stage below any closed state above the seed;
 * - at most 2|cells| strict advances give a fixed, therefore least, state.
 *
 * This is an executable, finite fragment argument. It does not claim Lean
 * kernel qualification, higher-order negation, or transfinite closure.
 */
function positiveThresholdGrammar(system) {
    if (!system || system.kind !== "closureRule.system.carrier" || !Array.isArray(system.cells) || !Array.isArray(system.rules))
        return false;
    try {
        const admitted = closureRuleSystem(system.cells, system.rules);
        return admitted.rules.length === system.rules.length;
    } catch {
        return false;
    }
}
function ruleRespecting(system, carrier) {
    return system.rules.every((rule) => !antecedentHolds(rule, carrier)
        || knowledgeLeqValue(rule.consequent.reading, readValuationFiber(carrier, rule.consequent.cell)));
}
export function firedRuleNames(system, carrier) {
    return Object.freeze(system.rules.filter((rule) => antecedentHolds(rule, carrier))
        .map((rule) => rule.name).sort(lexical));
}
export function closureRuleReceipt(system, seed) {
    if (!positiveThresholdGrammar(system))
        throw new TypeError("closureRuleReceipt: unadmitted or nonmonotone rule grammar");
    if (!sameValuationFiber(valuation(system.cells, Object.fromEntries(system.cells.map((cell) => [cell, readValuationFiber(seed, cell)]))), seed))
        throw new TypeError("closureRuleReceipt: seed does not match the admitted finite cell carrier");
    const orbit = closureOrbit(system, seed);
    const closed = orbit[orbit.length - 1];
    const fixed = sameValuationFiber(tstep(system, closed), closed);
    const inflationary = valuationLeqKnowledge(seed, closed);
    const monotone = positiveThresholdGrammar(system);
    const respecting = ruleRespecting(system, closed);
    const stagesInflationary = orbit.every((entry, index) =>
        index === 0 || valuationLeqKnowledge(orbit[index - 1], entry));
    const leastClosed = fixed && inflationary && monotone && respecting && stagesInflationary;
    if (!leastClosed)
        throw new TypeError("closureRuleReceipt: finite immediate-consequence laws failed");
    const firingTrace = Object.freeze(orbit.slice(0, -1).map((entry, stage) => Object.freeze({
        stage,
        firedRules: firedRuleNames(system, entry),
    })));
    return Object.freeze({
        kind: "closureRule.system.receipt:witness",
        system, seed, orbit, closed,
        fixed: true, inflationary: true, monotone: true, ruleRespecting: true,
        leastClosed: true, eventualFixedPoint: true,
        qualification: "finite-positive-threshold-knowledge-join; structural argument, not Lean proof",
        finiteHeightBound: finiteHeightBound(system.cells),
        firingTrace,
        firedAtSeed: firedRuleNames(system, seed),
    });
}
export function alwaysRuleReceipt(cell = "cell", reading = "potential") {
    const system = closureRuleSystem([cell], [alwaysRule(cell, reading)]);
    return closureRuleReceipt(system, knowledgeLeastValuation(system.cells));
}
export const consequentJoin = (current, consequent) => knowledgeJoinValueName(current, consequent);
