// settling.mjs — the settling-associated sheaf and its cohomology, computed over real data.
//
// This is the central object of the cohomological development, built exactly to its definition
// (math/playground/_archive/formal/objects/settling-associated-sheaf.md and the regime theorems):
//
//   A SETTLING is a monotone sequence of stages; stage τ designates a set of predication cells
//   (knowledge accumulates — D_σ ⊆ D_τ for σ ≤ τ). Some stages are LIMIT ordinals.
//
//   𝓕_U(τ) = ℤ^{Δ⁺_τ},  the free abelian group on the cells NEWLY designated at τ
//            (Δ⁺_τ = D_τ \ D_{<τ}).
//
//   A FIRING is a stage with Δ⁺_τ ≠ ∅. A firing is NON-SCOTT-CONTINUOUS iff it happens at a LIMIT
//   stage: a cell that first appears only at the limit, obtainable from no finite sub-stage. (A
//   successor firing is a coboundary — it contributes 0 to H¹; a limit firing is a cocycle that is
//   not a coboundary — it contributes a generator.) Hence:
//
//   H¹  =  ⊕_{μ ∈ L_ns(κ)} ℤ^{Δ⁺_μ}  =  the free abelian group on the cells first designated at a
//          limit stage.   rank H¹ = the number of such cells.
//
//   cl-inv(v) = [𝟙_𝓕] = the sum of all those generators — the complete invariant for a settling up
//          to mutual local derivability (MLD): two settlings are MLD-equivalent iff their firing
//          structures agree up to settling-shift (a monotone reindexing of the stages).
//
// Everything here is finite ℤ-linear algebra over arbitrary data. A finite settling (no limit stage)
// has H¹ = 0 — which is exactly what the bilattice floor produces (see floor.mjs).
//
// Carriers are compared by CONTENT IDENTITY (`coincidenceKey`, the canonical bytes of the semiotic
// content address), never by JSON text: two carriers are the same cell exactly when they coincide.
// This module is the one home of the analysis; the presented form is the FILTRATION (`filtration`) —
// stages `{ ordinal, shape, designated }` with shape initial | successor | limit and a cofinality —
// and `settling` is a constructor from the older `{ designated, limit }` stage form (ordinal = index).
// Systems above (signcraft) delegate here over their own carriers.

import { coincidenceKey } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { closureRegimeName, omegaOrdinal } from "../articulation/predicating/positing/settling/closure.mjs";
import { ofNat, regimeOfOrdinal } from "../articulation/predicating/positing/settling/analysis/ordinal-closure.mjs";

const SHAPES = ["initial", "successor", "limit"];
const COFINALITIES = ["countable", "uncountable"];

// A stage's designated list is frozen/owned by this module once normalized, so its keys are computed once.
const keysOfList = new WeakMap();
const keysOf = (designated) => {
  let keys = keysOfList.get(designated);
  if (keys === undefined) {
    keys = designated.map(coincidenceKey);
    keysOfList.set(designated, keys);
  }
  return keys;
};
const dedup = (xs) => {
  const seen = new Set(), out = [];
  for (const x of xs) { const k = coincidenceKey(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
};

/**
 * A filtration: stages `{ ordinal, shape, designated }` (ordinal opaque to these reads; shape initial,
 * successor or limit; designated the cumulative carriers valued **t** through that stage, deduplicated
 * by content identity) and a cofinality. Stage 0 is initial; designated carriers never drop.
 * @param {Array<{ ordinal: unknown, shape: "initial"|"successor"|"limit", designated: unknown[] }>} stages
 * @param {"countable"|"uncountable"} [cofinality]
 */
export function filtration(stages, cofinality = "countable") {
  if (!Array.isArray(stages) || stages.length === 0) throw new TypeError("filtration: need at least one stage");
  if (stages[0].shape !== "initial") throw new TypeError("filtration: stage 0 must be initial");
  if (!COFINALITIES.includes(cofinality)) throw new TypeError(`filtration: cofinality is ${COFINALITIES.join(" or ")}`);
  let before = new Set();
  const normalized = stages.map((stage, index) => {
    if (!SHAPES.includes(stage.shape)) throw new TypeError(`filtration: stage ${index} has no shape`);
    const designated = Object.freeze(dedup(stage.designated ?? []));
    const keys = new Set(keysOf(designated));
    for (const k of before) if (!keys.has(k)) throw new TypeError(`filtration: stage ${index} drops cells — knowledge must only accumulate`);
    before = keys;
    return Object.freeze({ ordinal: stage.ordinal, shape: stage.shape, designated });
  });
  return Object.freeze({ kind: "metrologic.filtration", stages: Object.freeze(normalized), cofinality });
}

/**
 * Build a settling from the older stage form `{ designated, limit? }`: `designated` is the cumulative
 * set of carriers valued **t** through that stage, `limit` marks a limit ordinal (default false). The
 * stage ordinal is its index. `cofinal: "uncountable"` declares an ω₁-cofinal firing pattern (the
 * aperiodic regime, which a finite truncation otherwise presents as transfinite-bounded).
 * Validates monotonicity and that stage 0 is not a limit. Analyses accept this or a `filtration`.
 * @param {Array<{ designated: unknown[], limit?: boolean }>} stages
 * @param {{ cofinal?: "uncountable" }} [opts]
 */
export function settling(stages, opts = {}) {
  if (!Array.isArray(stages) || stages.length === 0) throw new TypeError("settling: need at least one stage");
  if (stages[0].limit) throw new TypeError("settling: stage 0 cannot be a limit ordinal");
  const norm = stages.map((s, i) => ({ designated: dedup(s.designated ?? []), limit: !!s.limit }));
  try {
    filtration(norm.map((s, i) => ({ ordinal: i, shape: i === 0 ? "initial" : s.limit ? "limit" : "successor", designated: s.designated })), opts.cofinal ?? "countable");
  } catch (e) {
    throw new TypeError(String(e.message).replace(/^filtration:/, "settling:"));
  }
  return opts.cofinal ? { stages: norm, cofinal: opts.cofinal } : { stages: norm };
}

/** Read either form as a filtration. */
function asFiltration(v) {
  if (v?.stages?.[0]?.shape !== undefined) return v;
  return filtration(
    v.stages.map((s, i) => ({ ordinal: i, shape: i === 0 ? "initial" : s.limit ? "limit" : "successor", designated: s.designated })),
    v.cofinal ?? "countable",
  );
}

/**
 * The newly-designated carriers at each stage — Δ⁺_τ = D_τ \ D_{<τ}, the support of the sheaf 𝓕_U —
 * each `{ stage, source, limit, added }` (stage is the ordinal; source the filtration stage; limit
 * whether it is a limit stage).
 */
export function increments(v) {
  const { stages } = asFiltration(v);
  return Object.freeze(stages.map((stage, index) => {
    const before = new Set(index === 0 ? [] : keysOf(stages[index - 1].designated));
    const keys = keysOf(stage.designated);
    const added = Object.freeze(stage.designated.filter((_, i) => !before.has(keys[i])));
    return Object.freeze({ stage: stage.ordinal, source: stage, limit: stage.shape === "limit", added });
  }));
}

/** The firings — the stages at which something new is designated. */
export const firings = (v) => Object.freeze(increments(v).filter((d) => d.added.length > 0));

/** The limit stages. */
export const limitStages = (v) => Object.freeze(asFiltration(v).stages.filter((stage) => stage.shape === "limit"));

/** The non-Scott-continuous firings — the firings that happen at a limit stage (L_ns). */
export const nonScottFirings = (v) => Object.freeze(firings(v).filter((d) => d.source.shape === "limit"));
export const nscFirings = nonScottFirings;

const generatorsOf = (v) => Object.freeze(nonScottFirings(v).flatMap((d) => d.added.map((cell) => Object.freeze({ stage: d.stage, cell }))));

/**
 * The first cohomology of a settling: one generator `{ stage, cell }` per carrier first designated at a
 * limit stage (the obstruction to Scott-continuity of the closure); `rank` is their count.
 * @returns {{ degree: 1, generators: {stage: unknown, cell: unknown}[], rank: number }}
 */
export function firstCohomology(v) {
  const generators = generatorsOf(v);
  return Object.freeze({ degree: 1, generators, rank: generators.length });
}

/** The temporal firing reading of H¹ in its older shape: `{ generators, rank, degree, vanishes }`. */
export function h1(v) {
  const { generators, rank, degree } = firstCohomology(v);
  return { generators: [...generators], rank, degree, vanishes: rank === 0 };
}

/** The graded gap: the carriers lost to every finite stage, one per non-Scott addition; its rank equals H¹'s. */
export function gradedGap(v) {
  const lost = generatorsOf(v);
  return Object.freeze({ lost, rank: lost.length });
}

/** The closure invariant: the non-Scott additions, stage by stage. */
export const closureInvariant = (v) => Object.freeze({
  nonScottAdditions: Object.freeze(nonScottFirings(v).map((d) => Object.freeze({ stage: d.stage, additions: d.added }))),
});

/**
 * Whether two settlings have the same closure invariant up to settling-shift: the same ordered sequence
 * of limit-stage addition sets (by content identity), stage indices ignored. Equal ⟺ MLD-equivalent.
 */
export function closureEquivalent(a, b) {
  const l = closureInvariant(a).nonScottAdditions, r = closureInvariant(b).nonScottAdditions;
  const same = (x, y) => x.length === y.length && x.every((c) => y.some((o) => coincidenceKey(o) === coincidenceKey(c)));
  return l.length === r.length && l.every((step, i) => same(step.additions, r[i].additions));
}
export const mldEquivalent = closureEquivalent;

/** The classifying invariant cl-inv(v) = [𝟙_𝓕], rendered shift-invariantly as a string (sets of content keys). */
export const clInv = (v) => JSON.stringify(closureInvariant(v).nonScottAdditions.map((s) => s.additions.map(coincidenceKey).sort()));

/**
 * The classification: closure data and the regime read off the closure ordinal (Obsmetrologia
 * `regimeOfOrd`). The ordinal is finite when no limit stage is presented and ω otherwise; the closure is
 * Scott-continuous when no limit stage adds anything; cofinality is as presented (countable when there is
 * no limit stage). Depth is the ordinal of the last firing.
 *   • strict              — no limit stage; H¹ = 0.
 *   • scott               — a limit stage but no firing at it; H¹ = 0.
 *   • transfinite-bounded — a non-Scott firing at a countable limit; H¹ ≠ 0.
 *   • aperiodic           — a non-Scott firing with declared uncountable cofinality; H¹ ≠ 0.
 */
export function classify(v) {
  const presented = asFiltration(v), fired = firings(presented), limits = limitStages(presented), nonScott = nonScottFirings(presented);
  const closure = Object.freeze({
    scottContinuous: nonScott.length === 0,
    finiteBase: limits.length === 0,
    countableCofinality: limits.length === 0 || presented.cofinality === "countable",
  });
  const ordinal = closure.finiteBase ? ofNat(presented.stages.length - 1) : omegaOrdinal();
  return Object.freeze({
    regime: closureRegimeName(regimeOfOrdinal(ordinal, closure.scottContinuous, closure.countableCofinality)),
    closure,
    depth: fired.length ? fired[fired.length - 1].stage : presented.stages[0].ordinal,
    cofinality: presented.cofinality,
    limitStages: limits.length,
    nonScottFirings: nonScott.length,
  });
}

/** A settling's depth alone — its closure ordinal κ (the last firing stage). */
export const depth = (v) => classify(v).depth;
