import { test } from "node:test";
import assert from "node:assert/strict";
import {
  causalReadoutRegions,
  settleCausalSet,
  isCausalSettlementObstruction,
} from "../src/articulation/predicating/positing/settling/analysis/causal.mjs";

const chain = {
  kind: "lorentzian.causalSet",
  events: ["a", "b", "c", "d", "isolated"],
  links: [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
    { from: "c", to: "d" },
  ],
};

test("a readout cuts the finite causal order into exterior, no-readout hole, and shroud", () => {
  const result = causalReadoutRegions(chain, ["b"]);
  assert.equal(result.kind, "lorentzian.causalReadoutRegions:witness");
  assert.equal(result.causalSettlementKind, "lorentzian.causalSettle:witness");
  assert.deepEqual(result.readoutEvents, ["b"]);
  assert.deepEqual(result.exteriorEvents, ["a", "b"]);
  assert.deepEqual(result.holeEvents, ["c", "d", "isolated"]);
  // CausalAdjacency is transitive comparability, not just one immediate hop:
  // d is also shrouded because exterior a and b precede it.
  assert.deepEqual(result.shroudEvents, ["c", "d"]);
  assert.deepEqual(result.unshroudedHoleEvents, ["isolated"]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.shroudEvents));
  const settled = settleCausalSet(chain);
  for (const witness of result.shroudWitnesses) {
    assert.ok(result.exteriorEvents.includes(witness.exteriorPredecessor));
    assert.ok(result.shroudEvents.includes(witness.shroudEvent));
    assert.ok(settled.closure.some((edge) =>
      edge.from === witness.exteriorPredecessor && edge.to === witness.shroudEvent));
  }
  // Hole region is future-closed and no hole event can precede exterior.
  for (const { from, to } of settled.closure) {
    if (result.holeEvents.includes(from)) assert.ok(result.holeEvents.includes(to));
  }
});

test("readout of a terminal event, an isolated event, and an empty readout are distinct", () => {
  const terminal = causalReadoutRegions(chain, ["d"]);
  assert.deepEqual(terminal.exteriorEvents, ["a", "b", "c", "d"]);
  assert.deepEqual(terminal.holeEvents, ["isolated"]);
  assert.deepEqual(terminal.shroudEvents, []);
  const disconnected = causalReadoutRegions(chain, ["isolated"]);
  assert.deepEqual(disconnected.exteriorEvents, ["isolated"]);
  assert.deepEqual(disconnected.holeEvents, ["a", "b", "c", "d"]);
  assert.deepEqual(disconnected.shroudEvents, []);
  const none = causalReadoutRegions(chain, []);
  assert.deepEqual(none.exteriorEvents, []);
  assert.deepEqual(none.holeEvents, chain.events);
  assert.deepEqual(none.shroudEvents, []);
  assert.deepEqual(causalReadoutRegions({ kind: "lorentzian.causalSet", events: [], links: [] }, []).holeEvents, []);
});

test("readout selection refuses unknown, duplicated, or untyped boundaries", () => {
  assert.throws(() => causalReadoutRegions(chain, ["absent"]), /unknown event/);
  assert.throws(() => causalReadoutRegions(chain, ["b", "b"]), /duplicate readout/);
  assert.throws(() => causalReadoutRegions(chain, new Set(["b"])), /must be an array/);
  const cyclic = { kind: "lorentzian.causalSet", events: ["p", "q"],
    links: [{ from: "p", to: "q" }, { from: "q", to: "p" }] };
  assert.equal(isCausalSettlementObstruction(causalReadoutRegions(cyclic, ["p"])), true);
});

test("causal pair keys preserve distinct edges whose NUL-joined spellings collide", () => {
  const first = { from: "a", to: "b\u0000c" };
  const second = { from: "a\u0000b", to: "c" };
  const carrier = {
    kind: "lorentzian.causalSet",
    events: ["a", "a\u0000b", "b\u0000c", "c"],
    links: [first, second],
  };
  const settled = settleCausalSet(carrier);
  assert.equal(settled.kind, "lorentzian.causalSettle:witness");
  assert.equal(settled.apexCount, 2);
  for (const edge of [first, second]) {
    assert.ok(settled.closure.some((link) =>
      link.from === edge.from && link.to === edge.to));
  }
  const readout = causalReadoutRegions(carrier, ["c"]);
  assert.deepEqual(readout.exteriorEvents, ["a\u0000b", "c"]);
  assert.deepEqual(readout.holeEvents, ["a", "b\u0000c"]);
  assert.deepEqual(readout.shroudEvents, []);
});


test("every four-event causal DAG and readout selection obeys the finite hole/shroud laws", () => {
  const events = ["a", "b", "c", "d"];
  const possibleLinks = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++)
      possibleLinks.push({ from: events[i], to: events[j] });
  }
  let witnessed = 0;
  for (let mask = 0; mask < 2 ** possibleLinks.length; mask++) {
    const links = possibleLinks.filter((_, index) => (mask & (1 << index)) !== 0);
    const carrier = { kind: "lorentzian.causalSet", events, links };
    const settled = settleCausalSet(carrier);
    assert.equal(settled.kind, "lorentzian.causalSettle:witness");
    const precedes = (a, b) => a === b || settled.closure.some(
      link => link.from === a && link.to === b);
    for (let selection = 0; selection < 2 ** events.length; selection++) {
      const readout = events.filter((_, index) => (selection & (1 << index)) !== 0);
      const observed = causalReadoutRegions(carrier, readout);
      const exterior = events.filter(e => readout.some(r => precedes(e, r)));
      const hole = events.filter(e => !exterior.includes(e));
      const shroud = hole.filter(h => exterior.some(e => precedes(e, h)));
      assert.deepEqual(observed.exteriorEvents, exterior, "readout exterior disagrees with reflexive causal reachability");
      assert.deepEqual(observed.holeEvents, hole, "hole disagrees with no-readout predicate");
      assert.deepEqual(observed.shroudEvents, shroud, "shroud must use causal comparability, not direct links");
      assert.deepEqual(observed.unshroudedHoleEvents, hole.filter(e => !shroud.includes(e)));
      for (const a of hole) for (const b of events)
        if (precedes(a, b)) assert.ok(hole.includes(b), "hole must be future closed");
      for (const b of exterior) for (const a of events)
        if (precedes(a, b)) assert.ok(exterior.includes(a), "exterior must be past closed");
      for (const w of observed.shroudWitnesses) {
        assert.ok(exterior.includes(w.exteriorPredecessor));
        assert.ok(shroud.includes(w.shroudEvent));
        assert.ok(precedes(w.exteriorPredecessor, w.shroudEvent));
      }
      witnessed++;
    }
  }
  assert.equal(witnessed, 1024);
});
