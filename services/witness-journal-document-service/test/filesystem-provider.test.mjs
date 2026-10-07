import assert from "node:assert/strict";
import { access, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { watch } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createFilesystemWitnessJournalBinding } from "../src/filesystem-provider.mjs";
import { querySettlementRecords, recordSettlementRecord, relationalWitnessJournalDocument, resolveWitnessJournalDocument } from "../src/witness-journal-document.mjs";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";

test("filesystem custody survives binding restart and retains immutable content", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "witness-journal-document-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await createFilesystemWitnessJournalBinding(root);
  await recordSettlementRecord({
    ...first,
    settlement: "eip155:8453:0x0000000000000000000000000000000000000001",
    actor: "urn:ame:paid-ephemeris-gateway",
    category: "settled-ephemeris",
    recordedAt: "2026-08-15T00:00:00.000Z",
    record: { transaction: "0xabc" },
  });

  const restarted = await createFilesystemWitnessJournalBinding(root);
  assert.deepEqual(await querySettlementRecords("settled-ephemeris", restarted), [{ transaction: "0xabc" }]);

  const objectDirectories = await import("node:fs/promises").then(({ readdir }) => readdir(join(root, "objects", "immutable", "sha-256")));
  assert.ok(objectDirectories.length > 0);
  const names = await import("node:fs/promises").then(({ readdir }) => readdir(join(root, "objects", "immutable", "sha-256", objectDirectories[0])));
  const firstObject = await readFile(join(root, "objects", "immutable", "sha-256", objectDirectories[0], names[0]), "utf8");
  assert.match(firstObject, /org\.red-cup-engineering\.filesystem-immutable-content\.v1/);
});

test("migrates legacy witness-journal object bytes through verified immutable custody", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "witness-journal-document-legacy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const document = relationalWitnessJournalDocument({ type: "SettlementRecord", category: "legacy", recordedAt: "2026-08-15T00:00:00.000Z", record: { migrated: true } });
  const identified = identifyJsonSemanticContent({ objectKind: "witness-journal.document", value: document, witnessRoot: EMPTY_WITNESS_ROOT });
  const legacy = join(root, "objects", "sha-256");
  await mkdir(legacy, { recursive: true });
  const filename = createHash("sha256").update(identified.token).digest("base64url") + ".json";
  await writeFile(join(legacy, filename), JSON.stringify({ profile: "org.red-cup-engineering.filesystem-witness-journal-document.v1", ni: identified.token, mediaType: "application/sen+cbor", bytes: Buffer.from(identified.bytes).toString("base64") }));
  await writeFile(join(legacy, "unrecognized-material.txt"), "keep this material");
  const binding = await createFilesystemWitnessJournalBinding(root);
  assert.deepEqual((await resolveWitnessJournalDocument(identified.token, binding)).value, document.value);
  assert.ok((await binding.custody.get(identified.token)).bytes.equals(identified.bytes));
  await assert.rejects(() => access(join(legacy, filename)));
  assert.equal(await readFile(join(legacy, "unrecognized-material.txt"), "utf8"), "keep this material");
});

test("refuses a legacy object changed after custody admission and leaves it in place", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "witness-journal-document-concurrent-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const document = relationalWitnessJournalDocument({ type: "SettlementRecord", category: "concurrent", recordedAt: "2026-08-15T00:00:00.000Z", record: { changed: false } });
  const identified = identifyJsonSemanticContent({ objectKind: "witness-journal.document", value: document, witnessRoot: EMPTY_WITNESS_ROOT });
  const legacy = join(root, "objects", "sha-256");
  await mkdir(legacy, { recursive: true });
  const filename = createHash("sha256").update(identified.token).digest("base64url") + ".json";
  const source = join(legacy, filename);
  const value = { profile: "org.red-cup-engineering.filesystem-witness-journal-document.v1", ni: identified.token, mediaType: "application/sen+cbor", bytes: Buffer.from(identified.bytes).toString("base64") };
  await writeFile(source, JSON.stringify(value));
  let altered = false;
  const watcher = watch(join(root, "objects"), (_event, name) => {
    if (!altered && name === "immutable") {
      altered = true;
      void writeFile(source, JSON.stringify(value) + "\n");
    }
  });
  t.after(() => watcher.close());
  await assert.rejects(() => createFilesystemWitnessJournalBinding(root), /changed during migration/);
  assert.equal(altered, true);
  assert.match(await readFile(source, "utf8"), /\n$/);
});

test("retains richer legacy JSON and symlink entries without interpreting their metadata", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "witness-journal-document-extra-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const document = relationalWitnessJournalDocument({ type: "SettlementRecord", category: "extra", recordedAt: "2026-08-15T00:00:00.000Z", record: { retained: true } });
  const identified = identifyJsonSemanticContent({ objectKind: "witness-journal.document", value: document, witnessRoot: EMPTY_WITNESS_ROOT });
  const legacy = join(root, "objects", "sha-256");
  await mkdir(legacy, { recursive: true });
  const source = join(legacy, "richer.json");
  const value = { profile: "org.red-cup-engineering.filesystem-witness-journal-document.v1", ni: identified.token, mediaType: "application/sen+cbor", bytes: Buffer.from(identified.bytes).toString("base64"), provenance: { owner: "legacy" } };
  const snapshot = Buffer.from(JSON.stringify(value));
  await writeFile(source, snapshot);
  await symlink("richer.json", join(legacy, "linked.json"));
  const binding = await createFilesystemWitnessJournalBinding(root);
  assert.ok((await binding.custody.get(identified.token)).bytes.equals(identified.bytes));
  assert.deepEqual(await readFile(source), snapshot);
  assert.equal((await lstat(join(legacy, "linked.json"))).isSymbolicLink(), true);
});
