/**
 * settling/ordinal — settling-stage ordinal carriers and cofinality.
 *
 * Wraps the closure ordinals as settling-stage coordinates (initial, successor,
 * limit), the countable/uncountable cofinality witnesses, and the finitude
 * judgment on a stage ordinal.
 */
import { natEqual } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { finiteOrdinalJudgment, limitOrdinal, successorOrdinal, zeroOrdinal } from "./closure.mjs";
/** The stage ordinal carrier for the initial stage (zero ordinal). */
export const initialSettlingStageOrdinal = Object.freeze({
    kind: "predication.settling.stageOrdinal",
    ordinal: zeroOrdinal,
});
/** Wrap an ordinal as a settling stage ordinal carrier. */
export const settlingStageOrdinal = (ordinal) => Object.freeze({
    kind: "predication.settling.stageOrdinal",
    ordinal,
});
/** The stage ordinal carrier for the successor of a stage's ordinal. */
export const successorSettlingStageOrdinal = (stage) => Object.freeze({
    kind: "predication.settling.stageOrdinal",
    ordinal: successorOrdinal(stage.ordinal),
});
/** The stage ordinal carrier for a limit ordinal from a label and fundamental sequence. */
export const limitSettlingStageOrdinal = (label, fundamentalSequence) => settlingStageOrdinal(limitOrdinal(label, fundamentalSequence));
/** Countable cofinality witness. */
export const countableSettlingCofinality = Object.freeze({
    kind: "predication.settling.cofinality.countable",
});
/** Uncountable cofinality witness. */
export const uncountableSettlingCofinality = Object.freeze({
    kind: "predication.settling.cofinality.uncountable",
});
/** Judge whether a stage ordinal (or stage) is finite. */
export function judgeFinitudeOfSettlingStage(stage) {
    const stageOrdinal = stage.kind === "predication.settling.stage" ? stage.ordinal : stage;
    const reading = finiteOrdinalJudgment(stageOrdinal.ordinal);
    return reading.kind === "ordinal.closure.finiteOrdinal:witness"
        ? Object.freeze({ kind: "predication.settling.finiteStage:witness", stage: stageOrdinal, value: reading.value })
        : Object.freeze({ kind: "predication.settling.finiteStage-obstruction", stage: stageOrdinal, reading });
}
/** Whether two stage ordinals are both finite and equal in value. */
export function settlingStageOrdinalCoincidenceHolds(left, right) {
    const leftFinite = judgeFinitudeOfSettlingStage(left);
    const rightFinite = judgeFinitudeOfSettlingStage(right);
    return leftFinite.kind === "predication.settling.finiteStage:witness"
        && rightFinite.kind === "predication.settling.finiteStage:witness"
        && natEqual(leftFinite.value, rightFinite.value);
}
