import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { mark, relating, relatedBy, role } from "../src/l-space.mjs";
import { relateEntries, renderEntries } from "../src/relate-json.mjs";
import { openSpace, RECORDS } from "../src/store.mjs";

test("a mark's address is the carrier law's address of its value", () => {
  assert.equal(mark({ b: 1, a: "x" }).address, semanticId({ a: "x", b: 1 }));
  assert.equal(mark("emsenn").address, mark("emsenn").address);
});

test("a relation is a mark of ordered addresses, with no valuation", () => {
  const [s, k, v] = ["file", "authors", "emsenn"].map(mark);
  const r = relating(s.address, k.address, v.address);
  assert.deepEqual(r.value, { relating: [s.address, k.address, v.address] });
  assert.deepEqual(relatedBy(r.value), [s.address, k.address, v.address]);
  assert.notEqual(relating(v.address, k.address, s.address).address, r.address, "order is part of the relation");
  assert.equal(relatedBy({ relating: ["x", "y"] }), null);
  assert.equal(relatedBy({ relating: [s.address], extra: 1 }), null);
  assert.throws(() => relating(s.address));
  // A relation between relations is a relation.
  assert.ok(relatedBy(relating(r.address, role("test", "about").address, r.address).value));
});

test("JSON read into relations renders back to the same value", () => {
  const holder = mark("a source").address;
  const value = { title: "L-Space", authors: ["emsenn"], aliases: [], nested: { a: [1, { b: null }] }, one: true };
  const marks = new Map();
  for (const m of relateEntries(holder, value)) marks.set(m.address, m.value);
  const relations = [...marks.values()].map(relatedBy).filter((members) => members?.[0] === holder).map((members) => ({ relating: members }));
  assert.deepEqual(renderEntries(relations, (address) => marks.get(address)), value);
  // `authors: [emsenn]` relates the holder to the item itself, with its position.
  const emsenn = mark("emsenn").address;
  assert.ok([...marks.values()].some((v) => relatedBy(v)?.[2] === emsenn && relatedBy(v).length === 4));
});

test("the store finds a mark by its address alone, keeps it once and refuses a forged value", async () => {
  const root = await mkdtemp(join(tmpdir(), "l-space-"));
  const space = openSpace(root);
  const m = mark({ hello: "world" });
  assert.equal(await space.put(m), true);
  assert.equal(await space.put(m), false);
  await assert.rejects(space.put({ address: m.address, value: { hello: "forged" } }));
  await space.flush();
  const reopened = openSpace(root);
  assert.deepEqual(await reopened.get(m.address), { hello: "world" });
  assert.equal(await reopened.get(mark("absent").address), undefined);
  assert.deepEqual((await Array.fromAsync(reopened.each())).map((x) => x.address), [m.address]);
  const bucket = niBucketPath(m.address);
  await appendFile(join(root, RECORDS, bucket), JSON.stringify({ id: m.address, value: "tampered" }) + "\n");
  await assert.rejects(openSpace(root).get(m.address), /does not have address/);
  assert.match(await readFile(join(root, RECORDS, bucket), "utf8"), /hello/);
});
