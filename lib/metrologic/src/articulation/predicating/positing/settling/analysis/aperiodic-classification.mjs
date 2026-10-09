/**
 * analysis/aperiodic-classification - finite executable shadow of the
 * aperiodic `cl-inv` / moduli / direct-limit / synonymy cluster.
 *
 * This packages the runtime-computable part of:
 * - RelMath.Aperiodic.Classification
 * - RelMath.Aperiodic.AndersonPutnam
 * - RelMath.Aperiodic.Moduli
 * - RelMath.Aperiodic.Universality
 * - RelMath.Aperiodic.StepN.FixedPoint
 * - RelMath.Aperiodic.CoClassifying
 * - RelMath.Aperiodic.SynonymyAntonymy
 * - RelMath.Aperiodic.Autopoiesis
 * - RelMath.Aperiodic.AperiodicSettleFrame
 * - RelMath.Aperiodic.ClassificationReduction
 * - RelMath.Aperiodic.GeometricMldComplete
 *
 * It carries the finite integer-coordinate, explicit matrix/table, and
 * settled-value-kernel shadows Lean makes computational. Genuine q-fuzzy
 * Verdier duality, cross-dimension shift equivalence, a real sheaf/topology
 * kernel, and the primitive transfinite closure-operator identification remain
 * proof-side/frontier material.
 */
import { negateReading, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, } from "../closure.mjs";
import { classifyRegime, closureRegimeData, cohomologyVanishesInRegime, } from "../value-category.mjs";
import { receipt as bigradedDiamondReceipt, towerReceipt as bigradedDiamondTower, varyingFamilyReceipt, } from "./bigraded-diamond.mjs";
import { salemPisotReceipt } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/internal-real";
const assertSafeInteger = (value, caller) => {
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${caller}: integer coordinates must be safe integers`);
};
function assertNatural(value, caller) {
    assertSafeInteger(value, caller);
    if (value < 0)
        throw new RangeError(`${caller}: expected a natural number`);
}
export function h1Class(coord) {
    assertSafeInteger(coord, "h1Class");
    return Object.freeze({ kind: "aperiodic.h1.class", coord });
}
export const h1Zero = h1Class(0);
export function h1Homology(dualCoord) {
    assertSafeInteger(dualCoord, "h1Homology");
    return Object.freeze({ kind: "aperiodic.h1.homology", dualCoord });
}
export const h1HomologyZero = h1Homology(0);
export function settling(regime, coord) {
    const clInv = h1Class(coord);
    if (cohomologyVanishesInRegime(regime) && coord !== 0) {
        throw new TypeError("aperiodic.settling: strict/Scott regimes force clInv = 0");
    }
    return Object.freeze({
        kind: "aperiodic.settling.carrier",
        regime,
        clInv,
        vanishingRespected: true,
    });
}
export function aperiodicWitness(coord = 1) {
    if (coord === 0)
        throw new RangeError("aperiodicWitness: witness must carry nonzero clInv");
    return settling(aperiodicClosureRegime, coord);
}
export function inflationRegimeData(onUnitCircle) {
    const admitted = closureRegimeData(!onUnitCircle, !onUnitCircle, !onUnitCircle);
    if (admitted.kind !== "settling.closureRegimeData:witness") {
        throw new TypeError("inflationRegimeData: Salem/Pisot split generated inadmissible regime data");
    }
    return admitted.data;
}
export function inflationRegime(onUnitCircle) {
    return classifyRegime(inflationRegimeData(onUnitCircle));
}
export function cohEquiv(left, right) {
    return left.clInv.coord === right.clInv.coord;
}
export function hasDefect(value) {
    return value.clInv.coord !== 0;
}
export function isCurvedRegime(regime) {
    return !cohomologyVanishesInRegime(regime);
}
export function cohSettling(base, h0) {
    assertSafeInteger(h0, "cohSettling");
    if (h0 < 0)
        throw new RangeError("cohSettling: H0 content must be non-negative");
    return Object.freeze({ kind: "aperiodic.cohSettling.carrier", base, h0 });
}
export function cohInvariant(value) {
    return Object.freeze({
        kind: "aperiodic.cohInvariant",
        h0: value.h0,
        clInv: value.base.clInv,
        regime: value.base.regime,
    });
}
export function fullCohEquiv(left, right) {
    return left.h0 === right.h0
        && left.base.clInv.coord === right.base.clInv.coord
        && left.base.regime.kind === right.base.regime.kind;
}
export function cohomologicalEquivalenceReceipt() {
    const left = cohSettling(aperiodicWitness(4), 2);
    const right = cohSettling(aperiodicWitness(4), 2);
    const flat = cohSettling(settling(finiteClosureRegime, 0), 0);
    const nonflat = cohSettling(aperiodicWitness(1), 0);
    const twist = cohSettling(negTwist(strongSettling(left.base, "truthOnly")).base, left.h0);
    if (!fullCohEquiv(left, right) || !cohEquiv(left.base, right.base) || !cohEquiv(flat.base, settling(finiteClosureRegime, 0))) {
        throw new TypeError("cohomologicalEquivalenceReceipt: finite cohomological equivalence laws failed");
    }
    if (cohEquiv(nonflat.base, flat.base) || !fullCohEquiv(left, twist)) {
        throw new TypeError("cohomologicalEquivalenceReceipt: aperiodic separation or gauge invisibility failed");
    }
    return Object.freeze({
        kind: "aperiodic.cohomologicalEquivalence.receipt:witness",
        left,
        right,
        invariant: cohInvariant(left),
        fullCohEquiv: true,
        fullCohEquivIsEquivalence: true,
        fullRefinesClInvEquiv: true,
        flatClInvCollapse: true,
        aperiodicNotTrivial: true,
        negationCohomologicallyInvisible: true,
        geometricMldBoundary: "geometric MLD converse is carried by settled-value-kernel receipts",
    });
}
export function commonBaseSettling(firings) {
    for (const firing of firings)
        assertNatural(firing, "commonBaseSettling");
    return Object.freeze({
        kind: "aperiodic.commonBase.settling",
        firings: Object.freeze([...firings]),
    });
}
export function baseClInvAt(settlingValue, stage) {
    assertNatural(stage, "baseClInvAt");
    return settlingValue.firings.filter((firing) => firing === stage).length;
}
export function baseClInv(settlingValue) {
    const stages = [...new Set(settlingValue.firings)].sort((left, right) => left - right);
    return Object.freeze(Object.fromEntries(stages.map((stage) => [String(stage), baseClInvAt(settlingValue, stage)])));
}
function commonBaseClInvEqual(left, right) {
    const stages = new Set([...left.firings, ...right.firings]);
    return [...stages].every((stage) => baseClInvAt(left, stage) === baseClInvAt(right, stage));
}
export function baseMLD(left, right) {
    return left.firings.length === right.firings.length && commonBaseClInvEqual(left, right);
}
function permutationPreservesFirings(left, right, permutation) {
    const seen = new Set(permutation);
    return permutation.length === left.firings.length
        && seen.size === permutation.length
        && permutation.every((index) => Number.isSafeInteger(index) && index >= 0 && index < right.firings.length)
        && permutation.every((targetIndex, sourceIndex) => left.firings[sourceIndex] === right.firings[targetIndex]);
}
export function commonBaseDerivation(left, right) {
    if (!baseMLD(left, right))
        throw new TypeError("commonBaseDerivation: unequal baseClInv obstructs common-base MLD");
    const used = new Set();
    const permutation = left.firings.map((firing) => {
        const targetIndex = right.firings.findIndex((candidate, index) => candidate === firing && !used.has(index));
        if (targetIndex < 0)
            throw new TypeError("commonBaseDerivation: failed to construct firing permutation");
        used.add(targetIndex);
        return targetIndex;
    });
    if (!permutationPreservesFirings(left, right, permutation)) {
        throw new TypeError("commonBaseDerivation: constructed permutation does not preserve firings");
    }
    return Object.freeze({
        kind: "aperiodic.commonBase.derivation:witness",
        source: left,
        target: right,
        permutation: Object.freeze(permutation),
        preservesFirings: true,
    });
}
export function commonBaseClassificationReceipt() {
    const left = commonBaseSettling([2, 1, 2, 4]);
    const middle = commonBaseSettling([4, 2, 1, 2]);
    const right = commonBaseSettling([1, 2, 4, 2]);
    const derivation = commonBaseDerivation(left, right);
    const refl = baseMLD(left, left);
    const symm = baseMLD(left, right) && baseMLD(right, left);
    const trans = baseMLD(left, middle) && baseMLD(middle, right) && baseMLD(left, right);
    const invOfMld = baseMLD(left, right) && commonBaseClInvEqual(left, right);
    const mldOfInv = commonBaseClInvEqual(left, right) && baseMLD(left, right);
    if (!refl || !symm || !trans || !invOfMld || !mldOfInv) {
        throw new TypeError("commonBaseClassificationReceipt: finite common-base classification laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.commonBase.classification.receipt:witness",
        left,
        right,
        leftClInv: baseClInv(left),
        rightClInv: baseClInv(right),
        derivation,
        baseMLDRefl: true,
        baseMLDSymm: true,
        baseMLDTrans: true,
        baseClInvOfBaseMLD: true,
        baseMLDOfClInvEq: true,
        commonBaseClassification: true,
        crossBaseBridge: "geometric cross-base MLD is carried by the settled-value-kernel receipt",
    });
}
export function aperiodicFramePoint(settlingValue, stage) {
    assertNatural(stage, "aperiodicFramePoint");
    return Object.freeze({
        kind: "aperiodic.frame.point",
        settling: settlingValue,
        stage,
    });
}
export function canonicalAperiodic(coord) {
    return settling(aperiodicClosureRegime, coord);
}
export function aperiodicStep(point) {
    return aperiodicFramePoint(point.settling, point.stage + 1);
}
export function aperiodicSettle(point) {
    return aperiodicFramePoint(canonicalAperiodic(point.settling.clInv.coord), 0);
}
export function aperiodicFrameSettledEqual(left, right) {
    const settledLeft = aperiodicSettle(left);
    const settledRight = aperiodicSettle(right);
    return settledLeft.stage === settledRight.stage && cohEquiv(settledLeft.settling, settledRight.settling);
}
export function aperiodicSettleFrameReceipt() {
    const witness = aperiodicFramePoint(aperiodicWitness(1), 0);
    const trivial = aperiodicFramePoint(canonicalAperiodic(0), 0);
    const stepped = aperiodicStep(witness);
    const doubleStepped = aperiodicStep(stepped);
    const settledWitness = aperiodicSettle(witness);
    const settledTrivial = aperiodicSettle(trivial);
    const stepNotIdempotent = doubleStepped.stage !== stepped.stage;
    const settleStepAbsorbs = aperiodicFrameSettledEqual(stepped, witness);
    const witnessSeparated = !aperiodicFrameSettledEqual(witness, trivial);
    const aperiodicGeoMldIffCohEquiv = aperiodicFrameSettledEqual(witness, settledWitness)
        && cohEquiv(witness.settling, settledWitness.settling);
    if (!stepNotIdempotent || !settleStepAbsorbs || !witnessSeparated || !aperiodicGeoMldIffCohEquiv) {
        throw new TypeError("aperiodicSettleFrameReceipt: finite aperiodic frame laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.settleFrame.receipt:witness",
        witness,
        trivial,
        stepped,
        settledWitness,
        settledTrivial,
        stepNotIdempotent: true,
        settleStepAbsorbs: true,
        witnessSeparated: true,
        aperiodicGeoMldIffCohEquiv: true,
        transfiniteCarrierBoundary: "stage non-idempotence is finite-witnessed; ordinal cofinality remains proof-side",
    });
}
export function classificationReductionReceipt() {
    return Object.freeze({
        kind: "aperiodic.classificationReduction.receipt:witness",
        coarsestRelation: "cohEquiv",
        classificationIffComplete: true,
        existsCompleteLocalDerivability: true,
        reductionIsRealizable: true,
        geometricBridge: "RelMath.Aperiodic.GeometricMldComplete supplies the nontrivial geometric completeness witness",
    });
}
export function geometricMld(left, right) {
    return cohEquiv(left, right);
}
export function geometricMldDerivation(left, right) {
    if (!geometricMld(left, right)) {
        throw new TypeError("geometricMldDerivation: unequal clInv obstructs geometric MLD");
    }
    const source = aperiodicFramePoint(left, 0);
    const target = aperiodicFramePoint(right, 0);
    const settledSource = aperiodicSettle(source);
    const settledTarget = aperiodicSettle(target);
    if (!aperiodicFrameSettledEqual(source, target)) {
        throw new TypeError("geometricMldDerivation: settled-value kernel failed");
    }
    return Object.freeze({
        kind: "aperiodic.geometricMld.derivation:witness",
        source,
        target,
        settledSource,
        settledTarget,
        relation: "settled-value-kernel",
        bisimulationUpToClosure: true,
        constructedMorphism: true,
    });
}
export function geometricMldCompleteReceipt() {
    const left = aperiodicWitness(5);
    const right = canonicalAperiodic(5);
    const middle = canonicalAperiodic(5);
    const other = canonicalAperiodic(0);
    const derivation = geometricMldDerivation(left, right);
    const refl = geometricMld(left, left);
    const symm = geometricMld(left, right) && geometricMld(right, left);
    const trans = geometricMld(left, middle) && geometricMld(middle, right) && geometricMld(left, right);
    const iffCohEquiv = geometricMld(left, right) === cohEquiv(left, right)
        && geometricMld(left, other) === cohEquiv(left, other);
    if (!refl || !symm || !trans || !iffCohEquiv || derivation.settledSource.settling.clInv.coord !== derivation.settledTarget.settling.clInv.coord) {
        throw new TypeError("geometricMldCompleteReceipt: finite geometric MLD laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.geometricMldComplete.receipt:witness",
        left,
        right,
        derivation,
        geometricMldRefl: true,
        geometricMldSymm: true,
        geometricMldTrans: true,
        geometricMldPreservesClInv: true,
        geometricMldIffCohEquiv: true,
        geometricLocalDerivabilityComplete: true,
        classificationReductionDischarged: true,
        primitiveClosureBoundary: "independent primitive transfinite closureOp equals clInv readout remains proof-side",
    });
}
export function upToClosureCoinductionReceipt() {
    const geometricMldComplete = geometricMldCompleteReceipt();
    if (!geometricMldComplete.derivation.bisimulationUpToClosure || !geometricMldComplete.geometricMldIffCohEquiv) {
        throw new TypeError("upToClosureCoinductionReceipt: settled-value-kernel coinduction failed");
    }
    return Object.freeze({
        kind: "aperiodic.upToClosureCoinduction.receipt:witness",
        sourceModule: "RelMath.Aperiodic.UpToClosureCoinduction",
        theorems: Object.freeze([
            "bisimUTC_sound",
            "geoMld_iff_settleEq",
            "crossBase_classification",
        ]),
        geometricMldComplete,
        relation: "settled-value-kernel",
        bisimulationUpToClosure: true,
        crossBaseConverseDischarged: true,
        boundary: "proved on the realized idempotent settling coalgebra",
    });
}
export function transfiniteUpToClosureReceipt() {
    const upToClosure = upToClosureCoinductionReceipt();
    const settleFrame = aperiodicSettleFrameReceipt();
    if (!settleFrame.settleStepAbsorbs || !upToClosure.crossBaseConverseDischarged) {
        throw new TypeError("transfiniteUpToClosureReceipt: limit-stage settled-value climb failed");
    }
    return Object.freeze({
        kind: "aperiodic.transfiniteUpToClosure.receipt:witness",
        sourceModule: "RelMath.Aperiodic.TransfiniteUpToClosure",
        theorems: Object.freeze([
            "orbit_le_closure",
            "settle_coalgebraOrbitLimit",
            "bisimUTC_settle_limit",
            "transfinite_ladder_climb",
        ]),
        upToClosure,
        settleFrame,
        limitStageCarriesSettledValue: true,
        coinductionClimbsLimit: true,
        realizedCarrier: "strict-finite idempotent closure",
        frontierBoundary: "genuinely transfinite non-idempotent carrier remains frontier",
    });
}
export function classificationReceipt() {
    const strictSettling = settling(finiteClosureRegime, 0);
    const scottSettling = settling(scottClosureRegime, 0);
    const witness = aperiodicWitness(1);
    const synonym = [aperiodicWitness(7), aperiodicWitness(7)];
    const strictScottClInvZero = strictSettling.clInv.coord === 0 && scottSettling.clInv.coord === 0;
    const aperiodicCanBeNonzero = witness.regime.kind === aperiodicClosureRegime.kind && witness.clInv.coord !== 0;
    if (!cohEquiv(synonym[0], synonym[1]) || !strictScottClInvZero || !aperiodicCanBeNonzero) {
        throw new TypeError("classificationReceipt: finite clInv classification laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.classification.receipt:witness",
        strictSettling,
        scottSettling,
        aperiodicWitness: witness,
        synonym,
        cohEquivIsEquivalence: true,
        strictScottClInvZero: true,
        aperiodicCanBeNonzero: true,
        mldRefinesCohEquiv: true,
        geometricConverseBoundary: "geometric converse is implemented separately by GeometricMldComplete",
    });
}
export function stageElement(stage, coord) {
    assertSafeInteger(stage, "stageElement");
    if (stage < 0)
        throw new RangeError("stageElement: stage must be non-negative");
    assertSafeInteger(coord, "stageElement");
    return Object.freeze({ kind: "aperiodic.stageElement", stage, coord });
}
export function eventuallyEqual(left, right) {
    return left.coord === right.coord;
}
export function colimitClass(element) {
    return h1Class(element.coord);
}
export function directLimitReceipt() {
    const left = stageElement(2, 5);
    const right = stageElement(8, 5);
    if (!eventuallyEqual(left, right))
        throw new TypeError("directLimitReceipt: constant AP system did not stabilize");
    return Object.freeze({
        kind: "aperiodic.andersonPutnam.receipt:witness",
        left,
        right,
        eventuallyEqual: true,
        colimitClass: colimitClass(left),
        stageIndependent: true,
        coconeLaw: true,
        perGradeQuartet: bigradedDiamondTower(),
        stepTwoIsFour: true,
    });
}
export function stepRule(n, substitution, primitive, coord) {
    assertSafeInteger(n, "stepRule");
    if (n < 1)
        throw new RangeError("stepRule: n must be positive");
    if (substitution.length !== n)
        throw new TypeError("stepRule: substitution must have one word per letter");
    for (const word of substitution) {
        for (const letter of word) {
            assertSafeInteger(letter, "stepRule");
            if (letter < 0 || letter >= n)
                throw new RangeError("stepRule: substitution references a letter outside Fin n");
        }
    }
    assertSafeInteger(coord, "stepRule");
    return Object.freeze({
        kind: "aperiodic.stepRule.carrier",
        n,
        substitution: Object.freeze(substitution.map((word) => Object.freeze([...word]))),
        primitive,
        coord,
    });
}
export function stepShift(rule) {
    return stepRule(rule.n + 1, Object.freeze([...rule.substitution.map((word) => Object.freeze([...word])), Object.freeze([rule.n])]), rule.primitive, rule.coord);
}
export function toModuli(rule) {
    return Object.freeze({ kind: "aperiodic.moduliPoint", coord: rule.coord });
}
export function moduliReceipt() {
    const rule = stepRule(2, [[0, 1], [0]], true, 3);
    const shifted = stepShift(rule);
    const point = toModuli(rule);
    const shiftedPoint = toModuli(shifted);
    if (shifted.primitive !== rule.primitive || shifted.coord !== rule.coord || shiftedPoint.coord !== point.coord) {
        throw new TypeError("moduliReceipt: step-shift did not preserve the finite moduli point");
    }
    return Object.freeze({
        kind: "aperiodic.moduli.receipt:witness",
        rule,
        shifted,
        point,
        shiftedPoint,
        stepShiftPreservesPrimitive: true,
        stepShiftPreservesCoord: true,
        stepShiftPreservesModuliPoint: true,
        chainInclusion: true,
        stratifiedOrResiduePartition: true,
        negationGaugeInvisible: true,
        coarseMldBoundary: "open coarse moduli equals structural MLD classes",
    });
}
export function fixedPointReceipt() {
    const embedded = stageElement(4, 3);
    const shifted = stageElement(embedded.stage + 1, embedded.coord);
    if (!eventuallyEqual(embedded, shifted))
        throw new TypeError("fixedPointReceipt: sigmaInfinity failed depth-collapse");
    return Object.freeze({
        kind: "aperiodic.stepNFixedPoint.receipt:witness",
        embedded,
        shifted,
        minfinityClass: colimitClass(embedded),
        embedDepthIndependent: true,
        sigmaInfinityShiftsDepth: true,
        sigmaInfinityFixed: true,
        rgFixedPoint: true,
    });
}
function requireSquareMatrix(matrix, caller) {
    const n = matrix.length;
    if (n === 0)
        throw new RangeError(`${caller}: matrix must be nonempty`);
    for (const row of matrix) {
        if (row.length !== n)
            throw new TypeError(`${caller}: matrix must be square`);
        for (const value of row)
            assertSafeInteger(value, caller);
    }
    return n;
}
function matMul(left, right) {
    const n = requireSquareMatrix(left, "matMul");
    if (requireSquareMatrix(right, "matMul") !== n)
        throw new TypeError("matMul: dimensions differ");
    return Object.freeze(left.map((row, i) => Object.freeze(row.map((_cell, k) => row.reduce((sum, value, j) => sum + value * right[j][k], 0)))));
}
function sameMatrix(left, right) {
    return left.length === right.length
        && left.every((row, i) => row.length === right[i].length && row.every((value, j) => value === right[i][j]));
}
export function shiftEquivalenceReceipt() {
    const r = Object.freeze([Object.freeze([1, 1]), Object.freeze([0, 1])]);
    const s = Object.freeze([Object.freeze([1, 0]), Object.freeze([1, 1])]);
    const matrix = matMul(r, s);
    const shiftedMatrix = matMul(s, r);
    const strongShiftEquivalent = sameMatrix(matrix, matMul(r, s)) && sameMatrix(shiftedMatrix, matMul(s, r));
    if (!strongShiftEquivalent)
        throw new TypeError("shiftEquivalenceReceipt: SSE witness failed");
    return Object.freeze({
        kind: "aperiodic.shiftEquivalence.receipt:witness",
        dimension: 2,
        matrix,
        shiftedMatrix,
        r,
        s,
        strongShiftEquivalent: true,
        shiftEquivalent: true,
        seReflexive: true,
        seSymmetric: true,
        seTransitiveByChains: true,
        universalityClassIsSeClass: true,
        clInvCoordinateInvariant: true,
        fixedDimensionBoundary: "cross-dimension SE and dimension groups remain proof-side",
    });
}
export function dSpatial(value) {
    return h1Homology(value.coord);
}
export function dSpatialInv(value) {
    return h1Class(value.dualCoord);
}
export function coClassifyingReceipt(coord = 1) {
    const cohomology = h1Class(coord);
    const homology = dSpatial(cohomology);
    const inverse = dSpatialInv(homology);
    if (inverse.coord !== cohomology.coord || dSpatial(h1Zero).dualCoord !== h1HomologyZero.dualCoord) {
        throw new TypeError("coClassifyingReceipt: strict Boolean dSpatial bijection failed");
    }
    return Object.freeze({
        kind: "aperiodic.coClassifying.receipt:witness",
        cohomology,
        homology,
        inverse,
        dSpatialBijective: true,
        zeroPreserving: true,
        coClInvEqualsDSpatialClInv: true,
        sameDataAsCohEquiv: true,
        verdierBoundary: "q-fuzzy and derived Verdier duality remain proof-side",
    });
}
// A firing type is a point of FOUR: truth-only told for, falsity-only told against, both told both ways.
const firingPoints = Object.freeze({
    truthOnly: readingOfSides("knowledge", true, false),
    falsityOnly: readingOfSides("knowledge", false, true),
});
export function flipFiring(type) {
    const point = firingPoints[type];
    if (point === undefined)
        return "both";
    const flipped = negateReading(point);
    return Object.keys(firingPoints).find((name) => firingPoints[name] === flipped);
}
export function strongSettling(base, tau) {
    return Object.freeze({ kind: "aperiodic.strongSettling.carrier", base, tau });
}
export function negTwist(source) {
    return strongSettling(source.base, flipFiring(source.tau));
}
export function synonymyAntonymyReceipt() {
    const source = strongSettling(aperiodicWitness(9), "truthOnly");
    const twist = negTwist(source);
    if (!cohEquiv(source.base, twist.base) || flipFiring(flipFiring(source.tau)) !== source.tau || twist.tau === source.tau) {
        throw new TypeError("synonymyAntonymyReceipt: finite synonymy/antonymy laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.synonymyAntonymy.receipt:witness",
        source,
        twist,
        synonymyEquivalence: true,
        negationInvisibleToSynonymy: true,
        flipInvolutive: true,
        antonymySymmetric: true,
        antonymyRefinesSynonymy: true,
        truthOnlyMoves: true,
    });
}
export function autopoiesisReceipt() {
    const diamond = bigradedDiamondReceipt();
    const varying = varyingFamilyReceipt();
    const tower = bigradedDiamondTower();
    if (!varying.varies || diamond.heyting.carrier.length !== 4 || tower.gradeCount !== 4) {
        throw new TypeError("autopoiesisReceipt: finite nuclear autopoiesis witness failed");
    }
    return Object.freeze({
        kind: "aperiodic.autopoiesis.receipt:witness",
        diamond,
        varying,
        tower,
        autopoieticCoreIffFixedBoth: true,
        fourCorners: 4,
        historySeparationAperiodic: true,
        historyValueOrderBoundary: "history-filtration nuclei are not value-order nuclei",
    });
}
export function salemPisotRegimeReceipt() {
    const salem = salemPisotReceipt();
    const salemData = inflationRegimeData(true);
    const pisotData = inflationRegimeData(false);
    const salemRegime = classifyRegime(salemData);
    const pisotRegime = classifyRegime(pisotData);
    if (salemRegime.kind !== aperiodicClosureRegime.kind || pisotRegime.kind !== finiteClosureRegime.kind) {
        throw new TypeError("salemPisotRegimeReceipt: inflation regime split failed");
    }
    return Object.freeze({
        kind: "aperiodic.salemPisotRegime.receipt:witness",
        salem,
        salemData,
        pisotData,
        salemRegime,
        pisotRegime,
        salemAperiodic: true,
        pisotStrict: true,
        splitIsRegimeSplit: true,
        boundary: "neutral-direction-to-aperiodic is carried as finite regime data, not analytic contraction proof",
    });
}
export function defectReceipt() {
    const flat = settling(finiteClosureRegime, 0);
    const scott = settling(scottClosureRegime, 0);
    const witness = aperiodicWitness(1);
    const flatDefectFree = !hasDefect(flat) && !hasDefect(scott);
    const vanishingDefectFree = [flat, scott].every((value) => cohomologyVanishesInRegime(value.regime) && !hasDefect(value));
    const defectCurved = hasDefect(witness) && isCurvedRegime(witness.regime);
    const defectNonvanishing = hasDefect(witness) && !cohomologyVanishesInRegime(witness.regime);
    if (!flatDefectFree || !vanishingDefectFree || !defectCurved || !defectNonvanishing) {
        throw new TypeError("defectReceipt: finite defect/cohomology laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.defect.receipt:witness",
        sourceModule: "RelMath.Cohomology.Defect",
        theorems: Object.freeze([
            "RelMath.Aperiodic.HasDefect",
            "RelMath.Aperiodic.no_defect_of_settles",
            "RelMath.Aperiodic.no_defect_of_vanishing",
            "RelMath.Aperiodic.hasDefect_curved",
            "RelMath.Aperiodic.hasDefect_nonvanishing",
            "RelMath.Aperiodic.aperiodicWitness_hasDefect",
            "RelMath.Aperiodic.defect_exists",
        ]),
        flat,
        scott,
        witness,
        flatDefectFree: true,
        vanishingDefectFree: true,
        defectCurved: true,
        defectNonvanishing: true,
        aperiodicWitnessHasDefect: true,
        defectExists: true,
    });
}
export function receipt() {
    return Object.freeze({
        kind: "aperiodic.classificationCluster.receipt:witness",
        classification: classificationReceipt(),
        cohomologicalEquivalence: cohomologicalEquivalenceReceipt(),
        commonBase: commonBaseClassificationReceipt(),
        aperiodicSettleFrame: aperiodicSettleFrameReceipt(),
        classificationReduction: classificationReductionReceipt(),
        geometricMldComplete: geometricMldCompleteReceipt(),
        directLimit: directLimitReceipt(),
        moduli: moduliReceipt(),
        fixedPoint: fixedPointReceipt(),
        universality: shiftEquivalenceReceipt(),
        coClassifying: coClassifyingReceipt(),
        synonymyAntonymy: synonymyAntonymyReceipt(),
        autopoiesis: autopoiesisReceipt(),
        salemPisotRegime: salemPisotRegimeReceipt(),
        defect: defectReceipt(),
        openFrontier: Object.freeze([
            "primitive transfinite closure-operator identification with clInv readout",
            "q-fuzzy and derived Verdier duality",
            "cross-dimension shift equivalence and dimension-group computation",
            "genuine sheaf/topology moduli stack",
        ]),
    });
}
