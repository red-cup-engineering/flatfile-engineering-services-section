import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import test from "node:test";

import { createSemanticRecordJournal, recordAdmittedSemanticRecord, recordConfiguredSemanticRecord } from "../src/semantic-record.mjs";
import { inventorySemanticRecordRetirement, replaySemanticRecordRetirement } from "../src/semantic-record-retirement.mjs";
import { readSeavt } from "../src/journal.mjs";
import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";

test("appends direct-RMN records and returns only the requested category", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSemanticRecordJournal({ root, objectKind: "test.semantic-record" });

  const first = journal.record({
    category: "research",
    record: { type: "Observation", value: 1 },
    recordedAt: "2026-08-14T00:00:00.000Z",
    charge: { support: true, refutation: false },
  });
  assert.equal(first.id, "ni:///sha-256;RWg_VYJZFI6iaexc8SCrW-i9Oef3X9qNpff5jlUz_rU");
  const second = journal.record({
    category: "operations",
    record: { type: "Observation", value: 2 },
    recordedAt: "2026-08-14T00:01:00.000Z",
    charge: { support: false, refutation: true },
  });
  assert.equal(second.id, "ni:///sha-256;coR8hOuLTl-sjt8JjTj47pZzhXsk4wiXiRG_lgwvc4M");

  const records = journal.query({ category: "research" });
  assert.equal(records.length, 1);
  assert.equal(records[0].id, first.id);
  assert.deepEqual(records[0].record, { type: "Observation", value: 1 });
  assert.equal(Object.hasOwn(journal, "claims"), false);
});

test("excludes a non-content relation sharing a record category", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-drift-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const writer = createSemanticRecordJournal({ root, objectKind: "test.first-kind" });
  writer.record({
    category: "research",
    record: { type: "Observation", value: 1 },
    recordedAt: "2026-08-14T00:00:00.000Z",
    charge: { support: true, refutation: false },
  });
  const foreignReader = createSemanticRecordJournal({ root, objectKind: "test.other-kind" });
  assert.deepEqual(foreignReader.query({ category: "research" }), []);
});

test("records an admitted domain record through the same journal", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-admission-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = recordAdmittedSemanticRecord({
    root,
    objectKind: "test.admitted-record",
    category: "test.admitted",
    schema: { type: "object", required: ["value"], additionalProperties: false, properties: { value: { type: "string" } } },
    record: { value: "kept" },
    recordedAt: "2026-09-08T00:00:00.000Z",
    charge: { support: true, refutation: false },
  });
  assert.equal(result.objectKind, "test.admitted-record");
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.admitted-record" }).query({ category: "test.admitted" }).length, 1);
});

test("refuses an invalid domain record before any journal write", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-refusal-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = recordAdmittedSemanticRecord({
    root,
    objectKind: "test.admitted-record",
    category: "test.admitted",
    schema: { type: "object", required: ["value"], additionalProperties: false, properties: { value: { type: "string" } } },
    record: { value: 1 },
    recordedAt: "2026-09-08T00:00:00.000Z",
    charge: { support: true, refutation: false },
  });
  assert.equal(result.refused, "INVALID_SEMANTIC_RECORD");
  assert.ok(result.errors.length > 0);
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.admitted-record" }).query({ category: "test.admitted" }).length, 0);
});

test("the command face preserves an admission refusal", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-command-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const command = spawnSync(process.execPath, [new URL("../apps/witness-journal.mjs", import.meta.url).pathname, "record-admitted-semantic-record"], {
    encoding: "utf8", input: JSON.stringify({ root, objectKind: "test.command", category: "test", schema: false, record: {}, recordedAt: "2026-09-08T00:00:00.000Z", charge: { support: true, refutation: false } }) + "\n",
  });
  assert.equal(command.status, 0, command.stderr);
  assert.equal(JSON.parse(command.stdout).refused, "INVALID_SEMANTIC_RECORD");
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.command" }).query({ category: "test" }).length, 0);
});

test("binds only JSON Pointer parameters and refuses invalid bound records before writing", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-template-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const configuration = { root, objectKind: "test.template", category: "test", schema: { type: "object", required: ["value"], properties: { value: { type: "string" } } }, recordedAt: { $pointer: "/at" }, charge: { $pointer: "/charge" }, record: { value: { $pointer: "/value" } } };
  const accepted = recordConfiguredSemanticRecord({ configuration, parameters: { at: "2026-09-08T00:00:00.000Z", charge: { support: true, refutation: false }, value: "kept" } });
  assert.equal(accepted.objectKind, "test.template");
  const refused = recordConfiguredSemanticRecord({ configuration, parameters: { at: "2026-09-08T00:00:00.000Z", charge: { support: true, refutation: false }, value: 1 } });
  assert.equal(refused.refused, "INVALID_SEMANTIC_RECORD");
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.template" }).query({ category: "test" }).length, 1);
});

test("configured command writes a valid binding and leaves an invalid binding unwritten", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-command-template-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const configurationPath = join(root, "template.json");
  writeFileSync(configurationPath, JSON.stringify({ root, objectKind: "test.command-template", category: "test", schema: { type: "object", required: ["value"], properties: { value: { type: "string" } } }, recordedAt: { $pointer: "/at" }, charge: { $pointer: "/charge" }, record: { value: { $pointer: "/value" } } }));
  const command = spawnSync(process.execPath, [new URL("../apps/witness-journal.mjs", import.meta.url).pathname, "record-admitted-semantic-record", "--config", configurationPath], { encoding: "utf8", input: `${JSON.stringify({ at: "2026-09-08T00:00:00.000Z", charge: { support: true, refutation: false }, value: "kept" })}\n${JSON.stringify({ at: "2026-09-08T00:00:00.000Z", charge: { support: true, refutation: false }, value: 1 })}\n` });
  assert.equal(command.status, 0, command.stderr);
  assert.equal(JSON.parse(command.stdout.trim().split("\n")[1]).refused, "INVALID_SEMANTIC_RECORD");
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.command-template" }).query({ category: "test" }).length, 1);
});

test("semantic-record retirement inventories raw bytes, replays only valid SEAVT, and is idempotent", (t) => {
  const source = mkdtempSync(join(tmpdir(), "semantic-record-retirement-source-"));
  const target = mkdtempSync(join(tmpdir(), "semantic-record-retirement-target-"));
  t.after(() => { rmSync(source, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true }); });
  const day = join(source, "data", "logs", "2026", "09", "10");
  mkdirSync(day, { recursive: true });
  const valid = { e: jsonToTerm("entity"), a: jsonToTerm("category"), v: jsonToTerm("kept"), t: "2026-09-10T00:00:00.000Z" };
  const invalid = { e: "legacy", a: "category", v: { retained: true }, t: "2026-09-10T00:00:01.000Z" };
  const sourceFile = join(day, "semantic-record-content.jsonl");
  writeFileSync(sourceFile, `${JSON.stringify(valid)}\n${JSON.stringify(invalid)}\n`);
  const inventory = inventorySemanticRecordRetirement({ sourceRoot: source });
  assert.deepEqual(inventory.totals, { files: 1, bytes: readFileSync(sourceFile).length, rows: 2, admissible: 1, refused: 1, sourceReferences: 0 });
  assert.deepEqual(inventory.files[0].rows[1].reAdmission.requirements, ["ORIGINAL_SOURCE_EVIDENCE", "DOMAIN_ADMISSION", "CUSTODY_WITNESS"]);
  const first = replaySemanticRecordRetirement({ sourceRoot: source, targetRoot: target });
  const second = replaySemanticRecordRetirement({ sourceRoot: source, targetRoot: target });
  assert.equal(first.appended, 1);
  assert.equal(second.appended, 0);
  assert.equal(first.receipt, second.receipt, "the persisted retirement plan is content-addressed and stable across replays");
  assert.equal(first.refusals.length, 1);
  assert.equal(first.refusals[0].reAdmission.status, "SOURCE_EVIDENCE_REQUIRED");
  assert.equal(readSeavt(target, "witness-journal-seavt", valid.t).length, 1);
  const archive = join(target, first.archived[0].archive);
  assert.ok(readFileSync(archive).equals(readFileSync(sourceFile)), "legacy bytes are preserved verbatim");
  assert.equal(first.deletionAuthorized, false);
});


test("the NDJSON command commits and responds before stdin ends", { timeout: 5_000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-stream-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const child = spawn(process.execPath, [new URL("../apps/witness-journal.mjs", import.meta.url).pathname, "record-admitted-semantic-record"]);
  t.after(() => child.kill());
  const exited = once(child, "exit");
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });
  const lines = createInterface({ input: child.stdout });
  t.after(() => lines.close());
  const response = lines[Symbol.asyncIterator]().next();
  child.stdin.write(JSON.stringify({
    root, objectKind: "test.streaming", category: "test", schema: { type: "object" },
    record: { value: "kept" }, recordedAt: "2026-09-08T00:00:00.000Z",
    charge: { support: true, refutation: false },
  }) + "\n");
  const first = await response;
  assert.equal(first.done, false, stderr);
  assert.equal(JSON.parse(first.value).objectKind, "test.streaming");
  assert.equal(child.stdin.writableEnded, false);
  assert.equal(createSemanticRecordJournal({ root, objectKind: "test.streaming" }).query({ category: "test" }).length, 1);
  child.stdin.end();
  assert.equal((await exited)[0], 0, stderr);
});
