import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleDirectoryCover, observeDirectoryPlate, observeInfomaterial, receiptOf, regularFileMaterial, validateDirectoryPatchCoverReceipt } from "../src/infomaterial.mjs";
import { createTopologyProjection } from "../src/infomaterial-topology.mjs";

const temporary = (label) => mkdtemp(join(tmpdir(), `infomaterial-${label}-`));
const materialReceipt = async (path, observedAt) => ({ ...receiptOf(await observeInfomaterial(path)), patchRoot: path, observedAt });
const plateReceipt = async (path, observedAt) => receiptOf(await observeDirectoryPlate(path, { observedAt }));

test("the complete material topology has one order-independent identity", async () => {
  const left = await temporary("left"), right = await temporary("right");
  await mkdir(join(left, "d")); await writeFile(join(left, "d", "b.txt"), "beta"); await writeFile(join(left, "a.txt"), "alpha"); await symlink("a.txt", join(left, "alias"));
  await symlink("a.txt", join(right, "alias")); await writeFile(join(right, "a.txt"), "alpha"); await mkdir(join(right, "d")); await writeFile(join(right, "d", "b.txt"), "beta");
  const a = await observeInfomaterial(left), b = await observeInfomaterial(right);
  assert.equal(a.observation.materialRoot, b.observation.materialRoot);
  assert.equal(a.semanticId, b.semanticId);
  assert.equal(a.observation.entries, 5);
  assert.equal(a.observation.regularFileBytes, 9n);
  assert.deepEqual(a.observation.counts, { directory: 2n, file: 2n, "symbolic-link": 1n });
});

test("one changed byte changes both material and observation identity", async () => {
  const root = await temporary("change");
  await writeFile(join(root, "x"), "one"); const before = await observeInfomaterial(root);
  await writeFile(join(root, "x"), "two"); const after = await observeInfomaterial(root);
  assert.notEqual(before.observation.materialRoot, after.observation.materialRoot);
  assert.notEqual(before.semanticId, after.semanticId);
});

test("resource ceilings refuse partial observations", async () => {
  const root = await temporary("limit"); await writeFile(join(root, "x"), "1234");
  await assert.rejects(observeInfomaterial(root, { maximumEntries: 10, maximumBytes: 3n }), /byte ceiling exceeded/u);
});

test("one regular file is an independently observable material patch, and its material is computable from bytes", async () => {
  const root = await temporary("file-patch");
  const path = join(root, "entry.mjs"); await writeFile(path, "export const value = 1;\n");
  const result = await observeInfomaterial(path);
  assert.equal(result.observation.rootKind, "file");
  assert.equal(result.observation.entries, 1);
  assert.equal(result.observation.counts.file, 1n);
  let node;
  await observeInfomaterial(path, { onOccurrence: (occurrence) => { node = occurrence.node; } });
  assert.equal(regularFileMaterial(Buffer.from("export const value = 1;\n"), node.mode).materialRoot, result.observation.materialRoot);
});

test("an optional occurrence measurement is bound to the same mutation-checked file", async () => {
  const root = await temporary("analysis");
  await writeFile(join(root, "module.mjs"), 'import "./dependency.mjs";');
  await writeFile(join(root, "dependency.mjs"), "export const value = 1;");
  const occurrences = [];
  const result = await observeInfomaterial(root, {
    onFile: async ({ path, size }) => ({ analyzedPath: path, analyzedSize: size }),
    onOccurrence: async (occurrence) => occurrences.push(occurrence),
  });
  assert.equal(result.observation.entries, 3);
  assert.deepEqual(occurrences.filter(({ node }) => node.kind === "file").map(({ path, analysis }) => ({ path, analysis })), [
    { path: "dependency.mjs", analysis: { analyzedPath: "dependency.mjs", analyzedSize: 23n } },
    { path: "module.mjs", analysis: { analyzedPath: "module.mjs", analyzedSize: 26n } },
  ]);
});

test("the topology projection writes one complete canonical N-Quads artifact", async () => {
  const root = await temporary("topology-root"), data = await temporary("topology-data");
  await mkdir(join(root, "d")); await writeFile(join(root, "d", "b.txt"), "beta"); await writeFile(join(root, "a.txt"), "alpha"); await symlink("a.txt", join(root, "alias"));
  const projection = await createTopologyProjection({ observedRoot: root, providerDataRoot: data });
  const result = await observeInfomaterial(root, { onOccurrence: projection.record });
  const artifact = await (await projection.prepare({ graph: result.semanticId, expectedEntries: result.observation.entries })).commit();
  const lines = (await readFile(artifact.path, "utf8")).trimEnd().split("\n");
  assert.equal(artifact.mediaType, "application/n-quads");
  assert.ok(lines.length >= result.observation.entries * 3);
  assert.deepEqual(lines, [...lines].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
  assert.ok(lines.every((line) => line.endsWith(` <${result.semanticId}> .`) && !line.includes("_:")));
});

test("a cover of child receipts reconstructs the same material root as recursive observation", async () => {
  const root = await temporary("cover");
  await writeFile(join(root, "a.txt"), "alpha");
  await mkdir(join(root, "nested")); await writeFile(join(root, "nested", "b.txt"), "beta");
  const plate = await plateReceipt(root, "2026-07-20T00:00:00.000Z");
  const assembled = await assembleDirectoryCover(plate, [
    { mount: "a.txt", receipt: await materialReceipt(join(root, "a.txt"), "2026-07-20T00:00:01.000Z") },
    { mount: "nested", receipt: await materialReceipt(join(root, "nested"), "2026-07-20T00:00:02.000Z") },
  ], { coveredAt: "2026-07-20T00:00:03.000Z" });
  const whole = await observeInfomaterial(root);
  assert.equal(assembled.cover.materialRoot, whole.observation.materialRoot);
  assert.equal(assembled.cover.childInteriorsRead, false);
  assert.equal(validateDirectoryPatchCoverReceipt(receiptOf(assembled)).materialRoot, whole.observation.materialRoot);
});

test("a composed cover occupies the same patch-evidence socket as a direct observation", async () => {
  const root = await temporary("recursive-cover");
  await mkdir(join(root, "nested")); await writeFile(join(root, "nested", "leaf"), "recursive");
  const inner = await assembleDirectoryCover(await plateReceipt(join(root, "nested"), "2026-07-20T00:00:00.000Z"), [
    { mount: "leaf", receipt: await materialReceipt(join(root, "nested", "leaf"), "2026-07-20T00:00:01.000Z") },
  ], { coveredAt: "2026-07-20T00:00:02.000Z" });
  const outer = await assembleDirectoryCover(await plateReceipt(root, "2026-07-20T00:00:03.000Z"), [{ mount: "nested", receipt: receiptOf(inner) }], { coveredAt: "2026-07-20T00:00:04.000Z" });
  assert.equal(outer.cover.materialRoot, (await observeInfomaterial(root)).observation.materialRoot);
  assert.equal(outer.cover.mounts[0].observation, inner.semanticId);
});

test("the assembler refuses gaps, duplicates, and mount-kind mismatches", async () => {
  const root = await temporary("cover-refusal");
  await writeFile(join(root, "a"), "a"); await mkdir(join(root, "d"));
  const plate = await plateReceipt(root, "2026-07-20T00:00:00.000Z");
  const a = await materialReceipt(join(root, "a"), "2026-07-20T00:00:01.000Z");
  const d = await materialReceipt(join(root, "d"), "2026-07-20T00:00:02.000Z");
  await assert.rejects(assembleDirectoryCover(plate, [{ mount: "a", receipt: a }]), /cover the direct-name set/u);
  await assert.rejects(assembleDirectoryCover(plate, [{ mount: "a", receipt: a }, { mount: "a", receipt: a }]), /duplicate child receipt/u);
  await assert.rejects(assembleDirectoryCover(plate, [{ mount: "a", receipt: d }, { mount: "d", receipt: a }]), /kind does not match/u);
});

test("assembly does not depend on child filesystem paths", async () => {
  const root = await temporary("cover-remote"); await writeFile(join(root, "a"), "same");
  const remote = await temporary("cover-provider"); await writeFile(join(remote, "copy"), "same");
  const assembled = await assembleDirectoryCover(await plateReceipt(root, "2026-07-20T00:00:00.000Z"), [{ mount: "a", receipt: await materialReceipt(join(remote, "copy"), "2026-07-20T00:00:01.000Z") }]);
  assert.equal(assembled.cover.materialRoot, (await observeInfomaterial(root)).observation.materialRoot);
});

test("a child receipt cannot lie about its canonical identity", async () => {
  const root = await temporary("cover-identity"); await writeFile(join(root, "a"), "a");
  const plate = await plateReceipt(root, "2026-07-20T00:00:00.000Z");
  const child = await materialReceipt(join(root, "a"), "2026-07-20T00:00:01.000Z"); child.materialRoot = `ni:///sha-256;${"A".repeat(43)}`;
  await assert.rejects(assembleDirectoryCover(plate, [{ mount: "a", receipt: child }]), /differs from its canonical object/u);
});
