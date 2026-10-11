/**
 * analysis/port-graph - finite lenticule port-graph and condensate receipts.
 *
 * Executable shadow of RelMath.Aperiodic.PortGraph and
 * RelMath.Aperiodic.CondensateMatter: a legal one-hole pass alternates sides,
 * occupancy 0/1/2+ reads as FOUR bottom/truth/top, and material rigidity is the
 * count of over-occupied condensed lenticules.
 */
import { fromInts, intAdd, matEqual, matmul, toInt, } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { negateReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_TOP } from "../../../../../reading-points.mjs";
export function threadPass(lenticule, inSide, outSide) {
    return Object.freeze({
        kind: "aperiodic.portGraph.threadPass",
        lenticule,
        inSide,
        outSide,
    });
}
function assertBoolPath(path, caller) {
    if (!path.every((bit) => typeof bit === "boolean"))
        throw new TypeError(`${caller}: path must contain booleans`);
}
export function vershik(path) {
    assertBoolPath(path, "vershik");
    if (path.length === 0)
        return Object.freeze([]);
    const [head, ...rest] = path;
    if (!head)
        return Object.freeze([true, ...rest]);
    return Object.freeze([false, ...vershik(rest)]);
}
export function vershikToNat(path) {
    assertBoolPath(path, "vershikToNat");
    if (path.length > 52)
        throw new RangeError("vershikToNat: path is too long for a safe JavaScript integer");
    return path.reduce((total, bit, index) => total + (bit ? 2 ** index : 0), 0);
}
function boolPaths(length) {
    if (length === 0)
        return Object.freeze([Object.freeze([])]);
    const tails = boolPaths(length - 1);
    return Object.freeze(tails.flatMap((tail) => [
        Object.freeze([false, ...tail]),
        Object.freeze([true, ...tail]),
    ]));
}
function iterateVershik(path, count) {
    let current = path;
    for (let index = 0; index < count; index += 1)
        current = vershik(current);
    return current;
}
const pathEquals = (left, right) => left.length === right.length && left.every((bit, index) => bit === right[index]);
export function portVershikReceipt(path = [false, false]) {
    assertBoolPath(path, "portVershikReceipt");
    const successor = vershik(path);
    const serialIndex = vershikToNat(path);
    const successorIndex = vershikToNat(successor);
    const lengthPreserved = path.length === successor.length;
    const successorIncrements = !path.includes(false) || successorIndex === serialIndex + 1;
    const succWhenNotMaximal = [0, 1, 2, 3, 4, 5].every((length) => boolPaths(length).every((candidate) => !candidate.includes(false) ||
        vershikToNat(vershik(candidate)) === vershikToNat(candidate) + 1));
    const maximalWraps = [0, 1, 2, 3, 4, 5].every((length) => pathEquals(vershik(Array.from({ length }, () => true)), Array.from({ length }, () => false)));
    const twoCycle = boolPairs.every((candidate) => pathEquals(iterateVershik(candidate, 4), candidate));
    if (!lengthPreserved || !successorIncrements || !succWhenNotMaximal || !maximalWraps || !twoCycle) {
        throw new TypeError("portVershikReceipt: finite Vershik laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.portVershik.receipt:witness",
        path: Object.freeze([...path]),
        successor,
        serialIndex,
        successorIndex,
        successorIncrements,
        lengthPreserved: true,
        vershikSuccWhenNotMaximal: true,
        maximalWraps: true,
        twoCycle: true,
    });
}
export const warpAlt = (left, right) => left !== right;
export const holeTransition = (inSide, outSide) => warpAlt(inSide, outSide);
export const legalThreadPass = (pass) => holeTransition(pass.inSide, pass.outSide);
export const threadLegal = (thread) => thread.every(legalThreadPass);
export function condensate(occupation) {
    if (!Number.isSafeInteger(occupation) || occupation < 0) {
        throw new RangeError("condensate: occupation must be a natural number");
    }
    if (occupation === 0)
        return KNOWLEDGE_BOTTOM;
    if (occupation === 1)
        return TRUTH_TOP;
    return KNOWLEDGE_TOP;
}
export const condensateInconsistency = (occupation) => condensate(occupation) === KNOWLEDGE_TOP;
const boolPairs = Object.freeze([
    Object.freeze([false, false]),
    Object.freeze([false, true]),
    Object.freeze([true, false]),
    Object.freeze([true, true]),
]);
export function portGraphReceipt(thread = []) {
    const legalIffDistinct = boolPairs.every(([i, j]) => legalThreadPass(threadPass("law", i, j)) === (i !== j));
    const mirrorFixesEmpty = negateReading(condensate(0)) === condensate(0);
    const mirrorFixesCondensatePole = [2, 3, 4].every((n) => negateReading(condensate(n)) === condensate(n));
    const mirrorFixesCondensate = [0, 1, 2, 3, 4].every((n) => condensateInconsistencyForReading(negateReading(condensate(n))) === condensateInconsistency(n));
    if (!legalIffDistinct || !threadLegal([]) || !mirrorFixesEmpty || !mirrorFixesCondensatePole || !mirrorFixesCondensate) {
        throw new TypeError("portGraphReceipt: finite port-graph laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.portGraph.receipt:witness",
        thread: Object.freeze([...thread]),
        legal: threadLegal(thread),
        holeTransitionEqualsWarpAlt: true,
        legalIffDistinct: true,
        threadLegalNil: true,
        condensateZero: condensate(0),
        condensateOne: condensate(1),
        condensateOver: condensate(2),
        emptyConsistent: !condensateInconsistency(0),
        singleConsistent: !condensateInconsistency(1),
        overOccupationInconsistency: condensateInconsistency(2),
        mirrorFixesEmpty: true,
        mirrorFixesCondensatePole: true,
        mirrorFixesCondensate: true,
    });
}
function condensateInconsistencyForReading(value) {
    return value === KNOWLEDGE_TOP;
}
export function rigidity(material) {
    return material.filter(condensateInconsistency).length;
}
export function condensateMatterReceipt(material) {
    for (const occupation of material)
        condensate(occupation);
    const overOccupied = Object.freeze(material.filter((occupation) => occupation >= 2));
    const finiteCheck = material.every((occupation) => condensateInconsistency(occupation) === (occupation >= 2));
    const materialRigidity = rigidity(material);
    const rigidIffOveroccupied = (materialRigidity > 0) === (overOccupied.length > 0);
    const allLeOne = material.every((occupation) => occupation <= 1);
    const floppyOfAllLeOne = !allLeOne || materialRigidity === 0;
    if (!finiteCheck || !rigidIffOveroccupied || !floppyOfAllLeOne) {
        throw new TypeError("condensateMatterReceipt: finite condensate matter laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.condensateMatter.receipt:witness",
        material: Object.freeze([...material]),
        rigidity: materialRigidity,
        overOccupied,
        condensateInconsistencyIff: true,
        rigidIffOveroccupied: true,
        floppyOfAllLeOne,
    });
}
function assertSquareMatrix(matrix, caller) {
    if (matrix.length === 0)
        throw new TypeError(`${caller}: matrix must be non-empty`);
    const columns = matrix[0].length;
    if (columns !== matrix.length || matrix.some((row) => row.length !== columns)) {
        throw new TypeError(`${caller}: expected a square matrix`);
    }
}
export function matrixIdentity(size) {
    if (!Number.isSafeInteger(size) || size < 1)
        throw new RangeError("matrixIdentity: size must be a positive integer");
    return fromInts(Array.from({ length: size }, (_, row) => Array.from({ length: size }, (__, column) => row === column ? 1 : 0)));
}
export function matrixAdd(left, right) {
    if (left.length !== right.length || left.some((row, index) => row.length !== right[index].length)) {
        throw new TypeError("matrixAdd: matrices must have the same shape");
    }
    return Object.freeze(left.map((row, rowIndex) => Object.freeze(row.map((value, columnIndex) => intAdd(value, right[rowIndex][columnIndex])))));
}
export function matrixPower(matrix, exponent) {
    assertSquareMatrix(matrix, "matrixPower");
    if (!Number.isSafeInteger(exponent) || exponent < 0)
        throw new RangeError("matrixPower: exponent must be a natural number");
    let result = matrixIdentity(matrix.length);
    for (let index = 0; index < exponent; index += 1)
        result = matmul(result, matrix);
    return result;
}
export const portGrowth = matrixPower;
export function substitutionMatrix(substitution, alphabetSize = substitution.length) {
    if (!Number.isSafeInteger(alphabetSize) || alphabetSize < 1)
        throw new RangeError("substitutionMatrix: alphabet size must be positive");
    const rows = substitution.map((word) => Array.from({ length: alphabetSize }, (_, letter) => word.filter((item) => item === letter).length));
    return fromInts(rows);
}
export const padovanSubstitution = Object.freeze([
    Object.freeze([1]),
    Object.freeze([2]),
    Object.freeze([0, 1]),
]);
export const fibonacciSubstitution = Object.freeze([
    Object.freeze([0, 1]),
    Object.freeze([0]),
]);
export const padovanMatrix = substitutionMatrix(padovanSubstitution, 3);
export const fibonacciMatrix = substitutionMatrix(fibonacciSubstitution, 2);
const matrixPositiveIncidence = (matrix) => Object.freeze(matrix.map((row) => Object.freeze(row.map((value) => toInt(value) > 0 ? TRUTH_TOP : KNOWLEDGE_BOTTOM))));
export function portGrowthReceipt(matrix = padovanMatrix, a = 1, b = 2) {
    assertSquareMatrix(matrix, "portGrowthReceipt");
    if (!Number.isSafeInteger(a) || a < 0 || !Number.isSafeInteger(b) || b < 0) {
        throw new RangeError("portGrowthReceipt: a and b must be natural numbers");
    }
    const growthA = portGrowth(matrix, a);
    const growthB = portGrowth(matrix, b);
    const growthSum = portGrowth(matrix, a + b);
    const composed = matmul(growthA, growthB);
    const portGrowthZero = matEqual(portGrowth(matrix, 0), matrixIdentity(matrix.length));
    const portGrowthSucc = matEqual(portGrowth(matrix, a + 1), matmul(portGrowth(matrix, a), matrix));
    const telescopes = matEqual(growthSum, composed);
    const padovanGrowth3 = portGrowth(padovanMatrix, 3);
    const padovanRenormalized = matrixAdd(padovanMatrix, matrixIdentity(3));
    const padovanCubic = matEqual(padovanGrowth3, padovanRenormalized);
    const padovanIncidence = matrixPositiveIncidence(padovanMatrix);
    const edgesChu = padovanMatrix.every((row, rowIndex) => row.every((value, columnIndex) => toInt(value) === (padovanIncidence[rowIndex][columnIndex] === TRUTH_TOP ? 1 : 0)));
    if (!portGrowthZero || !portGrowthSucc || !telescopes || !padovanCubic || !edgesChu) {
        throw new TypeError("portGrowthReceipt: finite port-growth laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.portGrowth.receipt:witness",
        matrix,
        a,
        b,
        growthA,
        growthB,
        growthSum,
        composed,
        portGrowthZero: true,
        portGrowthSucc: true,
        matPowAdd: true,
        portGrowthTelescopes: true,
        padovanMatrix,
        padovanGrowth3,
        padovanRenormalized,
        portGrowthRenormPadovan: true,
        padovanChuIncidence: padovanIncidence,
        portGrowthEdgesChu: true,
    });
}
export const levelPrec = (a, b) => a < b;
export function timeSection(levels, level) {
    return levels.filter((candidate) => levelPrec(candidate, level)).length;
}
export function portGrowthTimeReceipt(levels = [0, 1, 2, 3]) {
    if (!levels.every((level) => Number.isSafeInteger(level) && level >= 0)) {
        throw new RangeError("portGrowthTimeReceipt: levels must be natural numbers");
    }
    const uniqueLevels = Object.freeze([...new Set(levels)].sort((a, b) => a - b));
    const transitive = uniqueLevels.every((a) => uniqueLevels.every((b) => uniqueLevels.every((c) => !(levelPrec(a, b) && levelPrec(b, c)) || levelPrec(a, c))));
    const irreflexive = uniqueLevels.every((level) => !levelPrec(level, level));
    const strictMono = uniqueLevels.every((x) => uniqueLevels.every((y) => !levelPrec(x, y) || timeSection(uniqueLevels, x) < timeSection(uniqueLevels, y)));
    const chain = [0, 1, 2, 3];
    const chainTime = chain.every((level) => timeSection(chain, level) === level);
    if (!transitive || !irreflexive || !strictMono || !chainTime) {
        throw new TypeError("portGrowthTimeReceipt: finite port-growth time laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.portGrowthTime.receipt:witness",
        levels: uniqueLevels,
        timeSection: Object.freeze(Object.fromEntries(uniqueLevels.map((level) => [String(level), timeSection(uniqueLevels, level)]))),
        levelPrecTransitive: true,
        levelPrecIrreflexive: true,
        portGrowthTimeStrictMono: true,
        chainTimeSectionEqLevel: true,
    });
}
