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
