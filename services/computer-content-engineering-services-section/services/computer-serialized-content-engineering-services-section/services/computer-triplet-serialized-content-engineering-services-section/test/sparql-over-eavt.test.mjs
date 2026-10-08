import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSparql, isSparqlVariable, sparqlVariable, triplePattern, triplesFromEavt, triplesToTurtle } from "../scripts/sparql-over-eavt.mjs";

// Ported from agent-organization-engine's lib/knowing/test/sparql.test.mjs, adapted to the subset of
// the SPARQL surface graphical-knowledge-system-server actually uses: a direct join over EAVT rows, not
// a cross-check against a separate Datalog evaluator (this module deliberately does not carry
// one). The chronicle-ledger cases in the original file exercise a hub-specific carrier this
// section has no reason to hold, so they are not ported.

const s = sparqlVariable("s");
const o = sparqlVariable("o");
const value = sparqlVariable("value");

const rows = Object.freeze([
  Object.freeze({ e: "urn:node:a", a: "urn:edge", v: "urn:node:b", t: "t1" }),
  Object.freeze({ e: "urn:node:b", a: "urn:edge", v: "urn:node:c", t: "t2" }),
  Object.freeze({ e: "urn:claim:top", a: "urn:truth", v: "true", t: "t3" }),
  Object.freeze({ e: "urn:claim:top", a: "urn:truth", v: "false", t: "t4" }),
]);

test("sparqlVariable and isSparqlVariable name and recognize a SPARQL variable term", () => {
  assert.deepEqual(s, { kind: "knowing.sparql.variable", name: "s" });
  assert.equal(isSparqlVariable(s), true);
  assert.equal(isSparqlVariable("urn:node:a"), false);
  assert.equal(isSparqlVariable({ kind: "other", name: "s" }), false);
});

test("SPARQL BGP SELECT returns exactly the bindings its WHERE join derives", () => {
  const result = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["s", "o"]),
    where: Object.freeze([triplePattern(s, "urn:edge", o)]),
  }));

  assert.deepEqual(result.bindings, [
    { s: "urn:node:a", o: "urn:node:b" },
    { s: "urn:node:b", o: "urn:node:c" },
  ]);
});

test("SPARQL ASK and CONSTRUCT are projections of the same BGP evaluation", () => {
  const ask = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "ask",
    where: Object.freeze([triplePattern("urn:node:a", "urn:edge", "urn:node:b")]),
  }));
  assert.equal(ask.ask, true);

  const askMiss = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "ask",
    where: Object.freeze([triplePattern("urn:node:a", "urn:edge", "urn:node:z")]),
  }));
  assert.equal(askMiss.ask, false);

  const construct = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "construct",
    where: Object.freeze([triplePattern(s, "urn:edge", o)]),
    construct: Object.freeze([triplePattern(s, "urn:derivedEdge", o)]),
  }));

  assert.deepEqual(construct.triples, [
    { s: "urn:node:a", p: "urn:derivedEdge", o: "urn:node:b" },
    { s: "urn:node:b", p: "urn:derivedEdge", o: "urn:node:c" },
  ]);
  assert.equal(
    construct.turtle,
    "<urn:node:a> <urn:derivedEdge> <urn:node:b> .\n<urn:node:b> <urn:derivedEdge> <urn:node:c> .\n",
  );
});

test("a knowledge-top cell is query-complete: both witnessed sides surface as bindings", () => {
  const result = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["value"]),
    where: Object.freeze([triplePattern("urn:claim:top", "urn:truth", value)]),
  }));

  assert.deepEqual(result.bindings, [
    { value: "false" },
    { value: "true" },
  ]);
});

test("triplesFromEavt reads EAVT rows directly as s/p/o triples, dropping t", () => {
  assert.deepEqual(triplesFromEavt(rows), [
    { s: "urn:node:a", p: "urn:edge", o: "urn:node:b" },
    { s: "urn:node:b", p: "urn:edge", o: "urn:node:c" },
    { s: "urn:claim:top", p: "urn:truth", o: "true" },
    { s: "urn:claim:top", p: "urn:truth", o: "false" },
  ]);
});

test("triplesToTurtle writes an empty graph as an empty string", () => {
  assert.equal(triplesToTurtle([]), "");
});
