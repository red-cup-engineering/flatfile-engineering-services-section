import { execute } from "./execute-eavt.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { current, consent, decode, encode, latest, relationNerve, settle } from "../src/index.mjs";
const rows = [{ e: "p", a: "name", v: "old", t: 1 }, { e: "p", a: "name", v: "new", t: 2 }, { e: "p", a: "consent", v: "public", t: 3 }, { e: "p", a: "name", v: null, t: 4 }];
test("codec is a reversible canonical row transformation", () => assert.deepEqual(decode(encode(rows[0])), rows[0]));
test("latest is a per-entity functional lens", () => assert.deepEqual(latest({ rows: rows, attributes: ["name"] }).map((fact) => fact.v), ["public", null]));
test("settlement exposes contradiction without mutating history", () => assert.equal(settle({ rows: rows, entity: "p" }).contradicted.length, 2));
test("consent is a pure projection", () => assert.equal(consent({ rows: rows, audience: "anyone" }).rows.length, 4));
test("relation nerve exposes graph invariants", () => assert.deepEqual(relationNerve({ rows: [{ e: "a", a: "links", v: "b", t: 1 }], attribute: "links" }), { vertices: 2, edges: 1, components: 1, cycles: 0 }));
test("all application effects pass through one typed request boundary", () => assert.deepEqual(execute({ operation: "entities", rows }), ["p"]));

test("retractions retain all later multivalued facts and equal-time assertions", () => {
  const facts = [2, 10, 11, 12].map((t) => ({ e: "p", a: "label", v: String(t), t }));
  const trace = [...facts, { e: "p", a: "label", v: null, t: 10 }];
  assert.deepEqual(current(trace), facts.slice(1));
  assert.deepEqual(current(current(trace)), current(trace));
  assert.equal(trace.length, 5);
});

test("historical canonical CBOR logs retain their rows", () => assert.deepEqual(decode(Buffer.from(encodeCanonical(rows[0])).toString("base64")), rows[0]));
