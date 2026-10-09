import { sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/** Whether the contradiction row vanishes (the bigrading collapses; the consistent CALM regime). */
export function bigradingCollapse(contradiction) {
    return contradiction === 0
        ? Object.freeze({ kind: "predication.bigradedCohomology.collapse:witness", contradiction })
        : Object.freeze({ kind: "predication.bigradedCohomology.collapse-obstruction", contradiction });
}
/** The bigraded settling-cohomology decomposition of a FOUR census: F^(t) = potential + active
 *  (the consistent truth directions), F^(⊤) = stable (the held contradictions). */
export function bigradedCohomology(census) {
    const truth = census.potential + census.active;
    const contradiction = census.stable;
    return Object.freeze({
        kind: "predication.bigradedCohomology.carrier",
        truth,
        contradiction,
        collapse: bigradingCollapse(contradiction),
    });
}
/** Place a single reading value in its bigraded row by its twist-product coordinates:
 *  both evidence sides present ↦ contradiction (⊤), exactly one ↦ truth, neither ↦ absurd (⊥). */
export function bigradedRow(value) {
    const [truthPresent, falsityPresent] = sidesOfReading(value);
    if (truthPresent && falsityPresent)
        return "contradiction";
    if (truthPresent || falsityPresent)
        return "truth";
    return "absurd";
}
/** The bigraded decomposition of a list of settled reading values, read off their twist-product
 *  coordinates (the faithful charge-level form of `bigradedCohomology`). */
export function bigradedCohomologyOfReadings(values) {
    const census = { absurd: 0, potential: 0, active: 0, stable: 0 };
    for (const value of values) {
        const row = bigradedRow(value);
        if (row === "contradiction")
            census.stable += 1;
        else if (row === "truth")
            census.potential += 1; // truth row F^(t) (sign folded; only the row rank matters)
        else
            census.absurd += 1;
    }
    return bigradedCohomology(census);
}

/** Witness that the contradiction row F^(⊤) vanishes: the bigrading collapses to single-graded
 *  truth cohomology — the consistent (strict/Scott) regime, fully CALM-compatible. */
export const bigradingCollapseWitnessSchema = {
  $id: "metroplat/closure/bigraded-cohomology/bigrading-collapse-witness",
  type: "object",
  required: ["kind", "contradiction"],
  properties: {
    kind: { const: "predication.bigradedCohomology.collapse:witness" },
    contradiction: { type: "number" },
  },
  additionalProperties: false,
  title: "BigradingCollapseWitness",
  description: "The contradiction row F^(top) vanishes: the bigrading collapses to single-graded truth cohomology.",
};

/** Obstruction recording a non-empty contradiction row F^(⊤): a genuinely 2-dimensional
 *  bigrading — an inconsistent (transfinite/aperiodic) settling with merged contradictions. */
export const bigradingObstructionSchema = {
  $id: "metroplat/closure/bigraded-cohomology/bigrading-obstruction",
  type: "object",
  required: ["kind", "contradiction"],
  properties: {
    kind: { const: "predication.bigradedCohomology.collapse-obstruction" },
    contradiction: { type: "number" },
  },
  additionalProperties: false,
  title: "BigradingObstruction",
  description: "The contradiction row F^(top) is non-empty: a genuinely 2-dimensional bigrading.",
};

