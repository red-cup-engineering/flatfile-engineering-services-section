import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRow, rowId, parseEavtJsonLines, serializeEavtJsonLines, convertLegacyEavtTuple,
  unfoldJson, foldJson, assertDatomFact, retractDatomFact, currentDatomValue,
  foldObjectDatoms, tripleFromEavt, tripleFromDatom,
} from "../src/eavt.mjs";

test("strict EAVT row admission and identity reject non-JSON values", () => {
  const good = { e: "thing:one", a: "has", v: { x: 1 }, t: 1 };
  assert.equal(assertRow(good), good);
  assert.match(rowId(good), /^ni:\/\/\/sha-256;/);
  for (const value of [
    { e: "x", a: "a", v: Number.NaN, t: 1 },
    { e: "x", a: "a", v: "\ud800", t: 1 },
    { e: "x", a: "a", v: new Date(), t: 1 },
    { e: "x", a: "a", v: [, 1], t: 1 },
  ]) assert.throws(() => rowId(value), TypeError);
});

test("EAVT JSON-lines is strict and legacy tuples require explicit conversion", () => {
  const row = { e: "x", a: "a", v: "v", t: 1 };
  assert.deepEqual(parseEavtJsonLines('{"e":"x","a":"a","v":"v","t":1}\n'), [row]);
  assert.equal(serializeEavtJsonLines([row]), '{"a":"a","e":"x","t":1,"v":"v"}\n');
  assert.throws(() => parseEavtJsonLines('{"e":"x","a":"a","v":"v"}\n'), /missing "t"/);
  assert.deepEqual(convertLegacyEavtTuple(["x", "a", "v", 1]), row);
  assert.throws(() => convertLegacyEavtTuple(["x", "a", "v"]), TypeError);
});

test("JSON-pointer projection round-trips through admitted EAVT rows", () => {
  const source = { child: { count: 2 }, list: [true] };
  const rows = unfoldJson(source, { base: "urn:test", t: 1 });
  assert.deepEqual(foldJson(rows), source);
  assert.throws(() => unfoldJson({ "": 1 }, { t: 1 }), /non-empty/);
});

test("explicit datom events stay distinct from plain EAVT rows", () => {
  const asserted = assertDatomFact("x", "a", "v", 1);
  const retracted = retractDatomFact("x", "a", "v", 2);
  assert.deepEqual(currentDatomValue([asserted]), [{ e: "x", a: "a", v: "v" }]);
  assert.deepEqual(currentDatomValue([asserted, retracted]), []);
  assert.equal(foldObjectDatoms([asserted, retracted]).cells[0].value, "stable");
  assert.deepEqual(tripleFromEavt({ e: "x", a: "a", v: "v", t: 1 }), { s: "x", p: "a", o: "v" });
  assert.deepEqual(tripleFromDatom(asserted), { s: "x", p: "a", o: "v" });
});
