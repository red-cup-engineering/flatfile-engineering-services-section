import test from "node:test";
import assert from "node:assert/strict";
import { sparqlProtocol, graphStoreProtocol } from "../scripts/sparql-http-client.mjs";

const endpoint = "https://knowledge.example.test/sparql";
function fake(reply = "ok", status = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({url:new URL(url),init});
    return new Response(reply,{status});
  };
  return {calls,fetchImpl};
}

test("GET SELECT sends W3C SPARQL query string with explicit graphs",async()=>{
  const f=fake('{"head":{"vars":[]},"results":{"bindings":[]}}');
  const result=await sparqlProtocol(endpoint,"SELECT * WHERE { ?s ?p ?o }",{
    method:"GET",defaultGraphs:["urn:science:public"],namedGraphs:["urn:research:2026"],
    fetchImpl:f.fetchImpl,
  });
  assert.equal(result.status,200);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].init.method,"GET");
  assert.equal(f.calls[0].init.body,undefined);
  assert.equal(f.calls[0].url.searchParams.get("query"),"SELECT * WHERE { ?s ?p ?o }");
  assert.deepEqual(f.calls[0].url.searchParams.getAll("default-graph-uri"),["urn:science:public"]);
  assert.deepEqual(f.calls[0].url.searchParams.getAll("named-graph-uri"),["urn:research:2026"]);
  assert.equal(f.calls[0].init.headers.get("accept"),"application/sparql-results+json");
  assert.equal(f.calls[0].init.redirect,"error");
});

test("POST CONSTRUCT sends actual SPARQL text, preserving Turtle negotiation",async()=>{
  const f=fake("<urn:s> <urn:p> <urn:o> .\n");
  const q="CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }";
  const r=await sparqlProtocol(endpoint,q,{method:"POST",accept:"text/turtle",fetchImpl:f.fetchImpl});
  assert.equal(await r.text(),"<urn:s> <urn:p> <urn:o> .\n");
  assert.equal(f.calls[0].init.body,q);
  assert.equal(f.calls[0].init.headers.get("content-type"),"application/sparql-query");
  assert.equal(f.calls[0].init.headers.get("accept"),"text/turtle");
  assert.equal(f.calls[0].url.searchParams.has("query"),false);
});

test("SPARQL UPDATE is a distinct POST operation and caller-provided authorization stays with HTTP",async()=>{
  const f=fake("",204);
  await sparqlProtocol(endpoint,"INSERT DATA { <urn:s> <urn:p> <urn:o> }",{
    operation:"update",fetchImpl:f.fetchImpl,headers:{authorization:"Bearer test-only"},
  });
  assert.equal(f.calls[0].init.method,"POST");
  assert.equal(f.calls[0].init.headers.get("content-type"),"application/sparql-update");
  assert.equal(f.calls[0].init.headers.get("authorization"),"Bearer test-only");
  await assert.rejects(()=>sparqlProtocol(endpoint,"DELETE WHERE { ?s ?p ?o }",{
    operation:"update",method:"GET",fetchImpl:f.fetchImpl,
  }),/updates require POST/);
  assert.equal(f.calls.length,1);
});

test("named graph read and default graph replacement use W3C Graph Store addressing",async()=>{
  const f=fake("<urn:s> <urn:p> \"literal\" .\n");
  const read=await graphStoreProtocol("https://knowledge.example.test/data",{graph:"urn:theory:formal",fetchImpl:f.fetchImpl});
  assert.match(await read.text(),/<urn:s>/);
  assert.equal(f.calls[0].url.searchParams.get("graph"),"urn:theory:formal");
  assert.equal(f.calls[0].init.method,"GET");
  assert.equal(f.calls[0].init.headers.get("accept"),"text/turtle");
  await graphStoreProtocol("https://knowledge.example.test/data",{
    method:"PUT",body:"<urn:s> <urn:p> \"literal\" .\n",fetchImpl:f.fetchImpl,
  });
  assert.equal(f.calls[1].url.search,"?default");
  assert.equal(f.calls[1].init.method,"PUT");
  assert.equal(f.calls[1].init.headers.get("content-type"),"text/turtle");
});

test("Graph Store appends and deletes using standard methods without inventing storage",async()=>{
  const f=fake("",204);
  await graphStoreProtocol("https://knowledge.example.test/data",{
    graph:"urn:g",method:"POST",body:'{"@id":"urn:s"}',contentType:"application/ld+json",fetchImpl:f.fetchImpl,
  });
  await graphStoreProtocol("https://knowledge.example.test/data",{graph:"urn:g",method:"DELETE",fetchImpl:f.fetchImpl});
  assert.equal(f.calls[0].url.searchParams.get("graph"),"urn:g");
  assert.equal(f.calls[0].init.headers.get("content-type"),"application/ld+json");
  assert.equal(f.calls[1].init.method,"DELETE");
  assert.equal(f.calls[1].init.body,undefined);
});

test("malformed methods, data types, IRIs, URL credentials, and body combinations refuse",async()=>{
  const f=fake();
  const invalid=[
    ()=>sparqlProtocol(endpoint,"SELECT * WHERE { ?s ?p ?o }",{operation:"update",method:"GET",fetchImpl:f.fetchImpl}),
    ()=>sparqlProtocol(endpoint,"", {fetchImpl:f.fetchImpl}),
    ()=>sparqlProtocol(endpoint,"SELECT * WHERE { ?s ?p ?o }",{defaultGraphs:["urn:bad space"],fetchImpl:f.fetchImpl}),
    ()=>sparqlProtocol("https://user:secret@example.test/sparql","ASK { ?s ?p ?o }",{fetchImpl:f.fetchImpl}),
    ()=>graphStoreProtocol(endpoint,{method:"PATCH",fetchImpl:f.fetchImpl}),
    ()=>graphStoreProtocol(endpoint,{graph:"not an IRI",fetchImpl:f.fetchImpl}),
    ()=>graphStoreProtocol(endpoint,{method:"PUT",body:"not RDF",contentType:"text/plain",fetchImpl:f.fetchImpl}),
    ()=>graphStoreProtocol(endpoint,{method:"POST",fetchImpl:f.fetchImpl}),
    ()=>graphStoreProtocol(endpoint,{method:"GET",body:"oops",fetchImpl:f.fetchImpl}),
  ];
  for(const call of invalid)await assert.rejects(call,TypeError);
  assert.equal(f.calls.length,0,"invalid local input must never cause a network effect");
});

test("HTTP refusals are propagated, never reported as successful graph writes",async()=>{
  const f=fake("permission denied",403);
  await assert.rejects(()=>graphStoreProtocol(endpoint,{method:"DELETE",fetchImpl:f.fetchImpl}),
    e=>e.name==="RdfServiceHttpError"&&e.status===403);
  assert.equal(f.calls.length,1);
});
