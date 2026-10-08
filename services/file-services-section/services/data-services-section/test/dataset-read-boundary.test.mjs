import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createContentAddressedDatasetStore } from "../src/dataset-store.mjs";

const observedAt = "2026-07-22T01:00:00.000Z";
const fixture = async (context) => {
  const root = await mkdtemp(join(tmpdir(), "dataset-read-boundary-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
};

test("readDataset admits a canonical NI identifier before any path read", async (context) => {
  const root = await fixture(context);
  const store = createContentAddressedDatasetStore({ root: join(root, "absent-custody") });
  for (const id of ["garbage", "ni:///sha-256;../outside", "ni:///sha-256;../../outside", "ni:///sha-256;" + "A".repeat(42) + "B", "ni:///sha-256;" + "A".repeat(43) + "?ct=x"]) {
    await assert.rejects(store.readDataset({ type: "ContentAddressedDatasetManifest", id }), { code: "invalid-ni-uri" });
  }
});

test("readDataset and collision verification refuse a final-component symlink", async (context) => {
  const root = await fixture(context), outside = join(root, "external"), custody = join(root, "custody");
  const dataset = { rows: [1, 2, 3] };
  const manifest = await createContentAddressedDatasetStore({ root: outside }).storeDataset({ dataset, observedAt });
  const filename = `${manifest.id.split(";")[1]}.rmn.cbor`;
  await mkdir(custody);
  await symlink(join(outside, filename), join(custody, filename));
  const before = await readFile(join(outside, filename));
  const store = createContentAddressedDatasetStore({ root: custody });
  await assert.rejects(store.readDataset(manifest), /dataset-symlink-refused/u);
  await assert.rejects(store.storeDataset({ dataset, observedAt }), /dataset-symlink-refused/u);
  assert.deepEqual(await readFile(join(outside, filename)), before);
});

test("the regular-file guard refuses a FIFO without waiting for a writer", { skip: process.platform !== "linux" }, async (context) => {
  const root = await fixture(context);
  const manifest = { type: "ContentAddressedDatasetManifest", id: "ni:///sha-256;" + "A".repeat(43) };
  execFileSync("mkfifo", [join(root, "A".repeat(43) + ".rmn.cbor")]);
  const source = new URL("../src/dataset-store.mjs", import.meta.url).href;
  const code = `import { createContentAddressedDatasetStore } from ${JSON.stringify(source)};
    try { await createContentAddressedDatasetStore({ root: ${JSON.stringify(root)} }).readDataset(${JSON.stringify(manifest)}); process.exitCode = 1; }
    catch (error) { if (error.message !== "dataset-regular-file-required") throw error; }`;
  const child = spawnSync(process.execPath, [...process.execArgv, "--input-type=module", "-e", code], { encoding: "utf8", timeout: 3000 });
  assert.equal(child.error, undefined, "dataset read must not wait for a FIFO writer");
  assert.equal(child.status, 0, child.stderr);
});
