import { readingOfSides } from "@red-cup-engineering/computer-data-services-section/four";
// readout — property tests for the FOUR-place classification and its derived orderings, plus the
// style-table lookup that replaces a hand-rolled per-place switch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PLACES, place, knowledgeWeight, salience, readout, styleFor, assertStyleTable } from "../../src/readout/index.mjs";

const rbool = () => (randomBytes(1)[0] & 1) === 1;
const randReading = () => readingOfSides("knowledge", rbool(), rbool());
const N = 200;

test("place: classifies every reading into exactly one of the four PLACES", () => {
  for (let i = 0; i < N; i++) {
    const p = place(randReading());
    assert.ok(PLACES.includes(p));
  }
});

test("place: the value bits round-trip through the classification", () => {
  assert.equal(place(readingOfSides("knowledge", false, false)), "absurd");
  assert.equal(place(readingOfSides("knowledge", true, false)), "potential");
  assert.equal(place(readingOfSides("knowledge", false, true)), "active");
  assert.equal(place(readingOfSides("knowledge", true, true)), "stable");
});

test("knowledgeWeight: absurd=0, potential/active=1, stable=2, for every reading", () => {
  for (let i = 0; i < N; i++) {
    const c = randReading();
    const w = knowledgeWeight(c);
    const expected = { absurd: 0, potential: 1, active: 1, stable: 2 }[place(c)];
    assert.equal(w, expected);
  }
});

test("salience: a total order reproducing absurd < active < potential < stable (tsander's BOT<F<T<TOP)", () => {
  const bot = readingOfSides("knowledge", false, false); // absurd
  const f = readingOfSides("knowledge", false, true);    // active
  const t = readingOfSides("knowledge", true, false);    // potential
  const top = readingOfSides("knowledge", true, true);   // stable
  assert.deepEqual([salience(bot), salience(f), salience(t), salience(top)], [0, 2, 3, 5]);
  assert.ok(salience(bot) < salience(f) && salience(f) < salience(t) && salience(t) < salience(top));
});

test("readout: bundles place/knowledgeWeight/salience/top consistently", () => {
  for (let i = 0; i < N; i++) {
    const c = randReading();
    const r = readout(c);
    assert.equal(r.place, place(c));
    assert.equal(r.knowledgeWeight, knowledgeWeight(c));
    assert.equal(r.salience, salience(c));
    assert.equal(r.top, r.place === "stable");
  }
});

test("styleFor: looks a reading's place up in a validated table", () => {
  const table = { absurd: "fog", potential: "green", active: "red", stable: "seam" };
  assert.equal(styleFor(readingOfSides("knowledge", false, false), table), "fog");
  assert.equal(styleFor(readingOfSides("knowledge", true, true), table), "seam");
});

test("assertStyleTable: throws when a place is missing", () => {
  assert.throws(() => assertStyleTable({ absurd: 1, potential: 2, active: 3 }), TypeError);
});

test("assertStyleTable: throws on a non-object table", () => {
  assert.throws(() => assertStyleTable(null), TypeError);
  assert.throws(() => assertStyleTable("nope"), TypeError);
});
