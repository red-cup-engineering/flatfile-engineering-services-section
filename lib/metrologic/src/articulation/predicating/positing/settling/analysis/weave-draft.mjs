/**
 * analysis/weave-draft - plain-weave drafts as bilattice-coloured sofic shifts.
 *
 * Executable shadow of RelMath.Aperiodic.WeaveDraft: the over/under alternation
 * graph is the two-colour complete graph, crossing data is a FOUR reading, and
 * a defect-free plain-weave word relabels to a charge-coloured sofic image.
 */
import { path as soficPath, soficImage, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/sofic";
import { isConsistentReading, knowledgeHeight, negateReading, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export const plainWeaveGraph = Object.freeze([
    Object.freeze([false, true]),
    Object.freeze([true, false]),
]);
const assertBool = (value, caller) => {
    if (typeof value !== "boolean")
        throw new TypeError(`${caller}: expected a boolean crossing`);
};
function assertWord(word, caller) {
    for (const bit of word)
        assertBool(bit, caller);
}
function assertSwatch(swatch, caller) {
    for (const row of swatch)
        assertWord(row, caller);
}
const boolSymbol = (value) => value ? 1 : 0;
const symbolWord = (word) => Object.freeze(word.map(boolSymbol));
export const warpAlt = (left, right) => left !== right;
export const completeGraphBool = (left, right) => left !== right;
export function warpPath(word) {
    assertWord(word, "warpPath");
    return soficPath(plainWeaveGraph, symbolWord(word));
}
export const noFloat = (word) => warpPath(word).kind === "sofic.path:witness";
export function crossingReading(warpOver, weftOver) {
    assertBool(warpOver, "crossingReading");
    assertBool(weftOver, "crossingReading");
    return readingOfSides("knowledge", warpOver, weftOver);
}
export const readingColour = (crossing) => crossingReading(crossing, !crossing);
const isInconsistency = (reading) => !isConsistentReading(reading);
const isDefinite = (reading) => isConsistentReading(reading) && knowledgeHeight(reading) === 1;
export function readingColourWord(word) {
    assertWord(word, "readingColourWord");
    return Object.freeze(word.map(readingColour));
}
export function readingColouredSofic(word) {
    assertWord(word, "readingColouredSofic");
    return soficImage(plainWeaveGraph, [2, 3], symbolWord(word));
}
export const complementRow = (row) => {
    assertWord(row, "complementRow");
    return Object.freeze(row.map((crossing) => !crossing));
};
const rowEquals = (left, right) => left.length === right.length && left.every((crossing, index) => crossing === right[index]);
export function columnsComplement(swatch) {
    assertSwatch(swatch, "columnsComplement");
    for (let index = 0; index + 1 < swatch.length; index += 1) {
        if (!rowEquals(swatch[index + 1], complementRow(swatch[index])))
            return false;
    }
    return true;
}
export function plainWeaveSwatch(swatch) {
    assertSwatch(swatch, "plainWeaveSwatch");
    return swatch.every(noFloat) && columnsComplement(swatch);
}
export function entropyCollapse(swatch) {
    assertSwatch(swatch, "entropyCollapse");
    if (!plainWeaveSwatch(swatch))
        return false;
    return swatch.every((left) => swatch.every((right) => rowEquals(left, right) || rowEquals(left, complementRow(right))));
}
function exhaustivePairs(predicate) {
    return [false, true].every((left) => [false, true].every((right) => predicate(left, right)));
}
export function receipt(warpWord = [false, true, false, true], swatch = [[false, true, false], [true, false, true], [false, true, false]]) {
    const warpPathJudgment = warpPath(warpWord);
    const readingImage = readingColouredSofic(warpWord);
    const warpAltEqualsCompleteGraph = exhaustivePairs((left, right) => warpAlt(left, right) === completeGraphBool(left, right));
    const warpAltForbidsFloat = exhaustivePairs((value) => warpPath([value, value]).kind === "sofic.path-obstruction");
    const holeIsKBot = crossingReading(false, false) === "absurd";
    const miscrossingIsKTop = crossingReading(true, true) === "stable";
    const overUnderSwapIsNegate = exhaustivePairs((warpOver, weftOver) => negateReading(crossingReading(warpOver, weftOver)) === crossingReading(weftOver, warpOver));
    const defectFreeDefinite = [false, true].every((bit) => isDefinite(readingColour(bit)));
    const miscrossingIsInconsistency = isInconsistency(crossingReading(true, true));
    const defectFreeConsistent = [false, true].every((bit) => !isInconsistency(readingColour(bit)));
    const overUnderSwapFixesDefect = exhaustivePairs((warpOver, weftOver) => isInconsistency(negateReading(crossingReading(warpOver, weftOver))) ===
        isInconsistency(crossingReading(warpOver, weftOver)));
    const mapNotInvolutive = [[], [false], [false, true], [true, false, true]]
        .every((row) => rowEquals(complementRow(complementRow(row)), row));
    if (!warpAltEqualsCompleteGraph
        || !warpAltForbidsFloat
        || warpPathJudgment.kind !== "sofic.path:witness"
        || readingImage.kind !== "sofic.image:witness"
        || !holeIsKBot
        || !miscrossingIsKTop
        || !overUnderSwapIsNegate
        || !defectFreeDefinite
        || !miscrossingIsInconsistency
        || !defectFreeConsistent
        || !overUnderSwapFixesDefect
        || !plainWeaveSwatch(swatch)
        || !mapNotInvolutive
        || !entropyCollapse(swatch)) {
        throw new TypeError("weaveDraft.receipt: finite weave-draft laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.weaveDraft.receipt:witness",
        warpWord: Object.freeze([...warpWord]),
        warpPath: warpPathJudgment,
        readingWord: readingColourWord(warpWord),
        readingImage,
        swatch: Object.freeze(swatch.map((row) => Object.freeze([...row]))),
        warpAltEqualsCompleteGraph: true,
        warpAltForbidsFloat: true,
        warpSofic: true,
        holeIsKBot: true,
        miscrossingIsKTop: true,
        overUnderSwapIsNegate: true,
        defectFreeDefinite: true,
        miscrossingIsInconsistency: true,
        defectFreeConsistent: true,
        overUnderSwapFixesDefect: true,
        readingColouredSofic: true,
        columnsComplement: true,
        mapNotInvolutive: true,
        entropyCollapse: true,
    });
}
