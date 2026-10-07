import { readingFamilies, samePoint, sidesOfReading, knowledgeJoinReading, knowledgeMeetReading, negateReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * positing/modal-kripke-four-valued — finite FOUR-valued Kripke frames.
 *
 * Executable shadow of `RelMath.Positing.ModalKripkeFourValued`.
 *
 * The Lean carrier is a finite fibration whose fiber at a cell is the list of
 * cells accessible from it. Runtime parity stores that relation directly:
 * `accessibility[world] = accessible worlds`. Possibility is the knowledge join
 * over a fiber; necessity is the knowledge meet over a fiber.
 */
const freezeRecord = (record) => Object.freeze({ ...record });
const unique = (values) => new Set(values).size === values.length;
const readValuation = (valuation, world) => valuation[world] ?? "absurd";
function knowledgeJoinList(values) {
    return values.reduce((acc, value) => knowledgeJoinReading(acc, value), "absurd");
}
function knowledgeMeetList(values) {
    return values.reduce((acc, value) => knowledgeMeetReading(acc, value), "stable");
}
const leqKnowledgeValue = (left, right) => samePoint(knowledgeJoinReading(left, right), right);
const leqValuationKnowledge = (worlds, left, right) => worlds.every((world) => leqKnowledgeValue(readValuation(left, world), readValuation(right, world)));
const sameValuation = (worlds, left, right) => worlds.every((world) => readValuation(left, world) === readValuation(right, world));
function classifyFrame(reflexive, transitive, symmetric) {
    if (reflexive && transitive && symmetric)
        return "S5";
    if (reflexive && transitive)
        return "S4";
    if (reflexive)
        return "T";
    return "K";
}
export function modalKripkeFrame(worlds, accessibility) {
    if (!unique(worlds))
        throw new TypeError("modalKripkeFrame: duplicate worlds are not a finite carrier");
    const worldSet = new Set(worlds);
    const relation = {};
    for (const world of worlds) {
        const fiber = accessibility[world] ?? [];
        if (!unique(fiber))
            throw new TypeError(`modalKripkeFrame: duplicate accessibility entries from ${world}`);
        for (const target of fiber) {
            if (!worldSet.has(target))
                throw new TypeError(`modalKripkeFrame: ${target} is not a world`);
        }
        relation[world] = Object.freeze([...fiber]);
    }
    const accesses = (from, to) => (relation[from] ?? []).includes(to);
    const reflexive = worlds.every((world) => accesses(world, world));
    const transitive = worlds.every((from) => (relation[from] ?? []).every((mid) => (relation[mid] ?? []).every((to) => accesses(from, to))));
    const symmetric = worlds.every((from) => (relation[from] ?? []).every((to) => accesses(to, from)));
    return Object.freeze({
        kind: "positing.modalKripke.frame",
        worlds: Object.freeze([...worlds]),
        accessibility: freezeRecord(relation),
        reflexive,
        transitive,
        symmetric,
        frameClass: classifyFrame(reflexive, transitive, symmetric),
    });
}
export function possibilize(frame, valuation) {
    const out = {};
    for (const world of frame.worlds) {
        const values = (frame.accessibility[world] ?? []).map((target) => readValuation(valuation, target));
        out[world] = knowledgeJoinList(values);
    }
    return freezeRecord(out);
}
export function necessitate(frame, valuation) {
    const out = {};
    for (const world of frame.worlds) {
        const values = (frame.accessibility[world] ?? []).map((target) => readValuation(valuation, target));
        out[world] = knowledgeMeetList(values);
    }
    return freezeRecord(out);
}
export function closureOp(frame, valuation) {
    return necessitate(frame, possibilize(frame, valuation));
}
export function* valuations(worlds) {
    function* go(index, record) {
        if (index === worlds.length) {
            yield freezeRecord(record);
            return;
        }
        const world = worlds[index];
        for (const value of readingFamilies.knowledge) {
            record[world] = value;
            yield* go(index + 1, record);
        }
        delete record[world];
    }
    yield* go(0, {});
}
function requireExhaustiveWorlds(frame) {
    if (frame.worlds.length > 5) {
        throw new RangeError("modalKripkeReceipt: exhaustive FOUR-valued law checks are limited to at most 5 worlds");
    }
}
function checkKMonotone(frame, op) {
    for (const left of valuations(frame.worlds)) {
        for (const right of valuations(frame.worlds)) {
            if (leqValuationKnowledge(frame.worlds, left, right)
                && !leqValuationKnowledge(frame.worlds, op(frame, left), op(frame, right))) {
                return false;
            }
        }
    }
    return true;
}
function checkTInflation(frame) {
    if (!frame.reflexive)
        return Object.freeze([false, false]);
    for (const valuation of valuations(frame.worlds)) {
        if (!leqValuationKnowledge(frame.worlds, valuation, possibilize(frame, valuation)))
            return Object.freeze([false, false]);
        if (!leqValuationKnowledge(frame.worlds, necessitate(frame, valuation), valuation))
            return Object.freeze([false, false]);
    }
    return Object.freeze([true, true]);
}
function checkS4Idempotence(frame) {
    if (!frame.reflexive || !frame.transitive)
        return Object.freeze([false, false]);
    for (const valuation of valuations(frame.worlds)) {
        const box = necessitate(frame, valuation);
        const diamond = possibilize(frame, valuation);
        if (!sameValuation(frame.worlds, necessitate(frame, box), box))
            return Object.freeze([false, false]);
        if (!sameValuation(frame.worlds, possibilize(frame, diamond), diamond))
            return Object.freeze([false, false]);
    }
    return Object.freeze([true, true]);
}
function checkS5Adjunction(frame) {
    if (frame.frameClass !== "S5")
        return false;
    for (const left of valuations(frame.worlds)) {
        for (const right of valuations(frame.worlds)) {
            const diamondBelow = leqValuationKnowledge(frame.worlds, possibilize(frame, left), right);
            const belowBox = leqValuationKnowledge(frame.worlds, left, necessitate(frame, right));
            if (diamondBelow !== belowBox)
                return false;
        }
    }
    return true;
}
function checkS5Commutating(frame) {
    if (frame.frameClass !== "S5")
        return false;
    for (const valuation of valuations(frame.worlds)) {
        if (!leqValuationKnowledge(frame.worlds, possibilize(frame, necessitate(frame, valuation)), necessitate(frame, possibilize(frame, valuation))))
            return false;
    }
    return true;
}
function checkS5Closure(frame) {
    if (frame.frameClass !== "S5")
        return Object.freeze([false, false, false, false]);
    let equalsPossibilize = true;
    let inflationary = true;
    let idempotent = true;
    for (const valuation of valuations(frame.worlds)) {
        const closed = closureOp(frame, valuation);
        if (!sameValuation(frame.worlds, closed, possibilize(frame, valuation)))
            equalsPossibilize = false;
        if (!leqValuationKnowledge(frame.worlds, valuation, closed))
            inflationary = false;
        if (!sameValuation(frame.worlds, closureOp(frame, closed), closed))
            idempotent = false;
    }
    let monotone = true;
    for (const left of valuations(frame.worlds)) {
        for (const right of valuations(frame.worlds)) {
            if (leqValuationKnowledge(frame.worlds, left, right)
                && !leqValuationKnowledge(frame.worlds, closureOp(frame, left), closureOp(frame, right))) {
                monotone = false;
            }
        }
    }
    return Object.freeze([equalsPossibilize, inflationary, monotone, idempotent]);
}
function checkAdjunctionUnit(frame) {
    if (frame.frameClass !== "S5")
        return false;
    return [...valuations(frame.worlds)].every((valuation) => leqValuationKnowledge(frame.worlds, valuation, necessitate(frame, possibilize(frame, valuation))));
}
function checkAdjunctionCounit(frame) {
    if (frame.frameClass !== "S5")
        return false;
    return [...valuations(frame.worlds)].every((valuation) => leqValuationKnowledge(frame.worlds, possibilize(frame, necessitate(frame, valuation)), valuation));
}
function checkSettledLeast(frame, seed) {
    const settled = closureOp(frame, seed);
    return sameValuation(frame.worlds, closureOp(frame, settled), settled)
        && [...valuations(frame.worlds)].every((candidate) => !(leqValuationKnowledge(frame.worlds, seed, candidate)
            && sameValuation(frame.worlds, closureOp(frame, candidate), candidate))
            || leqValuationKnowledge(frame.worlds, settled, candidate));
}
export function twistSplit(value) {
    const reading = value;
    return Object.freeze({
        kind: "positing.modalKripke.twistSplit",
        value,
        positive: sidesOfReading(reading)[0],
        negative: sidesOfReading(reading)[1],
    });
}
const checkTwistSplitNegate = () => readingFamilies.knowledge.every((name) => {
    const original = twistSplit(name);
    const negated = twistSplit(negateReading(name));
    return negated.positive === original.negative && negated.negative === original.positive;
});
export function modalKripkeReceipt(frame, valuation) {
    requireExhaustiveWorlds(frame);
    const kPossibilizeMonotone = checkKMonotone(frame, possibilize);
    const kNecessitateMonotone = checkKMonotone(frame, necessitate);
    const [tPossibilizeInflationary, tNecessitateDeflationary] = checkTInflation(frame);
    const [s4BoxIdempotent, s4DiamondIdempotent] = checkS4Idempotence(frame);
    const [s5ClosureEqualsPossibilize, s5ClosureInflationary, s5ClosureMonotone, s5ClosureIdempotent] = checkS5Closure(frame);
    if (!kPossibilizeMonotone || !kNecessitateMonotone || !checkTwistSplitNegate()) {
        throw new TypeError("modalKripkeReceipt: finite modal law checks failed");
    }
    return Object.freeze({
        kind: "positing.modalKripke.receipt:witness",
        frame,
        valuation: freezeRecord({ ...valuation }),
        possibilized: possibilize(frame, valuation),
        necessitated: necessitate(frame, valuation),
        kPossibilizeMonotone: true,
        kNecessitateMonotone: true,
        tPossibilizeInflationary,
        tNecessitateDeflationary,
        s4BoxInterior: s4BoxIdempotent && tNecessitateDeflationary,
        s4DiamondClosure: s4DiamondIdempotent && tPossibilizeInflationary,
        s4BoxIdempotent,
        s4DiamondIdempotent,
        s5ForgetsToS4: frame.frameClass === "S5" ? frame.reflexive && frame.transitive : false,
        s5PossibilizeAdjointNecessitate: checkS5Adjunction(frame),
        s5Commutating: checkS5Commutating(frame),
        s5ClosureEqualsPossibilize,
        s5ClosureInflationary,
        s5ClosureMonotone,
        s5ClosureIdempotent,
        hierarchy: Object.freeze(["K", "T", "S4", "S5"]),
        twistSplit: Object.freeze(readingFamilies.knowledge.map(twistSplit)),
        twistSplitNegate: true,
    });
}
/** Bundle the finite Node shadow of `RelMath.Closure.ModalPairAdjunction`. */
export function modalPairAdjunctionReceipt(frame, valuation) {
    requireExhaustiveWorlds(frame);
    if (frame.frameClass !== "S5") {
        throw new TypeError("modalPairAdjunctionReceipt: RelMath modal pair adjunction requires an S5/equivalence frame");
    }
    const base = modalKripkeReceipt(frame, valuation);
    const unit = checkAdjunctionUnit(frame);
    const counit = checkAdjunctionCounit(frame);
    const settleLeast = checkSettledLeast(frame, valuation);
    if (!base.tPossibilizeInflationary || !base.tNecessitateDeflationary
        || !base.kPossibilizeMonotone || !base.kNecessitateMonotone
        || !base.s5PossibilizeAdjointNecessitate || !unit || !counit
        || !base.s5Commutating || !base.s5ClosureEqualsPossibilize
        || !base.s5ClosureInflationary || !base.s5ClosureMonotone
        || !base.s5ClosureIdempotent || !settleLeast) {
        throw new TypeError("modalPairAdjunctionReceipt: finite modal-pair laws failed");
    }
    return Object.freeze({
        kind: "positing.modalPairAdjunction.receipt:witness",
        theorem: "RelMath.Valuation.ModalFrame.closureOp_is_closure",
        frame,
        valuation: freezeRecord({ ...valuation }),
        possibilized: base.possibilized,
        necessitated: base.necessitated,
        closure: closureOp(frame, valuation),
        modalFrameS5: true,
        possibilizeInflationary: true,
        necessitateDeflationary: true,
        possibilizeMonotone: true,
        necessitateMonotone: true,
        possibilizeAdjointNecessitate: true,
        adjunctionUnit: true,
        adjunctionCounit: true,
        necessitatePossibilizeLe: true,
        closureEqualsPossibilize: true,
        closureInflationary: true,
        closureMonotone: true,
        closureIdempotent: true,
        settled: closureOp(frame, valuation),
        settleFixed: true,
        settleLeast: true,
    });
}
