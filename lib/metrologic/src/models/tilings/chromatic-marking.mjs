/**
 * analysis/chromatic-marking - chromatic marks settled over a causal set.
 *
 * A mark (a color at an event) holds at every event in the marking event's
 * closed causal future and at no other event; events outside that future
 * have the color on their spacelike frontier — marked somewhere in the
 * causal set, never yet in their own past. On a chain this is exactly
 * `chromatic-lorentzian`'s `closeMarking` (past-closure of a boolean marking),
 * checked as a law below; the partial-order case is `settleCausalSet`'s
 * causal closure applied per color, inheriting its duplicate-event,
 * unknown-event, and closed-timelike-curve obstructions unchanged.
 */
import {
  settleCausalSet,

} from "../../articulation/predicating/positing/settling/analysis/causal.mjs";
import { settle as closeMarking } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/chromatic-lorentzian";

/** One chromatic mark: a color witnessed at one event of the causal set. */

const linkKey = (from, to) => `${from}|${to}`;

const sortedUnique = (values) =>
  Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));

function assertMarks(marks, events) {
  for (const mark of marks) {
    if (!events.has(mark.at)) {
      return Object.freeze({
        kind: "lorentzian.causalSettle-obstruction",
        reason: "unknown-event",
        events: Object.freeze([...events]),
        directLinks: Object.freeze([]),
        closure: Object.freeze([]),
        offending: Object.freeze({ from: mark.at, to: mark.at }),
        cycle: Object.freeze([]),
      });
    }
  }
  return undefined;
}

/**
 * Settle chromatic marks over a causal set: each color propagates to the
 * closed causal future of every event carrying it, and each event's
 * spacelike frontier is what the causal set knows that the event's past does
 * not. Obstructed exactly where `settleCausalSet` is, plus a mark at an
 * event the causal set does not contain.
 */
export function settleChromaticMarking(
  causalSet,
  marks,
) {
  const settled = settleCausalSet(causalSet);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const eventSet = new Set(settled.events);
  const markObstruction = assertMarks(marks, eventSet);
  if (markObstruction !== undefined) return markObstruction;

  const closure = new Set(settled.closure.map((link) => linkKey(link.from, link.to)));
  const causalLe = (from, to) => from === to || closure.has(linkKey(from, to));

  const allColors = sortedUnique(marks.map((mark) => mark.color));
  const settledAt = {};
  for (const event of settled.events) {
    settledAt[event] = sortedUnique(marks.filter((mark) => causalLe(mark.at, event)).map((mark) => mark.color));
  }
  const spacelikeFrontier = {};
  for (const event of settled.events) {
    const seen = new Set(settledAt[event]);
    spacelikeFrontier[event] = Object.freeze(allColors.filter((color) => !seen.has(color)));
  }

  // Idempotence: re-marking every event with every color it already settles
  // changes nothing (the closed future of a settled color is already settled).
  const remarks = settled.events.flatMap((event) =>
    (settledAt[event] ?? []).map((color) => Object.freeze({ color, at: event })));
  const settleIsIdempotent = settled.events.every((event) => {
    const again = sortedUnique(remarks.filter((mark) => causalLe(mark.at, event)).map((mark) => mark.color));
    const once = settledAt[event] ?? [];
    return again.length === once.length && again.every((color, index) => color === once[index]);
  });

  // Monotonicity along the causal order: what is settled at an event is
  // settled at every event in its closed future.
  const settleIsMonotoneAlongCausalOrder = settled.events.every((from) =>
    settled.events.every((to) => {
      if (!causalLe(from, to)) return true;
      const later = new Set(settledAt[to]);
      return (settledAt[from] ?? []).every((color) => later.has(color));
    }));

  if (!settleIsIdempotent || !settleIsMonotoneAlongCausalOrder) {
    throw new TypeError("settleChromaticMarking: settled-marking laws failed");
  }

  return Object.freeze({
    kind: "lorentzian.chromaticMarking:witness",
    causalSettle: settled,
    marks: Object.freeze(marks.map((mark) => Object.freeze({ ...mark }))),
    settledAt: Object.freeze(settledAt),
    spacelikeFrontier: Object.freeze(spacelikeFrontier),
    settleIsIdempotent: true,
    settleIsMonotoneAlongCausalOrder: true,
  });
}

/**
 * The finite laws, checked on the standard four-event causal sets: the chain
 * case reproduces `chromatic-lorentzian.closeMarking` exactly; an antichain
 * propagates nothing (every other event keeps the mark on its spacelike
 * frontier); the diamond's top settles marks made at its two spacelike
 * middles; and a closed timelike curve returns `settleCausalSet`'s own
 * obstruction rather than a marking.
 */
export function chromaticMarkingReceipt() {
  const chain = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([
      Object.freeze({ from: "a", to: "b" }),
      Object.freeze({ from: "b", to: "c" }),
      Object.freeze({ from: "c", to: "d" }),
    ]),
  });
  const chainMarking = Object.freeze([false, true, false, false]);
  const chainJudged = settleChromaticMarking(chain, [{ color: "correction", at: "b" }]);
  if (chainJudged.kind !== "lorentzian.chromaticMarking:witness") {
    throw new TypeError("chromaticMarkingReceipt: chain causal set obstructed");
  }
  const chainSettledBools = chain.events.map((event) => (chainJudged.settledAt[event] ?? []).includes("correction"));
  const chainAgrees = closeMarking(chainMarking).every((value, index) => value === chainSettledBools[index]);

  const antichain = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([]),
  });
  const antichainJudged = settleChromaticMarking(antichain, [{ color: "correction", at: "a" }]);
  if (antichainJudged.kind !== "lorentzian.chromaticMarking:witness") {
    throw new TypeError("chromaticMarkingReceipt: antichain causal set obstructed");
  }
  const antichainSpacelike = ["b", "c", "d"].every((event) =>
    (antichainJudged.spacelikeFrontier[event] ?? []).includes("correction")
    && (antichainJudged.settledAt[event] ?? []).length === 0);

  const diamond = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b", "c", "d"]),
    links: Object.freeze([
      Object.freeze({ from: "a", to: "b" }),
      Object.freeze({ from: "a", to: "c" }),
      Object.freeze({ from: "b", to: "d" }),
      Object.freeze({ from: "c", to: "d" }),
    ]),
  });
  const diamondJudged = settleChromaticMarking(diamond, [
    { color: "ruling.placement", at: "b" },
    { color: "correction.altitude", at: "c" },
  ]);
  if (diamondJudged.kind !== "lorentzian.chromaticMarking:witness") {
    throw new TypeError("chromaticMarkingReceipt: diamond causal set obstructed");
  }
  const diamondMerges =
    (diamondJudged.settledAt["d"] ?? []).length === 2
    && (diamondJudged.settledAt["b"] ?? []).length === 1
    && (diamondJudged.settledAt["c"] ?? []).length === 1
    && (diamondJudged.spacelikeFrontier["b"] ?? []).includes("correction.altitude")
    && (diamondJudged.spacelikeFrontier["c"] ?? []).includes("ruling.placement");

  const cyclic = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(["a", "b"]),
    links: Object.freeze([
      Object.freeze({ from: "a", to: "b" }),
      Object.freeze({ from: "b", to: "a" }),
    ]),
  });
  const cyclicJudged = settleChromaticMarking(cyclic, [{ color: "correction", at: "a" }]);
  const cycleObstructs = cyclicJudged.kind === "lorentzian.causalSettle-obstruction"
    && cyclicJudged.reason === "closed-timelike-curve";

  if (!chainAgrees || !antichainSpacelike || !diamondMerges || !cycleObstructs) {
    throw new TypeError("chromaticMarkingReceipt: chromatic marking laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.chromaticMarking.receipt:witness",
    chainAgreesWithChromaticLorentzianSettle: true,
    antichainKeepsMarksSpacelike: true,
    diamondMergesSpacelikeMarksAtTop: true,
    closedTimelikeCurveObstructs: true,
  });
}
