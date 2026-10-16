/**
 * analysis/run-causal-set - bounded-run diamonds and their sequencing order.
 *
 * A run (one turn of one session) is a diamond: a lower endpoint (admission)
 * and an upper endpoint (its settled exit, or — while the run is still live —
 * the most recent recorded event standing in for it, deshrouded). Two runs
 * of the same session sequence when the earlier run's upper endpoint precedes
 * the later run's lower endpoint; runs of different sessions are left
 * unrelated (spacelike) unless evidence of a genuine reference between them
 * is supplied. This mirrors `HoleDiamondCausalSet.lean`'s sequencing
 * construction over the finite causal set of already-witnessed observations,
 * without asserting the causal-closure regime question that construction's
 * transfinite growth still leaves open.
 *
 * This module knows no harness's own event names — a turn opens and closes on
 * whichever two `hookEventName` values its caller supplies as `TurnVocabulary`.
 * Claude Code's own vocabulary (`UserPromptSubmit`/`Stop`) lives at the
 * integration boundary that reads Claude Code's hooks
 * (`src/integrations/hooks`), not here.
 */
import { settleCausalSet } from "../../articulation/predicating/positing/settling/analysis/causal.mjs";

/** One already-witnessed observation, reduced to what sequencing needs. */

/** A bounded run: one session's turn from admission to its (possibly proxy) exit. */

    

/** The two `hookEventName` values that open and close a turn, in whatever harness supplied the observations. */

/**
 * Derive one session's turn diamonds from its observations, in witnessed order.
 *
 * Each `vocabulary.opensTurn` observation opens a diamond; the next
 * `vocabulary.closesTurn` observation for the same session closes it. A turn
 * with no witnessed close yet is diamonded against the session's own most
 * recent observation (deshrouding) — but only when some later observation
 * actually exists, since an admission with nothing witnessed after it is not
 * yet a diamond at all.
 */
/** Pure segmentation by actual observed openings and closes, with no inferred clock. */
export function observedDiamondIntervals(observations, kindOf, opens, closes) {
  if (!Array.isArray(observations) || typeof kindOf !== "function" ||
      typeof opens !== "string" || typeof closes !== "string" ||
      !opens || !closes || opens === closes)
    throw new TypeError("diamond intervals require distinct opening and closing kinds");
  const intervals = [];
  let start, last;
  const append = (upper, deshrouded) => {
    if (start === undefined || upper === undefined || (deshrouded && start === upper)) return;
    intervals.push(Object.freeze({ index: intervals.length, lower: start, upper, deshrouded }));
  };
  for (const observation of observations) {
    if (observation === undefined) continue;
    const kind = kindOf(observation);
    if (kind === opens) {
      append(last, true);
      start = observation;
      last = observation;
    } else if (kind === closes) {
      append(observation, false);
      start = undefined;
      last = undefined;
    } else if (start !== undefined) last = observation;
  }
  append(last, true);
  return Object.freeze(intervals);
}

export function sessionTurnDiamonds(session, observations, vocabulary) {
  const intervals = observedDiamondIntervals(observations,
    observation => observation?.hookEventName,
    vocabulary?.opensTurn, vocabulary?.closesTurn);
  return Object.freeze(intervals.map(({index,lower,upper,deshrouded}) =>
    Object.freeze({
      kind: "metroplat.run.turnDiamond",
      id: `${session}#${index}`, session, index, lower, upper, deshrouded,
    })));
}

/** Derive turn diamonds for every session present, preserving each session's witnessed order. */
export function turnDiamondsByObservation(observations, vocabulary) {
  const bySession = new Map();
  for (const observation of observations) {
    const list = bySession.get(observation.session);
    if (list === undefined) bySession.set(observation.session, [observation]);
    else list.push(observation);
  }
  const diamonds = [];
  for (const [session, list] of bySession) diamonds.push(...sessionTurnDiamonds(session, list, vocabulary));
  return Object.freeze(diamonds);
}

/**
 * Sequencing links between consecutive diamonds of the same session: turn `i`'s
 * upper endpoint precedes turn `i+1`'s lower endpoint by construction (one
 * conversation admits its turns in order). No links are asserted between
 * diamonds of different sessions — absent a witnessed reference between them,
 * two sessions' runs are spacelike, not arbitrarily ordered.
 */
export function sequencingLinks(diamonds) {
  const bySession = new Map();
  for (const diamond of diamonds) {
    const list = bySession.get(diamond.session);
    if (list === undefined) bySession.set(diamond.session, [diamond]);
    else list.push(diamond);
  }
  const links = [];
  for (const list of bySession.values()) {
    const ordered = [...list].sort((a, b) => a.index - b.index);
    for (let i = 0; i + 1 < ordered.length; i += 1) {
      const from = ordered[i];
      const to = ordered[i + 1];
      if (from !== undefined && to !== undefined) links.push(Object.freeze({ from: from.id, to: to.id }));
    }
  }
  return Object.freeze(links);
}

/** The run-space as a Lorentzian causal set: turn diamonds as events, sequencing as the seed order. */
export function runCausalSet(diamonds) {
  return Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(diamonds.map((diamond) => diamond.id)),
    links: sequencingLinks(diamonds),
  });
}

/**
 * `settleCausalSet` reads its numerator/denominator as `exact-number.mts`
 * `Natural`s — literal von Neumann ordinals, exact by construction, at the
 * cost of `O(v^2)` objects to represent the value `v` itself. That is the
 * granularity this arithmetic is *for*: a bounded causal region — a diamond,
 * a chain, one session's own turn sequence — not an aggregate spanning many
 * independent sessions' worth of a whole day. Settling belongs at the scale
 * of the region actually in question, the same way the package's own
 * diamond/chain/antichain fixtures are already the properly-scoped unit,
 * not a simplification of some larger "real" computation. `SETTLE_EVENT_CAP`
 * names that scope's boundary honestly (measured on this machine: a 30-event
 * region settles in ~100ms, 80 in ~2.8s) so a caller handed the wrong
 * granularity — many sessions' diamonds at once, say — is told plainly
 * rather than made to wait on a computation that was never the right one to
 * run.
 */
export const SETTLE_EVENT_CAP = 60;

/**
 * Settle a bounded region's sequencing order — one session's own turn
 * diamonds, not a day's worth across many sessions — reusing the same
 * closure/regime/H1 machinery as any other causal set. See
 * `SETTLE_EVENT_CAP`'s docstring for why the region must stay bounded.
 */
export function closeRunCausalSet(diamonds) {
  if (diamonds.length > SETTLE_EVENT_CAP) {
    return Object.freeze({ kind: "metroplat.run.causal-set-out-of-scope", events: diamonds.length, cap: SETTLE_EVENT_CAP });
  }
  return settleCausalSet(runCausalSet(diamonds));
}
