import { readingFamilies, readingOfSides, sidesOfReading, readingAs, gauge, negateReading, knowledgeJoinReading, knowledgeMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * analysis/pairwise-stone-clopen - finite executable shadow of
 * RelMath.Cohomology.PairwiseStoneClopen.
 *
 * Lean proves the two-point paired Priestley / pairwise-Stone dual of FOUR:
 * points `{plus, minus}`, antichain order, swap involution, clopen up-sets as
 * boolean membership pairs, and the transport of swap to FOUR negation. This
 * module keeps exactly that finite carrier executable.
 */
export const stonePointNames = Object.freeze(["plus", "minus"]);
export const point = (name) => Object.freeze({
    kind: "pairwiseStone.point",
    name,
});
export const points = Object.freeze(stonePointNames.map(point));
export const clopenUp = (plus, minus) => Object.freeze({
    kind: "pairwiseStone.clopenUp",
    plus,
    minus,
});
/** A clopen up-set's point in FOUR: member `plus` is told for, member `minus` told against. */
const readingOfClopen = (set) => readingOfSides("knowledge", set.plus, set.minus);
const clopenOfReading = (name) => clopenUp(...sidesOfReading(name));
export const bot = clopenOfReading(readingFamilies.knowledge[0]);
export const top = clopenOfReading(readingFamilies.knowledge[3]);
export const allClopens = Object.freeze(readingFamilies.knowledge.map(clopenOfReading));
const sameClopen = (left, right) => left.plus === right.plus && left.minus === right.minus;
const pointName = (value) => typeof value === "string" ? value : value.name;
export const le = (left, right) => pointName(left) === pointName(right);
export const sigma = (value) => pointName(value) === "plus" ? "minus" : "plus";
export const mem = (set, value) => pointName(value) === "plus" ? set.plus : set.minus;
export const meet = (left, right) => clopenOfReading(knowledgeMeetReading(readingOfClopen(left), readingOfClopen(right)));
export const join = (left, right) => clopenOfReading(knowledgeJoinReading(readingOfClopen(left), readingOfClopen(right)));
export const sigmaAct = (set) => clopenOfReading(negateReading(readingOfClopen(set)));
export const toReading = readingOfClopen;
export function ofReading(value) {
    return clopenOfReading(readingAs("knowledge", value));
}
export const tauPlus = allClopens;
export const tauMinus = Object.freeze(tauPlus.map(sigmaAct));
const pairs = (items) => Object.freeze(items.flatMap((left) => items.map((right) => Object.freeze([left, right]))));
const triples = (items) => Object.freeze(items.flatMap((a) => items.flatMap((b) => items.map((c) => Object.freeze([a, b, c])))));
const membersOf = (set) => Object.freeze(stonePointNames.filter((name) => mem(set, name)));
export function orderRecoveredFromTauPlus(left, right) {
    const a = pointName(left);
    const b = pointName(right);
    const specialization = tauPlus.every((set) => !mem(set, a) || mem(set, b));
    return le(a, b) === specialization;
}
export function pairedPriestleyReceipt() {
    const order = Object.freeze(pairs(stonePointNames)
        .filter(([left, right]) => le(left, right))
        .map(([left, right]) => Object.freeze([left, right])));
    const reflexive = stonePointNames.every((name) => le(name, name));
    const transitive = triples(stonePointNames).every(([a, b, c]) => !le(a, b) || !le(b, c) || le(a, c));
    const antisymmetric = pairs(stonePointNames).every(([a, b]) => !le(a, b) || !le(b, a) || a === b);
    const antichain = pairs(stonePointNames).every(([a, b]) => le(a, b) === (a === b));
    const sigmaInvolutive = stonePointNames.every((name) => sigma(sigma(name)) === name);
    const sigmaOrderReversing = pairs(stonePointNames).every(([a, b]) => !le(a, b) || le(sigma(b), sigma(a)));
    if (!reflexive || !transitive || !antisymmetric || !antichain || !sigmaInvolutive || !sigmaOrderReversing) {
        throw new TypeError("pairedPriestleyReceipt: two-point paired-Priestley laws failed");
    }
    return Object.freeze({
        kind: "pairwiseStone.pairedPriestley:witness",
        points,
        order,
        sigma: Object.freeze({ plus: "minus", minus: "plus" }),
        reflexive: true,
        transitive: true,
        antisymmetric: true,
        antichain: true,
        sigmaInvolutive: true,
        sigmaOrderReversing: true,
    });
}
export function clopenLatticeReceipt() {
    const meetCommutative = pairs(allClopens).every(([a, b]) => sameClopen(meet(a, b), meet(b, a)));
    const joinCommutative = pairs(allClopens).every(([a, b]) => sameClopen(join(a, b), join(b, a)));
    const absorption = pairs(allClopens).every(([a, b]) => sameClopen(meet(a, join(a, b)), a) && sameClopen(join(a, meet(a, b)), a));
    const bounded = allClopens.every((set) => sameClopen(meet(bot, set), bot) && sameClopen(join(top, set), top));
    const readingRoundtrip = allClopens.every((set) => sameClopen(ofReading(toReading(set)), set));
    if (!meetCommutative || !joinCommutative || !absorption || !bounded || !readingRoundtrip) {
        throw new TypeError("clopenLatticeReceipt: clopen-upset lattice laws failed");
    }
    return Object.freeze({
        kind: "pairwiseStone.clopenLattice:witness",
        clopens: allClopens,
        bottom: bot,
        top,
        table: Object.freeze(allClopens.map((set) => Object.freeze({
            clopen: set,
            members: membersOf(set),
            reading: toReading(set),
        }))),
        everySubsetClopenUp: true,
        meetCommutative: true,
        joinCommutative: true,
        absorption: true,
        bounded: true,
    });
}
export function swapNegationReceipt() {
    const sigmaInvolutive = stonePointNames.every((name) => sigma(sigma(name)) === name);
    const clopenActionInvolutive = allClopens.every((set) => sameClopen(sigmaAct(sigmaAct(set)), set));
    const transportedAsReadingNegation = allClopens.every((set) => toReading(sigmaAct(set)) === negateReading(toReading(set)));
    const transportedAsGaugeNegation = allClopens.every((set) => toReading(sigmaAct(set)) === gauge("negation", toReading(set)));
    if (!sigmaInvolutive || !clopenActionInvolutive || !transportedAsReadingNegation || !transportedAsGaugeNegation) {
        throw new TypeError("swapNegationReceipt: swap did not transport to FOUR negation");
    }
    return Object.freeze({
        kind: "pairwiseStone.swapNegation:witness",
        sigmaInvolutive: true,
        clopenActionInvolutive: true,
        transportedAsReadingNegation: true,
        transportedAsGaugeNegation: true,
        table: Object.freeze(allClopens.map((set) => Object.freeze({
            clopen: set,
            sigmaAct: sigmaAct(set),
            reading: toReading(set),
            negatedReading: toReading(sigmaAct(set)),
        }))),
    });
}
export function topologyReceipt() {
    const tauMinusIsSigmaImage = tauMinus.every((set, index) => sameClopen(set, sigmaAct(tauPlus[index] ?? bot)));
    const finiteDiscrete = tauPlus.length === 4 && tauMinus.length === 4;
    const orderRecovered = pairs(stonePointNames).every(([left, right]) => orderRecoveredFromTauPlus(left, right));
    if (!tauMinusIsSigmaImage || !finiteDiscrete || !orderRecovered) {
        throw new TypeError("topologyReceipt: pairwise-Stone topology laws failed");
    }
    return Object.freeze({
        kind: "pairwiseStone.topology:witness",
        tauPlus,
        tauMinus,
        tauMinusIsSigmaImage: true,
        finiteDiscrete: true,
        orderRecoveredFromTauPlus: true,
    });
}
export function receipt() {
    return Object.freeze({
        kind: "pairwiseStoneClopen.receipt:witness",
        space: pairedPriestleyReceipt(),
        lattice: clopenLatticeReceipt(),
        swap: swapNegationReceipt(),
        topology: topologyReceipt(),
        duality: "ClopenUp(FourDual) ~= FOUR",
        openFrontier: Object.freeze([
            "General Jung-Rivieccio duality DBiLat^op ~= PairedPriSp is retained as Lean/proof-side structure.",
            "Non-finite compactness and total order-disconnectedness are not runtime obligations for the two-point discrete carrier.",
            "The SEN surface normalizes the finite receipt; it does not synthesize arbitrary Priestley spectra.",
        ]),
    });
}
