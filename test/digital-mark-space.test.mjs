import test from "node:test";
import assert from "node:assert/strict";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { semanticId } from "@red-cup-engineering/semiotic-content-address";
import { markResource, markBytes, bitAt, bitWindow, bitValues, markSpace, joinMarkSpaces } from "../src/digital-mark-space.mjs";

test("arbitrary binary media share one canonical NI address and exact MSB-first bit coordinates", () => {
  const bytes = Uint8Array.from([0xa5, 0x01, 0xff]);
  const resource = markResource(bytes, { mediaType: "image/png" });
  const addr = makeNiUri(bytes);
  bytes.fill(0);
  assert.equal(resource.address, addr);
  assert.equal(resource.byteLength, 3);
  assert.equal(resource.bitLength, 24);
  assert.deepEqual(Array.from({ length: 16 }, (_, i) => bitAt(resource, i).value),
    [1,0,1,0,0,1,0,1, 0,0,0,0,0,0,0,1]);
  const first = bitAt(resource, 0);
  assert.deepEqual(first.cell, [addr, 0, 1]);
  assert.equal(first.id, semanticId([addr, 0, 1]));
  assert.ok(Object.isFrozen(first.cell));
  assert.notEqual(bitAt(resource, 1).id, first.id);
  assert.equal(markResource(Uint8Array.from([0xa5, 0x01, 0xff]), { mediaType: "application/octet-stream" }).address, addr);
});

test("a bounded window traverses any digital resource without a document parser", () => {
  const res = markResource(Uint8Array.from([0xff, 0x00, 0x80]));
  const first = bitWindow(res, { offset: 4, limit: 9 });
  assert.equal(first.offset, 4);
  assert.deepEqual(first.bits.map(bit => bit.value), [1,1,1,1,0,0,0,0,0]);
  assert.equal(first.next, 13);
  const last = bitWindow(res, { offset: first.next, limit: 64 });
  assert.equal(last.next, null);
  assert.equal(last.bits.length, 11);
  for (const bad of [-1, 0, 0.5, NaN, 1e99]) {
    assert.throws(() => bitWindow(res, { limit: bad }), /bitWindow/);
  }
  assert.throws(() => bitAt(res, 24), /outside/);
  assert.throws(() => bitAt({ ...res }, 0), /admitted/);
  assert.deepEqual(bitWindow(markResource(new Uint8Array(0))).bits, []);
});

test("one typed space keeps all source presentations of equal bytes and only authored edges", () => {
  const bytes = new TextEncoder().encode("a");
  const extra = Uint8Array.from([0x00,0xfe,0x42]);
  const from = makeNiUri(bytes), to = makeNiUri(extra);
  const origin = { repository: "science", locator: "a.md", revision: "r1" };
  const entries = [
    { bytes, mediaType: "text/markdown", source: origin },
    { bytes: Uint8Array.from(bytes), mediaType: "application/octet-stream", source: { repository: "code", locator: "a.bin" } },
    { bytes: extra, mediaType: "image/jpeg", source: { repository: "media" } },
  ];
  const graph = markSpace(entries, { relations: [
    { from, to, predicate: "declares-related", evidence: { for: ["source-1"], against: ["source-2"] } },
  ] });
  origin.locator = "tampered"; entries[0].bytes[0] = 0;
  assert.equal(graph.resources.length, 2, "same raw bytes, one address");
  assert.equal(graph.resources.find(r => r.address === from).presentations.length, 2);
  assert.equal(graph.resources.find(r => r.address === from).presentations[0].source.locator, "a.md");
  assert.equal(graph.relations.length, 1);
  assert.deepEqual(graph.relations[0].evidence, { for: ["source-1"], against: ["source-2"] });
  assert.equal(graph.bit(from, 0).value, 0);
  assert.equal(graph.bit(to, 0).value, 0);
  assert.equal(graph.window(to, { limit: 4 }).bits.length, 4);
  assert.ok(Object.isFrozen(graph.resources));
  assert.ok(Object.isFrozen(graph.relations[0].evidence));
  assert.equal(markSpace(entries.slice(1)).relations.length, 0, "no inferred arrow between distinct resources");
});

test("no source, content type, or guessed address fabricates a relation or grant", () => {
  const a = markResource(Uint8Array.of(0x00)).address;
  const b = markResource(Uint8Array.of(0x01)).address;
  assert.throws(() => markSpace([{ bytes: Uint8Array.of(0) }], {
    relations: [{ from: a, to: b, predicate: "published" }],
  }), /known address endpoints/);
  assert.throws(() => markSpace([{ bytes: Uint8Array.of(0) }], {
    relations: [{ from: a, to: a, predicate: "related", evidence: { for: true, against: [] } }],
  }), /evidence/);
  assert.throws(() => markResource([0,1]), /Uint8Array/);
  assert.throws(() => markResource(Uint8Array.of(1), { mediaType: "" }), /mediaType/);
  assert.throws(() => markSpace([{ bytes: Uint8Array.of(1), source: { a: NaN } }]), /finite/);
  const noArrow = markSpace([{ bytes: Uint8Array.of(0) }, { bytes: Uint8Array.of(1) }]);
  assert.equal(noArrow.relations.length, 0);
});

test("bulk bit values share the original raw-coordinate algebra without per-bit identity allocation", () => {
  const original = Uint8Array.from([0xA5,0x5A]);
  const resource = markResource(original);
  original.fill(0);
  assert.deepEqual(bitValues(resource,{offset:0,count:16}),
    [1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0]);
  assert.deepEqual(bitValues(resource,{offset:2,count:4}),
    [2,3,4,5].map(index => bitAt(resource,index).value));
  assert.deepEqual(bitValues(resource,{offset:16,count:0}),[]);
  assert.throws(() => bitValues({...resource},{offset:0,count:1}),/admitted/);
  assert.throws(() => bitValues(resource,{offset:0,count:32769}),/invalid bit interval/);
  assert.throws(() => bitValues(resource,{offset:15,count:2}),/invalid bit interval/);
});

test("multi-resource mark spaces remain sortable before freezing, and the source-owned union is stable",()=>{
  const one=Uint8Array.of(0xa5),two=Uint8Array.of(0x5a),a=makeNiUri(one),b=makeNiUri(two);
  const left=markSpace([{bytes:one,mediaType:"text/plain",source:{office:"Science",id:"one"}}]);
  const right=markSpace([
    {bytes:two,mediaType:"image/png",source:{office:"Engineering",id:"two"}},
    {bytes:one,mediaType:"application/octet-stream",source:{office:"Operations",id:"one"}},
  ],{relations:[{from:a,to:b,predicate:"reports",evidence:{for:["r1"],against:["r2"]}}]});
  const first=joinMarkSpaces([left,right]),reverse=joinMarkSpaces([right,left,left]);
  assert.equal(first.resources.length,2);
  assert.ok(Object.isFrozen(first.resources));
  assert.equal(first.resources.find(r=>r.address===a).presentations.length,2);
  assert.deepEqual(first.resources,reverse.resources,"source-order and repeated input must not change a union");
  assert.deepEqual(first.relations,reverse.relations,"repeated historical tellings keep one typed edge");
  assert.deepEqual(first.relations[0].evidence,{for:["r1"],against:["r2"]});
  assert.equal(first.bit(a,0).value,1);
  assert.equal(first.bit(b,0).value,0);
  assert.deepEqual(joinMarkSpaces([left,left]).resources,left.resources);
  assert.equal(joinMarkSpaces([markSpace([]),left]).resources.length,1);
  assert.throws(()=>joinMarkSpaces([{...left}]),/admitted mark space/);
  assert.throws(()=>joinMarkSpaces([null]),/admitted mark space/);
});

test("cross-territory charts join with explicit two-sided relations, never implicit causality", () => {
  const sourceA=Uint8Array.of(0xa5,0x01),sourceB=Uint8Array.of(0x7f);
  const a=makeNiUri(sourceA),b=makeNiUri(sourceB);
  const science=markSpace([{bytes:sourceA,mediaType:"application/json",source:{office:"Science"}}]);
  const publicService=markSpace([{bytes:sourceB,mediaType:"image/png",source:{office:"Public"}}]);
  const alleged={from:a,to:b,predicate:"is-described-by",
    evidence:{for:[{issuer:"office-A"}],against:[{issuer:"office-B"}]}};
  assert.deepEqual(joinMarkSpaces([science,publicService]).relations,[],
    "shared digital space does not invent a cross-Office edge");
  const space=joinMarkSpaces([science,publicService],{relations:[alleged,alleged]});
  assert.equal(space.resources.length,2);
  assert.equal(space.relations.length,1);
  assert.deepEqual(space.relations[0].evidence,alleged.evidence);
  assert.equal(space.bit(a,0).value,1);
  assert.equal(space.bit(b,0).value,0);
  assert.deepEqual(joinMarkSpaces([publicService,science],{relations:[alleged]}).relations,
    space.relations,"union order cannot rewrite already witnessed relation identity");
  assert.throws(()=>joinMarkSpaces([science],{relations:[alleged]}),/known address endpoints/);
  assert.throws(()=>joinMarkSpaces([science,publicService],{
    relations:[{...alleged,evidence:{for:[],against:"false"}}]
  }),/evidence/);
  assert.throws(()=>joinMarkSpaces([science,publicService],{relations:[{
    ...alleged,to:makeNiUri(Uint8Array.of(0x22)),
  }]}),/known address endpoints/);
});

test("the same pure coordinate algebra admits a caller-sized bit projection above obsolete 256/32768 thresholds", () => {
  const resource = markResource(new Uint8Array(4097));
  const window = bitWindow(resource, { offset: 0, limit: 257 });
  assert.equal(window.bits.length, 257);
  assert.equal(window.next, 257);
  const values = bitValues(resource, { offset: 0, count: 32769 });
  assert.equal(values.length, 32769);
  assert.ok(values.every(value => value === 0));
  assert.equal(bitWindow(resource, {offset:resource.bitLength-2,limit:Number.MAX_SAFE_INTEGER}).bits.length,2);
  assert.throws(()=>bitValues(resource, {offset:0,count:resource.bitLength+1}),/invalid bit interval/);
  assert.throws(()=>bitWindow(resource, {offset:-1,limit:3}),/bitWindow/);
});

test("a source-owned union admits more than 64 finite independent charts and 4096 explicit relations", () => {
  const sources = Array.from({length:70}, (_, i) =>
    markSpace([{bytes:Uint8Array.from([i]),source:{office:"Science",index:i}}]));
  const charts = joinMarkSpaces(sources);
  assert.equal(charts.resources.length,70);
  const from = sources[0].resources[0].address, to = sources[1].resources[0].address;
  const testimony = Array.from({length:4097}, (_, i) => ({
    from,to,predicate:"associated-by-witness",
    evidence:{for:[{issuer:"fixture",i}],against:[]},
  }));
  const union = joinMarkSpaces(sources,{relations:testimony});
  assert.equal(union.resources.length,70);
  assert.equal(union.relations.length,4097);
  assert.deepEqual(joinMarkSpaces([sources[0],sources[1]]).relations,[],
    "no relation is invented merely because both sources fit in memory");
  assert.throws(()=>joinMarkSpaces([sources[0]], {relations:[testimony[0]]}),
    /known address endpoints/);
  assert.throws(()=>joinMarkSpaces([...sources,{...sources[0]}]),/admitted mark space/);
});


test("standards consumers recover exact bytes without changing original Mark identity", () => {
  const input = new TextEncoder().encode('<https://example.org/s> <https://example.org/p> "x" .\n');
  const original = Uint8Array.from(input);
  const source = markResource(input, { mediaType: "application/n-quads" });
  const address = source.address;
  input.fill(0);
  const delivered = markBytes(source);
  assert.deepEqual(delivered, original);
  assert.deepEqual(markBytes(source, { offset: 1, length: 9 }), original.slice(1, 10));
  delivered.fill(255);
  assert.deepEqual(markBytes(source), original, "transport copy cannot mutate admitted bytes");
  assert.equal(source.address, address);
  assert.equal(makeNiUri(markBytes(source)), address);
  assert.deepEqual(markBytes(markResource(new Uint8Array(0))), new Uint8Array(0));
  assert.deepEqual(markBytes(source, { offset: original.length, length: 0 }), new Uint8Array(0));
  assert.throws(() => markBytes({ ...source }), /admitted mark resource/u);
  for (const bad of [
    {offset: -1}, {offset: 0.5}, {offset: original.length + 1},
    {length: -1}, {length: original.length + 1}
  ]) assert.throws(() => markBytes(source, bad), /byte range/u);
});
