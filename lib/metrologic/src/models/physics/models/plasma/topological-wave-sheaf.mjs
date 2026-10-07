/**
 * models/plasma/topological-wave-sheaf - finite band sheaf witnesses.
 *
 * This captures `Obsmetrologia.Relational.Plasma.TopologicalWaveSheaf`:
 * bulk Lawvere-Laplacian modes, fuzzy band-equivalence composition, and
 * edge obstructions as non-vanishing H1 in curved band regimes.
 */

export const fuzzyBandEquivalenceSchema = {
  $id: "metroplat/models/plasma/topological-wave-sheaf/fuzzy-band-equivalence",
  type: "object",
  required: ["kind", "grade", "from", "to"],
  properties: {
    kind: { const: "relational.plasma.topologicalWave.fuzzyEquiv" },
    grade: { type: "number" },
    from: { type: "string" },
    to: { type: "string" },
  },
  additionalProperties: false,
  title: "FuzzyBandEquivalence",
  description: "A fuzzy band-equivalence edge between two bulk Lawvere-Laplacian modes, at a grade.",
};

function chargeRank(charge) {
  return charge === "bot" ? 0 : charge === "mid" ? 1 : 2;
}

function chargeFromRank(rank) {
  return rank <= 0 ? "bot" : rank === 1 ? "mid" : "top";
}

export function joinCharge(left, right) {
  return chargeFromRank(Math.max(chargeRank(left), chargeRank(right)));
}

export function laplacian(coupling, mode) {
  return chargeFromRank(Math.min(chargeRank(coupling), chargeRank(mode)));
}

export function isBulkMode(coupling, mode) {
  return laplacian(coupling, mode) === mode;
}

export function bulkModeWitness(coupling, mode) {
  if (!isBulkMode(coupling, mode)) throw new TypeError("bulkModeWitness: mode is not fixed by the Laplacian");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.bulkMode:witness",
    coupling,
    mode,
    fixed: true,
    closedUnderLaplacian: true,
    closedUnderJoin: true,
    leanTheorem: "Obsmetrologia.Relational.Plasma.laplacian_H0_modes_are_global_sections",
  });
}

export function fuzzyBandEquivalence(grade, from, to) {
  if (!Number.isFinite(grade) || grade < 0) throw new TypeError("fuzzyBandEquivalence: grade must be nonnegative");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.fuzzyEquiv",
    grade,
    from,
    to,
  });
}

export function fuzzyBandEquivalenceComposes(
  first,
  second,
) {
  if (first.to !== second.from) throw new TypeError("fuzzyBandEquivalenceComposes: middle band mismatch");
  const composed = fuzzyBandEquivalence(first.grade * second.grade, first.from, second.to);
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.fuzzy_band_equivalence_composes:witness",
    first,
    second,
    composed,
    leanDefinition: "Obsmetrologia.Relational.Plasma.fuzzy_band_equivalence_composes",
  });
}

export function bandSheaf(coupling, curved) {
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.bandSheaf",
    coupling,
    curved,
  });
}

export function edgeObstruction(band) {
  if (!band.curved) throw new TypeError("edgeObstruction: flat band has no protected edge");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.edge_obstruction:witness",
    band,
    edgeObstruction: true,
    h1Nonzero: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.edge_obstruction_implies_H1_nonzero",
      "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_has_obstruction",
      "Obsmetrologia.Relational.Plasma.canonicalEdgeBand_H1_nonzero",
    ]),
  });
}

export function flatBandForbidsEdgeObstruction(band) {
  if (band.curved) throw new TypeError("flatBandForbidsEdgeObstruction: band is curved");
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.flat_forbids_edge:witness",
    band,
    noEdgeObstruction: true,
    leanTheorem: "Obsmetrologia.Relational.Plasma.flat_band_forbids_edge_obstruction",
  });
}

export function canonicalEdgeBand() {
  return bandSheaf("bot", true);
}

export function plasmaTopologicalWaveSheafReceipt() {
  return Object.freeze({
    kind: "relational.plasma.topologicalWave.receipt:witness",
    bulk: bulkModeWitness("top", "mid"),
    fuzzy: fuzzyBandEquivalenceComposes(
      fuzzyBandEquivalence(0.8, "left", "middle"),
      fuzzyBandEquivalence(0.5, "middle", "right"),
    ),
    edge: edgeObstruction(canonicalEdgeBand()),
    flat: flatBandForbidsEdgeObstruction(bandSheaf("top", false)),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.TopologicalWaveSheaf",
  });
}
