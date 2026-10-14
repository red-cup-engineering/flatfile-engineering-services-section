import { readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const uniqueSorted = (values) => {
    const out = new Set();
    for (const value of values) {
        if (typeof value !== "string" || value.length === 0)
            throw new TypeError("dFrame: element names must be nonempty strings");
        out.add(value);
    }
    // Mark identities are opaque strings. UTF-16 code-unit ordering is fixed
    // by JavaScript; localeCompare depends on host locale/ICU and is not a
    // reproducible content-addressed ordering between computing agents.
    return Object.freeze([...out].sort());
};
export function subset(elements) {
    return Object.freeze({
        kind: "dFrame.subset",
        elements: uniqueSorted(elements),
    });
}
const assertSubsetOf = (universe, value) => {
    for (const element of value.elements) {
        if (!universe.includes(element)) {
            throw new TypeError(`dFrame: subset element ${JSON.stringify(element)} is outside the universe`);
        }
    }
};
export const includes = (value, element) => value.elements.includes(element);
export const le = (left, right) => left.elements.every((element) => right.elements.includes(element));
export const sameSubset = (left, right) => le(left, right) && le(right, left);
export const meet = (left, right) => subset(left.elements.filter((element) => right.elements.includes(element)));
export const join = (left, right) => subset([...left.elements, ...right.elements]);
export const finiteSup = (family) => family.reduce((accumulator, value) => join(accumulator, value), subset([]));
/** The relative pseudocomplement a => b in the *finite powerset* frame P(U).
 * Membership proves c ∧ a ≤ b iff c ≤ (U \\ a) ∪ b. This is a Boolean
 * Heyting special case, NOT an implication on an arbitrary d-frame, a claim
 * about evidence/FOUR negation, or a gluing rule for observed sheaf fibers.
 * Pure, size-independent set algebra; the exhaustive receipt separately
 * controls its own five-mark combinatorial budget. */
export function powersetHeytingImplication(universeInput, antecedent, consequent) {
    if (!Array.isArray(universeInput))
        throw new TypeError("dFrame: powerset implication requires one finite universe array");
    const universe = uniqueSorted(universeInput);
    function admit(value, label) {
        if (value?.kind !== "dFrame.subset" || !Array.isArray(value.elements))
            throw new TypeError(`dFrame: powerset implication ${label} must be a subset carrier`);
        const canonical = subset(value.elements);
        assertSubsetOf(universe, canonical);
        return canonical;
    }
    const a = admit(antecedent, "antecedent");
    const b = admit(consequent, "consequent");
    return join(subset(universe.filter((element) => !includes(a, element))), b);
}

/** Heyting pseudocomplement in P(U). Not Belnap/FOUR opposition. */
export function powersetHeytingNegation(universeInput, value) {
    return powersetHeytingImplication(universeInput, value, subset([]));
}

export const disjoint = (left, right) => left.elements.every((element) => !right.elements.includes(element));
export const covers = (universe, left, right) => universe.every((element) => left.elements.includes(element) || right.elements.includes(element));
export function allSubsets(universeInput) {
    const universe = uniqueSorted(universeInput);
    const count = 2 ** universe.length;
    if (count > 4096)
        throw new TypeError("dFrame.allSubsets: universe too large for exhaustive powerset receipt");
    return Object.freeze(Array.from({ length: count }, (_, mask) => subset(universe.filter((_, index) => (mask & (1 << index)) !== 0))));
}
const pairs = (items) => Object.freeze(items.flatMap((left) => items.map((right) => Object.freeze([left, right]))));
const triples = (items) => Object.freeze(items.flatMap((a) => items.flatMap((b) => items.map((c) => Object.freeze([a, b, c])))));
// Exhaustive subsets are finite, but enumerating every family of those
// subsets costs 2^(2^n). A 5-mark universe already creates billions of
// families. Receive frame laws through finite binary generators instead.
const MAX_EXHAUSTIVE_RECEIPT_MARKS = 5;
function finiteReceiptUniverse(input, name) {
    if (!Array.isArray(input) || input.length > MAX_EXHAUSTIVE_RECEIPT_MARKS) {
        throw new RangeError(`${name}: exhaustive finite receipts admit at most ${MAX_EXHAUSTIVE_RECEIPT_MARKS} marks`);
    }
    return uniqueSorted(input);
}
/** Pure public admission for a finite-frame request. The effectful seller
 * may invoke this before payment, then call powersetFrameReceipt with the
 * admitted carrier; neither function accesses a clock, network or ledger. */
export function admitFiniteFrameUniverse(input) {
    return finiteReceiptUniverse(input, "powersetFrameReceipt");
}
export function powersetFrameReceipt(universeInput = ["x", "y", "z"]) {
    const universe = finiteReceiptUniverse(universeInput, "powersetFrameReceipt");
    const subsets = allSubsets(universe);
    const bottom = subset([]);
    const top = subset(universe);
    const comparisons = pairs(subsets);
    const witnesses = triples(subsets);
    const meetCommutative = comparisons.every(([a, b]) => sameSubset(meet(a, b), meet(b, a)));
    const meetAssociative = witnesses.every(([a, b, c]) => sameSubset(meet(meet(a, b), c), meet(a, meet(b, c))));
    const meetIdempotent = subsets.every((value) => sameSubset(meet(value, value), value));
    // Binary join is a least upper bound with empty bottom. Since finiteSup
    // folds binary joins from bottom, induction proves the least-upper-bound
    // law for every finite family, without generating all such families.
    const unionSupLeastUpperBound = subsets.every((a) => sameSubset(join(bottom, a), a))
        && comparisons.every(([a, b]) => {
            const sup = join(a, b);
            return le(a, sup) && le(b, sup)
                && subsets.every((upper) => !le(a, upper) || !le(b, upper) || le(sup, upper));
        });
    // Meet preserves bottom and each binary join. Induction on finiteSup
    // then proves distribution over every finite family.
    const meetDistributesOverFiniteSup = subsets.every((a) => sameSubset(meet(a, bottom), bottom))
        && witnesses.every(([a, b, c]) =>
            sameSubset(meet(a, join(b, c)), join(meet(a, b), meet(a, c))));
    if (!meetCommutative || !meetAssociative || !meetIdempotent || !unionSupLeastUpperBound || !meetDistributesOverFiniteSup) {
        throw new TypeError("powersetFrameReceipt: finite powerset-frame laws failed");
    }
    return Object.freeze({
        kind: "dFrame.powersetFrame:witness",
        universe, subsetCount: subsets.length, bottom, top,
        meetCommutative: true, meetAssociative: true, meetIdempotent: true,
        unionSupLeastUpperBound: true, meetDistributesOverFiniteSup: true,
    });
}
export function canonicalDFrameReceipt(universeInput = ["plus", "minus"]) {
    const universe = finiteReceiptUniverse(universeInput, "canonicalDFrameReceipt");
    const subsets = allSubsets(universe);
    const comparisons = pairs(subsets);
    const conDownwardClosed = comparisons.every(([a, b]) => !disjoint(a, b)
        || comparisons.every(([aPrime, bPrime]) => !le(aPrime, a) || !le(bPrime, b) || disjoint(aPrime, bPrime)));
    const totUpwardClosed = comparisons.every(([a, b]) => !covers(universe, a, b)
        || comparisons.every(([aPrime, bPrime]) => !le(a, aPrime) || !le(b, bPrime) || covers(universe, aPrime, bPrime)));
    if (!conDownwardClosed || !totUpwardClosed) {
        throw new TypeError("canonicalDFrameReceipt: finite d-frame closure laws failed");
    }
    return Object.freeze({
        kind: "dFrame.canonical:witness",
        universe,
        positiveFrame: powersetFrameReceipt(universe),
        negativeFrame: powersetFrameReceipt(universe),
        consistentExample: Object.freeze([subset(universe.slice(0, 1)), subset(universe.slice(1, 2))]),
        totalExample: Object.freeze([subset(universe.slice(0, 1)), subset(universe.slice(1))]),
        conIsDisjointness: true,
        totIsCovering: true,
        conDownwardClosed: true,
        totUpwardClosed: true,
    });
}
/** The sides (told for, told against) of a reading named in the caller's four-valued vocabulary,
 *  by mapping the vocabulary's four roles onto the data layer's FOUR points. */
function sidesInVocabulary(names, reading) {
    const point = [[names.bottom, readingOfSides("knowledge", false, false)], [names.positiveOnly, readingOfSides("knowledge", true, false)], [names.negativeOnly, readingOfSides("knowledge", false, true)], [names.top, readingOfSides("knowledge", true, true)]]
        .find(([name]) => name === reading);
    return point === undefined ? [false, false] : sidesOfReading(point[1]);
}
/** Pure local-section admission. Unknown names, duplicate cells, or
 * conflicting readings must not silently become bottom or globally glue. */
function admitFourValuation(names, valuation) {
    const roles = ["bottom", "positiveOnly", "negativeOnly", "top"];
    if (names === null || typeof names !== "object" ||
        roles.some((key) => typeof names[key] !== "string" || names[key].length === 0) ||
        new Set(roles.map((key) => names[key])).size !== 4) {
        throw new TypeError("dFrame: one distinct four-valued reading vocabulary is required");
    }
    if (!Array.isArray(valuation)) throw new TypeError("dFrame: valuation must be an array of cells");
    const seen = new Set();
    for (const entry of valuation) {
        if (entry === null || typeof entry !== "object" ||
            typeof entry.cell !== "string" || entry.cell.length === 0 ||
            !roles.some((key) => entry.reading === names[key])) {
            throw new TypeError("dFrame: valuation requires one named cell and admitted FOUR reading");
        }
        if (seen.has(entry.cell)) throw new TypeError("dFrame: duplicate valuation cell cannot be glued");
        seen.add(entry.cell);
    }
}
export function dK(names, valuation) {
    admitFourValuation(names, valuation);
    return subset(valuation.filter((entry) => sidesInVocabulary(names, entry.reading)[0]).map((entry) => entry.cell));
}
export function dF(names, valuation) {
    admitFourValuation(names, valuation);
    return subset(valuation.filter((entry) => sidesInVocabulary(names, entry.reading)[1]).map((entry) => entry.cell));
}
export function settledMask(names, valuation, clopen) {
    admitFourValuation(names, valuation);
    return subset(valuation
        .filter((entry) => entry.reading !== names.bottom && clopen.elements.includes(entry.cell))
        .map((entry) => entry.cell));
}
export const restrictSub = (clopen, value) => meet(clopen, value);
/** Pure receiving for a finite FOUR-valued local section, exposing exactly
 * the same mark/reading and clopen restrictions that computation will use.
 * It must be callable by an x402 pre-payment validator without executing the
 * exhaustive sheaf calculation or opening a persistent result store. */
export function admitValuedSheaf(names, valuationInput, clopenInput) {
    const valuation = Object.freeze([...valuationInput]);
    admitFourValuation(names, valuation);
    const universe = finiteReceiptUniverse(valuation.map((entry) => entry.cell), "valuedSheafReceipt");
    const clopen = clopenInput ?? subset(valuation.map((entry) => entry.cell));
    if (!Array.isArray(clopen?.elements)) {
        throw new TypeError("dFrame: clopen restriction must be a subset carrier");
    }
    assertSubsetOf(universe, clopen);
    return Object.freeze({ valuation, universe, clopen });
}
export function valuedSheafReceipt(names, valuationInput, clopenInput) {
    const { valuation, universe, clopen } = admitValuedSheaf(names, valuationInput, clopenInput);
    const subsets = allSubsets(universe);
    const comparisons = pairs(subsets);
    const positiveSupport = meet(dK(names, valuation), clopen);
    const negativeSupport = meet(dF(names, valuation), clopen);
    const settledSupport = settledMask(names, valuation, clopen);
    const con = (a, b) => disjoint(a, b);
    const tot = (a, b) => settledSupport.elements.every((cell) => includes(a, cell) || includes(b, cell));
    const conDownwardClosed = comparisons.every(([a, b]) => !con(a, b)
        || comparisons.every(([aPrime, bPrime]) => !le(aPrime, a) || !le(bPrime, b) || con(aPrime, bPrime)));
    const totUpwardClosed = comparisons.every(([a, b]) => !tot(a, b)
        || comparisons.every(([aPrime, bPrime]) => !le(a, aPrime) || !le(b, bPrime) || tot(aPrime, bPrime)));
    const topSharedByBothSides = valuation
        .filter((entry) => entry.reading === names.top && clopen.elements.includes(entry.cell))
        .every((entry) => includes(positiveSupport, entry.cell) && includes(negativeSupport, entry.cell));
    const bottomInNeitherSide = valuation
        .filter((entry) => entry.reading === names.bottom)
        .every((entry) => !includes(positiveSupport, entry.cell) && !includes(negativeSupport, entry.cell));
    const subClopen = subset(clopen.elements.filter((_, index) => index % 2 === 0));
    const restrictionMeetPreserving = comparisons.every(([a, b]) => sameSubset(restrictSub(subClopen, meet(a, b)), meet(restrictSub(subClopen, a), restrictSub(subClopen, b))));
    const restrictionTop = restrictSub(subClopen, subset(universe));
    const restrictionMonotone = comparisons.every(([a, b]) => !le(a, b) || le(restrictSub(subClopen, a), restrictSub(subClopen, b)));
    const restrictionPreservesCon = comparisons.every(([a, b]) => !con(a, b) || con(restrictSub(subClopen, a), restrictSub(subClopen, b)));
    if (!conDownwardClosed || !totUpwardClosed || !topSharedByBothSides || !bottomInNeitherSide
        || !restrictionMeetPreserving || !restrictionMonotone || !restrictionPreservesCon) {
        throw new TypeError("valuedSheafReceipt: finite d-frame-valued sheaf laws failed");
    }
    return Object.freeze({
        kind: "dFrame.valuedSheaf:witness",
        valuation,
        clopen,
        positiveSupport,
        negativeSupport,
        settledSupport,
        topSharedByBothSides: true,
        bottomInNeitherSide: true,
        conDownwardClosed: true,
        totUpwardClosed: true,
        restrictionMeetPreserving: true,
        restrictionTop,
        restrictionMonotone: true,
        restrictionPreservesCon: true,
    });
}
export function dFrameReceipt(names, valuationInput) {
    return Object.freeze({
        kind: "dFrame.receipt:witness",
        powerset: powersetFrameReceipt(),
        canonical: canonicalDFrameReceipt(),
        valuedSheaf: valuedSheafReceipt(names, valuationInput),
        openFrontier: Object.freeze([
            "The runtime receipt checks finite powerset-frame laws; arbitrary Prop-valued frames and infinitary suprema remain Lean-side.",
            "The d-frame-valued sheaf is modeled over finite valued cells and masks, not arbitrary bitopological sites or all clopen covers.",
            "General d-frame morphism categories and non-finite frame-valued sheaf cohomology remain proof/kernel obligations.",
        ]),
    });
}
