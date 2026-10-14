import test from "node:test";
import assert from "node:assert/strict";
import { readingTurtle, readingJsonLd, readingVocabulary, putReadingRdfGraph } from "../scripts/reading-rdf.mjs";

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

test("claimOnly reification: alleged agency/work assertions remain queryable without RDF-level promotion",()=>{
 const folded={entity:"task-17",fiber:[
   {predicate:"incumbent",object:"character-X",value:{evidence:[["source:frontmatter"],[]]}},
   {predicate:"completed",object:true,value:{evidence:[["source:message"],["source:receiver-denial"]]}},
   {predicate:"not-authorized",object:true,value:{evidence:[[],["source:office-refusal"]]}},
   {predicate:"unobserved",object:"unknown",value:{evidence:[[],[]]}}
 ]};
 const ordinary=readingTurtle(folded,{base});
 const documentClaims=readingTurtle(folded,{base,claimOnly:true});
 // Existing consumers explicitly choosing plain triples retain that contract.
 assert.match(ordinary,/^<[^>]+> <[^>]+> "character-X" \.$/mu);
 // A reified RDF statement does not entail the underlying asserted triple.
 assert.doesNotMatch(documentClaims,/^<[^>]+> <[^>]+> "character-X" \.$/mu);
 assert.match(documentClaims,/a rdf:Statement, ws:PotentialClaim/u);
 assert.match(documentClaims,/prov:wasDerivedFrom/u);
 assert.match(documentClaims,/rdf:object "character-X"/u);
 assert.match(documentClaims,/ws:StableClaim/u);
 assert.match(ordinary,/owl:NegativePropertyAssertion/u);
 assert.doesNotMatch(documentClaims,/owl:NegativePropertyAssertion/u);
 assert.match(documentClaims,/ws:OpposedClaim/u);
 assert.doesNotMatch(documentClaims,/unknown/u);

 // Invalid mode settings cannot accidentally promote documentary claims to facts.
 assert.throws(()=>readingTurtle(folded,{base,claimOnly:"true"}),/claimOnly must be a boolean/u);
 assert.throws(()=>readingJsonLd(folded,{base,claimOnly:1}),/claimOnly must be a boolean/u);
 const jsonLd=readingJsonLd(folded,{base,claimOnly:true});
 const ordinaryJson=readingJsonLd(folded,{base});
 assert.equal(Object.hasOwn(ordinaryJson["@graph"][0],"prop:incumbent"),true);
 assert.equal(Object.hasOwn(jsonLd["@graph"][0],"prop:incumbent"),false);
 assert.equal(jsonLd["@graph"].some(n=>Array.isArray(n["@type"]) &&
   n["@type"].includes("ws:PotentialClaim") && n["rdf:object"]==="character-X"),true);
 assert.equal(jsonLd["@graph"].some(n=>n["@type"]==="ws:StableClaim"),true);
 assert.equal(ordinaryJson["@graph"].some(n=>n["@type"]==="owl:NegativePropertyAssertion"),true);
 assert.equal(jsonLd["@graph"].some(n=>n["@type"]==="owl:NegativePropertyAssertion"),false);
 assert.equal(jsonLd["@graph"].some(n=>Array.isArray(n["@type"]) &&
   n["@type"].includes("ws:OpposedClaim")),true);
 assert.match(readingVocabulary(base),/ws:OpposedClaim a owl:Class/u);
 assert.match(readingVocabulary(base),/ws:contraryClaimedBy a owl:ObjectProperty ; rdfs:domain rdf:Statement/u);
});

test("claimOnly Graph Store preserves named graph and refuses invalid claim-only policy before transport",async()=>{
 const folded={entity:"task-17",fiber:[
  {predicate:"incumbent",object:"character-X",value:{evidence:[["source:frontmatter"],[]]}}
 ]};
 const f=captured();
 const response=await putReadingRdfGraph({folded,base,graph,storeEndpoint,claimOnly:true,fetchImpl:f.fetchImpl});
 assert.equal(response.status,204);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].url.searchParams.get("graph"),graph);
 assert.equal(f.calls[0].options.body,readingTurtle(folded,{base,claimOnly:true}));
 assert.doesNotMatch(f.calls[0].options.body,/^<[^>]+> <[^>]+> "character-X" \.$/mu);
 await assert.rejects(()=>putReadingRdfGraph({folded,base,graph,storeEndpoint,
   claimOnly:"true",fetchImpl:f.fetchImpl}),/claimOnly must be a boolean/u);
 assert.equal(f.calls.length,1);
});
