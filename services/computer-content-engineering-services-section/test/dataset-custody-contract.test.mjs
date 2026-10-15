import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createContentAddressedDatasetStore } from "../src/dataset-store.mjs";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

const observedAt = "2026-07-22T01:00:00.000Z";
const fixture = async (context) => {
  const root = await mkdtemp(join(tmpdir(), "brokerage-dataset-contract-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
};

test("dataset bytes and identity come from the current canonical owner and replay exactly", async (context) => {
  const root = await fixture(context), store = createContentAddressedDatasetStore({ root });
  const dataset = { rows: [{ at: "2026-07-22T00:00:00Z", value: 1.5 }] };
  const expected = identifyJsonSemanticContent({ objectKind: "brokerage-control.dataset", value: dataset, witnessRoot: EMPTY_WITNESS_ROOT });
  const first = await store.storeDataset({ dataset, observedAt, provenance: ["urn:source:fixture"] });
  const second = await store.storeDataset({ dataset, observedAt, provenance: ["urn:source:fixture"] });
  assert.deepEqual(first, second);
  assert.equal(first.id, expected.token);
  assert.equal(first.byteLength, expected.bytes.length);
  assert.equal(first.immutable, true);
  assert.deepEqual(await readdir(root), [`${expected.token.split(";")[1]}.rmn.cbor`]);
  assert.deepEqual(await readFile(join(root, `${expected.token.split(";")[1]}.rmn.cbor`)), Buffer.from(expected.bytes));
  assert.deepEqual(await store.readDataset(first), dataset);
});

test("datasets retain credential, metadata, and byte-bound refusals before writing", async (context) => {
  const root = await fixture(context), store = createContentAddressedDatasetStore({ root, maximumBytes: 1024 });
  await assert.rejects(store.storeDataset({ dataset: { nested: { apiSecret: "fixture-only" } }, observedAt }), /credential-bearing-dataset-refused/u);
  await assert.rejects(store.storeDataset({ dataset: {}, observedAt: "invalid" }), /dataset-metadata-invalid/u);
  await assert.rejects(store.storeDataset({ dataset: { value: "x".repeat(10000) }, observedAt }), /dataset-byte-bound-exceeded/u);
  assert.deepEqual(await readdir(root), []);
});

test("dataset collision and forged-content refusals are preserved", async (context) => {
  const root = await fixture(context), store = createContentAddressedDatasetStore({ root });
  const dataset = { rows: [1, 2, 3] }, manifest = await store.storeDataset({ dataset, observedAt });
  await writeFile(join(root, `${manifest.id.split(";")[1]}.rmn.cbor`), "corrupted fixture");
  await assert.rejects(store.storeDataset({ dataset, observedAt }), /content-address-collision-refused/u);
  await assert.rejects(store.readDataset(manifest));
});

