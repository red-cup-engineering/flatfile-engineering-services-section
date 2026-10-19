import test from "node:test";
import assert from "node:assert/strict";
import { selectMarkRelations } from "../src/mark-relation-query.mjs";

const a = "ni:///sha-256;aaaa", b = "ni:///sha-256;bbbb", c = "ni:///sha-256;cccc";
const evidence = Object.freeze({for:Object.freeze([{by:"assertion"}]),against:Object.freeze([{by:"objection"}])});
const relation = (id, from, to, predicate, evidenceSides=evidence) =>
  Object.freeze({id,from,to,predicate,evidence:evidenceSides});
const rows = Object.freeze([
  relation("one",a,b,"supports"),
  relation("two",b,a,"supports"),
  relation("three",b,c,"refutes"),
  relation("four",a,a,"supports"),
  relation("five",a,b,"supports"),
]);
const chart = Object.freeze({
  kind:"lspace.digital-topology",
  resources:Object.freeze([a,b,c].map(address=>Object.freeze({address}))),
  relations:rows,
});

test("indexed query retrieves original directed source relations and negative witnesses", () => {
  const all=selectMarkRelations(chart);
  assert.deepEqual(all,rows);
  assert.ok(Object.isFrozen(all));
  assert.strictEqual(all[0],rows[0]);
  assert.strictEqual(all[0].evidence.against,evidence.against);
  assert.deepEqual(selectMarkRelations(chart,{from:a}),[rows[0],rows[3],rows[4]]);
  assert.deepEqual(selectMarkRelations(chart,{to:a}),[rows[1],rows[3]]);
  assert.deepEqual(selectMarkRelations(chart,{address:a}),[rows[0],rows[1],rows[3],rows[4]],
    "a self-loop is never counted twice in an undirected incidence read");
  assert.deepEqual(selectMarkRelations(chart,{address:a,predicate:"supports",from:b,to:a}),[rows[1]]);
  assert.deepEqual(selectMarkRelations(chart,{from:a,to:b,predicate:"supports"}),[rows[0],rows[4]],
    "parallel independent testimonies must not be collapsed");
  assert.deepEqual(selectMarkRelations(chart,{predicate:"not-authored"}),[]);
  assert.deepEqual(selectMarkRelations({...chart,relations:Object.freeze([])}),[],
    "source absence does not generate a relation");
});

test("unknown NI, unsupported query, and invented edges cannot be read through admitted coordinates", () => {
  for (const key of ["address","from","to"])
    assert.throws(()=>selectMarkRelations(chart,{[key]:"ni:///sha-256;unknown"}),/not admitted/);
  for (const bad of [null,[],{address:""},{from:null},{predicate:undefined},{q:"free text"},{includeReader:true}])
    assert.throws(()=>selectMarkRelations(chart,bad),/selectors/);
  assert.throws(()=>selectMarkRelations({kind:"invented",resources:[],relations:[]}),/admitted chart/);
  assert.throws(()=>selectMarkRelations({...chart,relations:[relation("ghost",a,"ni:///sha-256;ghost","supports")]}),/witnessed edges/);
  assert.throws(()=>selectMarkRelations({...chart,relations:[{...rows[0],evidence:{for:[],against:false}}]}),/witnessed edges/);
  const malformed=Object.freeze({
    kind:chart.kind,resources:chart.resources,
    relations:Object.freeze([Object.freeze({id:"bad",from:a,to:b,predicate:"supports"})]),
  });
  assert.throws(()=>selectMarkRelations(malformed),/witnessed edges/,
    "a frozen but missing testimony must refuse rather than crash in the cache branch");
});

test("a caller-mutable chart is reindexed after change; immutable charts reuse canonical rows", () => {
  const mutable={kind:chart.kind,resources:chart.resources,relations:[rows[0]]};
  assert.deepEqual(selectMarkRelations(mutable,{address:b}),[rows[0]]);
  mutable.relations.push(rows[2]);
  assert.deepEqual(selectMarkRelations(mutable,{address:b}),[rows[0],rows[2]]);
  assert.deepEqual(selectMarkRelations(chart,{predicate:"refutes"}),[rows[2]]);
  assert.deepEqual(selectMarkRelations(chart,{predicate:"refutes"}),[rows[2]]);
});
