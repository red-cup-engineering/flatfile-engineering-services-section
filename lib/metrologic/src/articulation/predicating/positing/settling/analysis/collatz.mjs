export const collatzAffineTraceSchema = {
    $id: "metroplat/closure/analysis/collatz/affine-trace",
    type: "object",
    required: ["kind", "A", "B", "C"],
    properties: {
        kind: { const: "collatz.affineTrace" },
        A: { type: "number" },
        B: { type: "number" },
        C: { type: "number" },
    },
    additionalProperties: false,
    title: "CollatzAffineTrace",
    description: "The affine trace (A, B, C) of an accelerated Collatz step word.",
};
const nat = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${label} must be a non-negative safe integer`);
    return value;
};
const posNat = (value, label) => {
    nat(value, label);
    if (value === 0)
        throw new RangeError(`${label} must be positive`);
    return value;
};
const pow = (base, exponent) => {
    nat(exponent, "exponent");
    return base ** exponent;
};
/** The accelerated Collatz map: even `n/2`, odd `(3n+1)/2`. */
export function step(n) {
    nat(n, "n");
    return n % 2 === 0 ? n / 2 : (3 * n + 1) / 2;
}
/** The branch selected by the accelerated map. */
export function branch(n) {
    nat(n, "n");
    return n % 2 === 0 ? "E" : "O";
}
/** The iterate `T^k(n)`. */
export function orbit(seed, length) {
    nat(seed, "seed");
    nat(length, "length");
    let value = seed;
    for (let index = 0; index < length; index += 1)
        value = step(value);
    return value;
}
/** The parity word of the first `length` accelerated steps. */
export function parityWord(seed, length) {
    nat(seed, "seed");
    nat(length, "length");
    const word = [];
    let value = seed;
    for (let index = 0; index < length; index += 1) {
        word.push(branch(value));
        value = step(value);
    }
    return Object.freeze(word);
}
/** Count the odd branches in a parity word. */
export function oddCount(word) {
    return word.filter((item) => item === "O").length;
}
export const identityTrace = Object.freeze({ kind: "collatz.affineTrace", A: 1, B: 1, C: 0 });
export const evenTrace = Object.freeze({ kind: "collatz.affineTrace", A: 1, B: 2, C: 0 });
export const oddTrace = Object.freeze({ kind: "collatz.affineTrace", A: 3, B: 2, C: 1 });
/** Compose affine traces: `g.comp f` realizes "`f` then `g`". */
export function composeTrace(g, f) {
    return Object.freeze({
        kind: "collatz.affineTrace",
        A: g.A * f.A,
        B: g.B * f.B,
        C: g.A * f.C + f.B * g.C,
    });
}
/** Advance an affine trace by one parity letter. */
export function traceStep(trace, letter) {
    return Object.freeze(letter === "E"
        ? { kind: "collatz.affineTrace", A: trace.A, B: 2 * trace.B, C: trace.C }
        : { kind: "collatz.affineTrace", A: 3 * trace.A, B: 2 * trace.B, C: 3 * trace.C + trace.B });
}
/** Accumulate the affine trace of a finite parity word. */
export function traceOfWord(word) {
    return word.reduce((trace, letter) => traceStep(trace, letter), identityTrace);
}
/** Lean `affine_trace_parityWord`: `B_w*T^k(n)=A_w*n+C_w`, as a finite witness. */
export function affineTraceParityWord(seed, length) {
    const word = parityWord(seed, length);
    const trace = traceOfWord(word);
    const iterate = orbit(seed, length);
    const lhs = trace.B * iterate;
    const rhs = trace.A * seed + trace.C;
    return Object.freeze({
        kind: "collatz.affineTraceParityWord:witness",
        seed,
        length,
        word,
        trace,
        iterate,
        lhs,
        rhs,
        holds: lhs === rhs,
        coefficientContracting: trace.A < trace.B,
        descends: iterate < seed,
    });
}
export function coefficientContracting(word) {
    const trace = traceOfWord(word);
    return trace.A < trace.B;
}
export function coefficientNoncontracting(word) {
    const trace = traceOfWord(word);
    return trace.B <= trace.A;
}
const properPrefixesNoncontracting = (word) => word.every((_, index) => coefficientNoncontracting(word.slice(0, index)));
/** Lean `FirstPassageWord`: the first prefix where `A < B`. */
export function firstPassageWord(word) {
    const frozen = Object.freeze([...word]);
    const trace = traceOfWord(frozen);
    const contracting = trace.A < trace.B;
    const prefixes = properPrefixesNoncontracting(frozen);
    if (frozen.length === 0) {
        return Object.freeze({ kind: "collatz.firstPassage-obstruction", word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "empty" });
    }
    if (!contracting) {
        return Object.freeze({ kind: "collatz.firstPassage-obstruction", word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "not-contracting" });
    }
    if (!prefixes) {
        return Object.freeze({ kind: "collatz.firstPassage-obstruction", word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "prefix-contracts" });
    }
    return Object.freeze({
        kind: "collatz.firstPassage:witness",
        word: frozen,
        trace,
        contracting,
        properPrefixesNoncontracting: prefixes,
        last: frozen[frozen.length - 1],
        endsInE: frozen[frozen.length - 1] === "E",
        lowerPower: pow(2, frozen.length - 1),
        middlePower: pow(3, oddCount(frozen)),
        upperPower: pow(2, frozen.length),
    });
}
/** Lean `ParentBarrier`: `B ≤ A < 2B`, with every proper prefix noncontracting. */
export function parentBarrier(word) {
    const frozen = Object.freeze([...word]);
    const trace = traceOfWord(frozen);
    const noncontracting = trace.B <= trace.A;
    const belowNextEvenCrossing = trace.A < 2 * trace.B;
    const prefixes = properPrefixesNoncontracting(frozen);
    if (noncontracting && belowNextEvenCrossing && prefixes) {
        return Object.freeze({
            kind: "collatz.parentBarrier:witness",
            word: frozen,
            trace,
            noncontracting,
            belowNextEvenCrossing,
            properPrefixesNoncontracting: prefixes,
            appendEFirstPassage: firstPassageWord([...frozen, "E"]).kind === "collatz.firstPassage:witness",
            D: 2 * trace.B - trace.A,
            M: 2 * trace.B,
        });
    }
    return Object.freeze({
        kind: "collatz.parentBarrier-obstruction",
        word: frozen,
        trace,
        noncontracting,
        belowNextEvenCrossing,
        properPrefixesNoncontracting: prefixes,
        reason: !noncontracting ? "contracting" : !belowNextEvenCrossing ? "beyond-next-even-crossing" : "prefix-contracts",
    });
}
export const twoAdicFactorWitnessSchema = {
    $id: "metroplat/closure/analysis/collatz/two-adic-factor-witness",
    type: "object",
    required: ["kind", "value", "exponent", "oddPart", "holds"],
    properties: {
        kind: { const: "collatz.twoAdicFactor:witness" },
        value: { type: "number" },
        exponent: { type: "number" },
        oddPart: { type: "number" },
        holds: { type: "boolean" },
    },
    additionalProperties: false,
    title: "TwoAdicFactorWitness",
    description: "A positive integer factored as 2^exponent * oddPart.",
};
/** Factor a positive integer as `2^k * odd`. */
export function twoAdicFactor(value) {
    posNat(value, "value");
    let exponent = 0;
    let oddPart = value;
    while (oddPart % 2 === 0) {
        exponent += 1;
        oddPart /= 2;
    }
    return Object.freeze({
        kind: "collatz.twoAdicFactor:witness",
        value,
        exponent,
        oddPart,
        holds: pow(2, exponent) * oddPart === value && oddPart % 2 === 1,
    });
}
export const shortcutOddPartWitnessSchema = {
    $id: "metroplat/closure/analysis/collatz/shortcut-odd-part-witness",
    type: "object",
    required: ["kind", "seed", "expanded", "value", "exponent", "oddPart", "holds", "nonemptyHalvingRun"],
    properties: {
        kind: { const: "collatz.shortcutOddPart:witness" },
        seed: { type: "number" },
        expanded: { type: "number" },
        value: { type: "number" },
        exponent: { type: "number" },
        oddPart: { type: "number" },
        holds: { type: "boolean" },
        nonemptyHalvingRun: { type: "boolean" },
    },
    additionalProperties: false,
    title: "ShortcutOddPartWitness",
    description: "For odd seed n, the factoring of 3n+1 = 2^exponent * oddPart.",
};
/** For odd `n`, factor `3n+1 = 2^k*m` with `k ≥ 1` and odd `m`. */
export function shortcutOddPart(seed) {
    posNat(seed, "seed");
    if (seed % 2 !== 1)
        throw new RangeError("shortcutOddPart: seed must be odd");
    const expanded = 3 * seed + 1;
    const factor = twoAdicFactor(expanded);
    return Object.freeze({
        kind: "collatz.shortcutOddPart:witness",
        seed,
        expanded,
        value: expanded,
        exponent: factor.exponent,
        oddPart: factor.oddPart,
        holds: factor.holds,
        nonemptyHalvingRun: factor.exponent >= 1,
    });
}
/** Distinct values reached before stage `length`. */
export function reachedSet(seed, length) {
    nat(seed, "seed");
    nat(length, "length");
    const reached = new Set();
    for (let index = 0; index < length; index += 1)
        reached.add(orbit(seed, index));
    return Object.freeze([...reached].sort((left, right) => left - right));
}
export const reachedQuiescenceWitnessSchema = {
    $id: "metroplat/closure/analysis/collatz/reached-quiescence-witness",
    type: "object",
    required: ["kind", "seed", "stage", "reached", "nextReached", "quiesces", "revisitAt", "terminal"],
    properties: {
        kind: { const: "collatz.reachedQuiescence:witness" },
        seed: { type: "number" },
        stage: { type: "number" },
        reached: { type: "array", items: { type: "number" } },
        nextReached: { type: "array", items: { type: "number" } },
        quiesces: { type: "boolean" },
        revisitAt: { type: "number" },
        terminal: { type: "boolean" },
    },
    additionalProperties: false,
    title: "ReachedQuiescenceWitness",
    description: "Stage k+1 of the reached-set reaches nothing new.",
};
export const reachedQuiescenceObstructionSchema = {
    $id: "metroplat/closure/analysis/collatz/reached-quiescence-obstruction",
    type: "object",
    required: ["kind", "seed", "stage", "reached", "nextReached", "quiesces"],
    properties: {
        kind: { const: "collatz.reachedQuiescence-obstruction" },
        seed: { type: "number" },
        stage: { type: "number" },
        reached: { type: "array", items: { type: "number" } },
        nextReached: { type: "array", items: { type: "number" } },
        quiesces: { type: "boolean" },
    },
    additionalProperties: false,
    title: "ReachedQuiescenceObstruction",
    description: "Stage k+1 of the reached-set has not yet quiesced.",
};
/** Finite reached-set quiescence: stage `k+1` reaches nothing new. */
export function reachedQuiescence(seed, stage) {
    posNat(seed, "seed");
    nat(stage, "stage");
    const reached = reachedSet(seed, stage);
    const nextReached = reachedSet(seed, stage + 1);
    const quiesces = reached.length === nextReached.length && reached.every((value, index) => value === nextReached[index]);
    if (!quiesces) {
        return Object.freeze({ kind: "collatz.reachedQuiescence-obstruction", seed, stage, reached, nextReached, quiesces });
    }
    const value = orbit(seed, stage);
    const revisitAt = reached.indexOf(value);
    return Object.freeze({
        kind: "collatz.reachedQuiescence:witness",
        seed,
        stage,
        reached,
        nextReached,
        quiesces,
        revisitAt,
        terminal: value === 1 || value === 2,
    });
}
/** Membership in the two-generator semigroup `<a,b>`, searched finitely up to `x`. */
export function inTwoGenSemigroup(x, a, b) {
    nat(x, "x");
    posNat(a, "a");
    posNat(b, "b");
    for (let m = 0; a * m <= x; m += 1) {
        const rest = x - a * m;
        if (rest % b === 0)
            return true;
    }
    return false;
}
const gcd = (left, right) => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0)
        [a, b] = [b, a % b];
    return a;
};
export const residueCharacterizationWitnessSchema = {
    $id: "metroplat/closure/analysis/collatz/residue-characterization-witness",
    type: "object",
    required: ["kind", "C", "D", "M", "residue", "semigroupMember", "residueInequality", "equivalent", "gap"],
    properties: {
        kind: { const: "collatz.residueCharacterization:witness" },
        C: { type: "number" },
        D: { type: "number" },
        M: { type: "number" },
        residue: { type: "number" },
        semigroupMember: { type: "boolean" },
        residueInequality: { type: "boolean" },
        equivalent: { type: "boolean" },
        gap: { type: "number" },
    },
    additionalProperties: false,
    title: "ResidueCharacterizationWitness",
    description: "Finite residue characterization: C is in <D,M> iff D*r <= C for coprime D,M.",
};
/** Finite residue characterization: `C ∈ <D,M>` iff `D*r ≤ C` for coprime `D,M`. */
export function residueCharacterization(C, D, M) {
    nat(C, "C");
    posNat(D, "D");
    posNat(M, "M");
    if (gcd(D, M) !== 1)
        throw new RangeError("residueCharacterization: D and M must be coprime");
    let residue = 0;
    while ((D * residue) % M !== C % M)
        residue += 1;
    const semigroupMember = inTwoGenSemigroup(C, D, M);
    const residueInequality = D * residue <= C;
    return Object.freeze({
        kind: "collatz.residueCharacterization:witness",
        C,
        D,
        M,
        residue,
        semigroupMember,
        residueInequality,
        equivalent: semigroupMember === residueInequality,
        gap: D * residue - C,
    });
}
/** Padovan/Perrin sequence `1,1,1,2,2,3,...`. */
export function padovan(index) {
    nat(index, "index");
    const values = [1, 1, 1];
    for (let current = 3; current <= index; current += 1)
        values[current] = values[current - 2] + values[current - 3];
    return values[index];
}
/** Fibonacci sequence in the Lean convention `1,1,2,3,5,...`. */
export function fibSeq(index) {
    nat(index, "index");
    const values = [1, 1];
    for (let current = 2; current <= index; current += 1)
        values[current] = values[current - 1] + values[current - 2];
    return values[index];
}
export const padovanLeFibWitnessSchema = {
    $id: "metroplat/closure/analysis/collatz/padovan-le-fib-witness",
    type: "object",
    required: ["kind", "index", "padovan", "fibSeq", "holds"],
    properties: {
        kind: { const: "collatz.padovanLeFibSeq:witness" },
        index: { type: "number" },
        padovan: { type: "number" },
        fibSeq: { type: "number" },
        holds: { type: "boolean" },
    },
    additionalProperties: false,
    title: "PadovanLeFibWitness",
    description: "The Padovan/Perrin value at index is at most the Fibonacci value at index.",
};
export const collatzContractingPrefixQuestionSchema = {
    $id: "metroplat/closure/analysis/collatz/contracting-prefix-question",
    type: "object",
    required: ["kind", "seed"],
    properties: {
        kind: { const: "collatz.contractingPrefixQuestion" },
        seed: { type: "number" },
    },
    additionalProperties: false,
    title: "CollatzContractingPrefixQuestion",
    description: "The question: does seed have a contracting parity-word prefix.",
};
export const collatzBoundedContractingPrefixQuestionSchema = {
    $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-question",
    type: "object",
    required: ["kind", "seed", "bound"],
    properties: {
        kind: { const: "collatz.boundedContractingPrefixQuestion" },
        seed: { type: "number" },
        bound: { type: "number" },
    },
    additionalProperties: false,
    title: "CollatzBoundedContractingPrefixQuestion",
    description: "The question: does seed have a contracting parity-word prefix within bound.",
};
export const collatzBoundedContractingPrefixObstructionSchema = {
    $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-obstruction",
    type: "object",
    required: ["kind", "seed", "bound", "searchedLengths", "reason"],
    properties: {
        kind: { const: "collatz.boundedContractingPrefixCore-obstruction" },
        seed: { type: "number" },
        bound: { type: "number" },
        searchedLengths: { type: "array", items: { type: "number" } },
        reason: { const: "not-found-within-bound" },
    },
    additionalProperties: false,
    title: "CollatzBoundedContractingPrefixObstruction",
    description: "No contracting prefix was found for seed within the searched length bound.",
};
/** Lean `padovan_le_fibSeq`: the plastic integer shadow is bounded by Fibonacci. */
export function padovanLeFibSeq(index) {
    return Object.freeze({
        kind: "collatz.padovanLeFibSeq:witness",
        index,
        padovan: padovan(index),
        fibSeq: fibSeq(index),
        holds: padovan(index) <= fibSeq(index),
    });
}
export function semigroupGapReceipt(word = ["O"]) {
    const parent = parentBarrier(word);
    if (parent.kind !== "collatz.parentBarrier:witness") {
        throw new TypeError("semigroupGapReceipt: expected a parent-barrier word");
    }
    const residue = residueCharacterization(parent.trace.C, parent.D, parent.M);
    return Object.freeze({
        kind: "collatz.semigroupGap.receipt:witness",
        provenTheorems: Object.freeze([
            "nonDescent_iff_semigroup_certificate",
            "parentBarrierGap_implies_firstPassageDescent",
        ]),
        frontierTheorem: "parentBarrierGap_holds",
        parent,
        residue,
        conditionalDescent: true,
        gapStatus: "frontier-sorry-in-Lean",
    });
}
export function collatzContractingPrefixQuestion(seed) {
    nat(seed, "seed");
    return Object.freeze({ kind: "collatz.contractingPrefixQuestion", seed });
}
export function collatzBoundedContractingPrefixQuestion(seed, bound) {
    nat(seed, "seed");
    nat(bound, "bound");
    return Object.freeze({ kind: "collatz.boundedContractingPrefixQuestion", seed, bound });
}
export function collatzBoundedContractingPrefixCore(seed, bound) {
    const boundedQuestion = collatzBoundedContractingPrefixQuestion(seed, bound);
    const searchedLengths = [];
    for (let prefixLength = 0; prefixLength < boundedQuestion.bound; prefixLength += 1) {
        searchedLengths.push(prefixLength);
        const word = parityWord(boundedQuestion.seed, prefixLength);
        if (coefficientContracting(word)) {
            return Object.freeze({
                kind: "collatz.boundedContractingPrefixCore:witness",
                seed: boundedQuestion.seed,
                bound: boundedQuestion.bound,
                prefixLength,
                word,
                withinBound: true,
                contracting: true,
                leanTheorem: "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness",
            });
        }
    }
    return Object.freeze({
        kind: "collatz.boundedContractingPrefixCore-obstruction",
        seed: boundedQuestion.seed,
        bound: boundedQuestion.bound,
        searchedLengths: Object.freeze(searchedLengths),
        reason: "not-found-within-bound",
    });
}
export function collatzContractingPrefixCoreFromBounded(boundedCore) {
    return Object.freeze({
        kind: "collatz.contractingPrefixCore:witness",
        seed: boundedCore.seed,
        prefixLength: boundedCore.prefixLength,
        word: boundedCore.word,
        contracting: true,
        leanTheorem: "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness",
    });
}
export function noPositiveInfiniteBarrierStreamForFiniteSample(seeds, bound) {
    return seeds.every((seed) => {
        nat(seed, "seed");
        if (seed <= 2)
            return true;
        const seedBound = typeof bound === "function" ? bound(seed) : bound;
        return collatzBoundedContractingPrefixCore(seed, seedBound).kind === "collatz.boundedContractingPrefixCore:witness";
    });
}
export function collatzBarrierDecidableCoreReceipt(seed = 7, bound = 8) {
    const question = collatzContractingPrefixQuestion(seed);
    const boundedQuestion = collatzBoundedContractingPrefixQuestion(seed, bound);
    const boundedCore = collatzBoundedContractingPrefixCore(seed, bound);
    if (boundedCore.kind !== "collatz.boundedContractingPrefixCore:witness") {
        throw new TypeError("collatzBarrierDecidableCoreReceipt: expected a bounded contracting-prefix core");
    }
    const core = collatzContractingPrefixCoreFromBounded(boundedCore);
    const sampleNoPositiveInfiniteBarrierStream = noPositiveInfiniteBarrierStreamForFiniteSample([3, 5, 7, 11], bound);
    if (!sampleNoPositiveInfiniteBarrierStream) {
        throw new TypeError("collatzBarrierDecidableCoreReceipt: finite sample did not contract within the supplied bound");
    }
    return Object.freeze({
        kind: "collatz.barrierDecidableCore.receipt:witness",
        capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierDecidableCore",
        question,
        boundedQuestion,
        boundedCore,
        core,
        finiteSearchDecidable: true,
        sampleNoPositiveInfiniteBarrierStream: true,
        leanTheorems: Object.freeze([
            "Obsmetrologia.Relational.Material.collatzContractingPrefixQuestion_assertion_iff",
            "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness",
            "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_everyNonterminalContracts",
            "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_decidable_assertion",
            "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_decidable_assertions",
            "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixQuestion_decidable",
            "Obsmetrologia.Relational.Material.boundedCollatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_bound",
            "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness",
            "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_contractingPrefixBound",
            "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_antimatterBarrierBoundary_and_cylinderLift",
            "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_fullSharedKappaCarrier",
        ]),
    });
}
export function runLockPrefixCollatzBarrierPrefixSeed(stage, event) {
    nat(stage, "stage");
    nat(event, "event");
    return event < stage;
}
export function collatzBarrierPrefixLimit(stage, event = stage) {
    nat(stage, "stage");
    nat(event, "event");
    const witnessStage = Math.max(stage, event + 1);
    if (!runLockPrefixCollatzBarrierPrefixSeed(witnessStage, event)) {
        throw new TypeError("collatzBarrierPrefixLimit: event was not admitted by a finite prefix");
    }
    return Object.freeze({
        kind: "collatz.barrierPrefixLimit:witness",
        stage: witnessStage,
        event,
        presentAfterStage: true,
        presentInLimit: true,
        leanTheorems: Object.freeze([
            "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
            "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
        ]),
    });
}
export function collatzBarrierKeratinFormationCandidate(seed, checkedThrough) {
    nat(seed, "seed");
    nat(checkedThrough, "checkedThrough");
    const checkedPrefixes = Object.freeze(Array.from({ length: checkedThrough }, (_, prefixLength) => {
        const word = parityWord(seed, prefixLength);
        return Object.freeze({
            prefixLength,
            word,
            noncontracting: coefficientNoncontracting(word),
        });
    }));
    return Object.freeze({
        kind: "collatz.barrierKeratinFormation:bounded-candidate",
        seed,
        checkedThrough,
        positiveSeed: 2 < seed,
        checkedPrefixes,
        allCheckedPrefixesNoncontracting: checkedPrefixes.every((prefix) => prefix.noncontracting),
        actualFormationStatus: "not-claimed",
    });
}
export function collatzBarrierKeratinReceipt(seed = 7) {
    const prefixLimit = collatzBarrierPrefixLimit(4, 3);
    const boundedCandidate = collatzBarrierKeratinFormationCandidate(seed, 4);
    if (!boundedCandidate.positiveSeed || !boundedCandidate.allCheckedPrefixesNoncontracting) {
        throw new TypeError("collatzBarrierKeratinReceipt: expected a positive bounded noncontracting prefix candidate");
    }
    const refutingCore = collatzBoundedContractingPrefixCore(seed, 8);
    if (refutingCore.kind !== "collatz.boundedContractingPrefixCore:witness") {
        throw new TypeError("collatzBarrierKeratinReceipt: expected a later contracting prefix");
    }
    return Object.freeze({
        kind: "collatz.barrierKeratin.receipt:witness",
        capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierKeratin",
        prefixLimit,
        boundedCandidate,
        refutingCore,
        formationRefutedByContractingPrefix: true,
        actualFormationStatus: "not-claimed",
        leanTheorems: Object.freeze([
            "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
            "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_infiniteBarrierStream",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_cylinderAvoidingBarrierStream",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_excludes_noPositiveInfiniteBarrierStream",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_of_no_contracting_prefix",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_no_contracting_prefix",
            "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_excludes_collatzBarrierKeratinFormation",
            "Obsmetrologia.Relational.Material.parentBarrierGap_and_oneLock_excludes_collatzBarrierKeratinFormation",
            "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_refutes_parentBarrierOneLockCollapse",
            "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_implies_not_not_contracting_prefix",
            "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_iff_pointwise_not_not_contracting_prefix",
        ]),
    });
}
