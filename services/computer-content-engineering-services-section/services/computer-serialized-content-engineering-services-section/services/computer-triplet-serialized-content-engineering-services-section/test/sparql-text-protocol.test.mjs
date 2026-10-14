import test from "node:test";
import assert from "node:assert/strict";
import {parseSparqlText} from "../scripts/sparql-text.mjs";
import {queryRdfRows,resultTerm} from "../scripts/sparql-results-json.mjs";

const rows=[
 {e:"urn:a",a:"urn:p",v:"urn:b",t:"t1"},
 {e:"urn:a",a:"urn:p",v:"urn:c",t:"t2"},
 {e:"urn:a",a:"urn:p",v:"urn:b",t:"t3"}, // same RDF triple, distinct EAVT event
 {e:"urn:b",a:"urn:p",v:"a plain literal",t:"t4"},
];
const output=q=>queryRdfRows(rows,q);
const json=q=>JSON.parse(output(q).body);
test("standard PREFIX SELECT text produces W3C SPARQL JSON results",()=>{
 const r=output("PREFIX ex: <urn:> SELECT ?s ?o WHERE { ?s ex:p ?o . }");
 assert.equal(r.mediaType,"application/sparql-results+json");
 const body=JSON.parse(r.body);
 assert.deepEqual(body.head.vars,["s","o"]);
 assert.deepEqual(body.results.bindings.find(x=>x.o.value==="a plain literal").o,
  {type:"literal",value:"a plain literal"});
 assert.deepEqual(body.results.bindings.find(x=>x.o.value==="urn:c").o,
  {type:"uri",value:"urn:c"});
});
test("RDF identity collapses witness repetition but SELECT retains bag semantics",()=>{
 const q="SELECT ?s WHERE { ?s <urn:p> ?o . }";
 assert.equal(json(q).results.bindings.filter(b=>b.s.value==="urn:a").length,2);
 assert.equal(json("SELECT DISTINCT ?s WHERE { ?s <urn:p> ?o }").results.bindings.length,2);
});
test("SELECT LIMIT and OFFSET bound the standard result",()=>{
 assert.equal(json("SELECT ?o WHERE { ?s <urn:p> ?o } LIMIT 1 OFFSET 1").results.bindings.length,1);
 assert.deepEqual(json("SELECT ?o WHERE { ?s <urn:p> ?o } LIMIT 0").results.bindings,[]);
});
test("ASK results use the W3C boolean shape",()=>{
 assert.deepEqual(json("ASK WHERE { <urn:a> <urn:p> <urn:c> }"),{head:{},boolean:true});
 assert.deepEqual(json("ASK { <urn:missing> <urn:p> <urn:c> }"),{head:{},boolean:false});
});
test("CONSTRUCT returns RDF Turtle over source rows",()=>{
 const r=output("CONSTRUCT { ?s <urn:derived> ?o } WHERE { ?s <urn:p> ?o }");
 assert.equal(r.mediaType,"text/turtle");
 assert.match(r.body,/<urn:a> <urn:derived> <urn:b> \./u);
 assert.equal(r.body.match(/<urn:a> <urn:derived> <urn:b> \./gu)?.length,1);
});
test("unbound CONSTRUCT term never fabricates an RDF statement",()=>{
 assert.throws(()=>output("CONSTRUCT { ?s <urn:r> ?notBound } WHERE { ?s <urn:p> ?o }"),/unbound variable/u);
});
test("one pattern may use a known rdf:type shorthand",()=>{
 assert.equal(parseSparqlText("ASK { ?s a <urn:Class> }").where[0].p,
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
});
test("unsupported SPARQL operations or clauses refuse visibly",()=>{
 for(const q of [
  "DELETE WHERE { ?s ?p ?o }",
  "SELECT * WHERE { ?s ?p ?o FILTER(?o>0) }",
  "SELECT * WHERE { ?s ?p ?o OPTIONAL { ?s ?q ?v } }",
  "SELECT * WHERE { GRAPH <urn:g> { ?s ?p ?o } }",
  "SELECT * WHERE { ?s ?p ?o } ORDER BY ?s",
  "PREFIX ex: <urn:> SELECT * WHERE { ?s bad:p ?o }",
 ])assert.throws(()=>output(q),/SPARQL BGP profile/u,q);
});
test("query size, graph size and malformed syntax refuse",()=>{
 assert.throws(()=>parseSparqlText("SELECT * WHERE { ?s ?p ?o }"+" ".repeat(8192)),/size/u);
 assert.throws(()=>parseSparqlText("SELECT * WHERE { ?s ?p ?o"),/unclosed/u);
 assert.throws(()=>parseSparqlText("SELECT ?s WHERE { ?s ?p ?o } LIMIT 10001"),/invalid limit/u);
});
test("source with too many rows refuses before nested-loop computation",()=>{
 assert.throws(()=>queryRdfRows(Array.from({length:10001},()=>rows[0]),
  "SELECT * WHERE { ?s ?p ?o }"),/10000/u);
});
test("tagged RDF literals preserve language/datatype in results",()=>{
 assert.deepEqual(resultTerm({kind:"literal",value:"bonjour",language:"fr"}),
  {type:"literal",value:"bonjour","xml:lang":"fr"});
 assert.deepEqual(resultTerm({kind:"literal",value:"4",datatype:"http://www.w3.org/2001/XMLSchema#integer"}),
  {type:"literal",value:"4",datatype:"http://www.w3.org/2001/XMLSchema#integer"});
 assert.throws(()=>resultTerm({kind:"unknown",value:"?"}),/unsupported RDF term/u);
});
