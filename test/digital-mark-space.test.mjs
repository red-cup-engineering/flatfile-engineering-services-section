import test from "node:test";
import assert from "node:assert/strict";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { markResource, bitAt, bitWindow, bitValues, markSpace, joinMarkSpaces } from "../src/digital-mark-space.mjs";

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
  for (const bad of [-1, 0.5, NaN, 257, 1e99]) {
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
  assert.throws(() => bitValues(resource,{offset:0,count:32769}),/unbounded/);
  assert.throws(() => bitValues(resource,{offset:15,count:2}),/unbounded/);
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
