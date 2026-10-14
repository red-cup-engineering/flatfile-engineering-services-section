import test from "node:test";
import assert from "node:assert/strict";
import { readingTurtle, putReadingRdfGraph } from "../scripts/reading-rdf.mjs";

const base="https://knowledge.example.test/";
const storeEndpoint="https://rdf.example.test/data";
const graph="urn:561:claims:lspace:v1";

function captured(status=204){
 const calls=[];
 return {calls,fetchImpl:async(url,options)=>{
   calls.push({url:new URL(url),options});
   return new Response(null,{status});
 }};
}

test("a source-folded subject publishes its evidence as standard Turtle to a named RDF graph",async()=>{
 const f=captured();
 const folded={entity:"l-space",fiber:[
   {predicate:"claimed-kind",object:"language space",value:{evidence:[["urn:witness:positive"],[]]}},
   {predicate:"disputed-claim",object:"theory",value:{evidence:[["urn:witness:for"],["urn:witness:against"]]}},
   {predicate:"opposed-claim",object:"unsound",value:{evidence:[[],["urn:witness:against-only"]]}}
 ]};
 const expected=readingTurtle(folded,{base});
 const response=await putReadingRdfGraph({folded,base,graph,storeEndpoint,fetchImpl:f.fetchImpl});
 assert.equal(response.status,204);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].url.searchParams.get("graph"),graph);
 assert.equal(f.calls[0].options.method,"PUT");
 assert.equal(f.calls[0].options.headers.get("content-type"),"text/turtle");
 assert.equal(f.calls[0].options.body,expected);
 assert.match(expected,/owl:NegativePropertyAssertion/u);
 assert.match(expected,/ws:StableClaim/u);
 assert.match(expected,/ws:claimedBy/u);
 assert.match(expected,/ws:contraryClaimedBy/u);
 assert.match(expected,/prov:wasDerivedFrom/u);
 assert.match(expected,/<https:\/\/knowledge.example.test\/l-space>/u);
});

test("no invented graph identity or unqualified subject is sent on the wire",async()=>{
 const f=captured();
 const valid={entity:"l-space",fiber:[]};
 for(const props of [
   {folded:valid,base:"/",graph,storeEndpoint},
   {folded:valid,base,storeEndpoint},
   {folded:{entity:"l-space"},base,graph,storeEndpoint},
   {folded:{entity:4,fiber:[]},base,graph,storeEndpoint},
 ]){
   await assert.rejects(()=>putReadingRdfGraph({...props,fetchImpl:f.fetchImpl}),TypeError);
 }
 assert.equal(f.calls.length,0);
});

test("remote graph refusal is not reported as an admitted write",async()=>{
 const f=captured(403);
 await assert.rejects(()=>putReadingRdfGraph({
  folded:{entity:"l-space",fiber:[]},base,graph,storeEndpoint,fetchImpl:f.fetchImpl
 }),e=>e.name==="RdfServiceHttpError"&&e.status===403);
 assert.equal(f.calls.length,1);
});
