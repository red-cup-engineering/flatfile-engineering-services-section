import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import test from "node:test";

import { recordSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { querySemanticRecords } from "@red-cup-engineering/semiotic-eavt-services-section/query-semantic-records";
import { recordAdmittedSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/admit-semantic-record";
import { recordConfiguredSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-configured-semantic-record";
import { inventorySemanticRecordRetirement } from "@red-cup-engineering/semiotic-eavt-services-section/inventory-semantic-record-retirement";
import { replaySemanticRecordRetirement } from "@red-cup-engineering/semiotic-eavt-services-section/replay-semantic-record-retirement";
import { readSeavtEntries } from "@red-cup-engineering/semiotic-eavt-services-section/read-seavt-entries";
import { jsonToTerm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";

test("appends direct-SEN records and returns only the requested category", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const first = recordSemanticRecord({
    root,
    objectKind: "test.semantic-record",
    category: "research",
    record: { type: "Observation", value: 1 },
    recordedAt: "2026-08-14T00:00:00.000Z",
    told: { for: true, against: false },
  });
  assert.equal(
    first.id,
    "ni:///sha-256;2f_Hpk0mHzRPzxNX8_jf83KKWvNAYFvadX86BFATjUI",
  );
  const second = recordSemanticRecord({
    root,
    objectKind: "test.semantic-record",
    category: "operations",
    record: { type: "Observation", value: 2 },
    recordedAt: "2026-08-14T00:01:00.000Z",
    told: { for: false, against: true },
  });
  assert.equal(
    second.id,
    "ni:///sha-256;EBtqrploodqxw3nXEAmjLhpIb7u-hRnycEp6RHVldWI",
  );

  const records = querySemanticRecords({
    root,
    objectKind: "test.semantic-record",
    category: "research",
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].id, first.id);
  assert.deepEqual(records[0].record, { type: "Observation", value: 1 });
});

test("preserves opposite tellings of one record at the same instant", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-opposition-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const options = {
    root, objectKind: "test.semantic-record", category: "research",
    record: { type: "Observation", value: 1 }, recordedAt: "2026-08-14T00:00:00.000Z",
  };
  recordSemanticRecord({ ...options, told: { for: true, against: false } });
  recordSemanticRecord({ ...options, told: { for: false, against: true } });
  const rows = querySemanticRecords({ root, objectKind: options.objectKind, category: options.category });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(({ told }) => told), [
    { for: true, against: false }, { for: false, against: true },
  ]);
});

test("excludes a non-content relation sharing a record category", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-drift-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  recordSemanticRecord({
    root,
    objectKind: "test.first-kind",
    category: "research",
    record: { type: "Observation", value: 1 },
    recordedAt: "2026-08-14T00:00:00.000Z",
    told: { for: true, against: false },
  });
  assert.deepEqual(
    querySemanticRecords({
      root,
      objectKind: "test.other-kind",
      category: "research",
    }),
    [],
  );
});

test("records an admitted domain record through the same journal", (t) => {
  const root = mkdtempSync(
    join(tmpdir(), "semantic-record-journal-admission-"),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = recordAdmittedSemanticRecord({
    root,
    objectKind: "test.admitted-record",
    category: "test.admitted",
    schema: {
      type: "object",
      required: ["value"],
      additionalProperties: false,
      properties: { value: { type: "string" } },
    },
    record: { value: "kept" },
    recordedAt: "2026-09-08T00:00:00.000Z",
    told: { for: true, against: false },
  });
  assert.equal(result.objectKind, "test.admitted-record");
  assert.equal(
    querySemanticRecords({
      root,
      objectKind: "test.admitted-record",
      category: "test.admitted",
    }).length,
    1,
  );
});

test("refuses an invalid domain record before any journal write", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-refusal-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = recordAdmittedSemanticRecord({
    root,
    objectKind: "test.admitted-record",
    category: "test.admitted",
    schema: {
      type: "object",
      required: ["value"],
      additionalProperties: false,
      properties: { value: { type: "string" } },
    },
    record: { value: 1 },
    recordedAt: "2026-09-08T00:00:00.000Z",
    told: { for: true, against: false },
  });
  assert.equal(result.refused, "INVALID_SEMANTIC_RECORD");
  assert.ok(result.errors.length > 0);
  assert.equal(
    querySemanticRecords({
      root,
      objectKind: "test.admitted-record",
      category: "test.admitted",
    }).length,
    0,
  );
});

test("the command face preserves an admission refusal", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-command-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const command = spawnSync(
    process.execPath,
    [
      new URL("../src/command.mjs", import.meta.url).pathname,
      "record-admitted-semantic-record",
    ],
    {
      encoding: "utf8",
      input:
        JSON.stringify({
          root,
          objectKind: "test.command",
          category: "test",
          schema: false,
          record: {},
          recordedAt: "2026-09-08T00:00:00.000Z",
          told: { for: true, against: false },
        }) + "\n",
    },
  );
  assert.equal(command.status, 0, command.stderr);
  assert.equal(JSON.parse(command.stdout).refused, "INVALID_SEMANTIC_RECORD");
  assert.equal(
    querySemanticRecords({ root, objectKind: "test.command", category: "test" })
      .length,
    0,
  );
});

test("binds only JSON Pointer parameters and refuses invalid bound records before writing", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semantic-record-journal-template-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const configuration = {
    root,
    objectKind: "test.template",
    category: "test",
    schema: {
      type: "object",
      required: ["value"],
      properties: { value: { type: "string" } },
    },
    recordedAt: { $pointer: "/at" },
    told: { $pointer: "/told" },
    record: { value: { $pointer: "/value" } },
  };
  const accepted = recordConfiguredSemanticRecord({
    configuration,
    parameters: {
      at: "2026-09-08T00:00:00.000Z",
      told: { for: true, against: false },
      value: "kept",
    },
  });
  assert.equal(accepted.objectKind, "test.template");
  const refused = recordConfiguredSemanticRecord({
    configuration,
    parameters: {
      at: "2026-09-08T00:00:00.000Z",
      told: { for: true, against: false },
      value: 1,
    },
  });
  assert.equal(refused.refused, "INVALID_SEMANTIC_RECORD");
  assert.equal(
    querySemanticRecords({
      root,
      objectKind: "test.template",
      category: "test",
    }).length,
    1,
  );
});

test("configured command writes a valid binding and leaves an invalid binding unwritten", (t) => {
  const root = mkdtempSync(
    join(tmpdir(), "semantic-record-journal-command-template-"),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const configurationPath = join(root, "template.json");
  writeFileSync(
    configurationPath,
    JSON.stringify({
      root,
      objectKind: "test.command-template",
      category: "test",
      schema: {
        type: "object",
        required: ["value"],
        properties: { value: { type: "string" } },
      },
      recordedAt: { $pointer: "/at" },
      told: { $pointer: "/told" },
      record: { value: { $pointer: "/value" } },
    }),
  );
  const command = spawnSync(
    process.execPath,
    [
      new URL("../src/command.mjs", import.meta.url).pathname,
      "record-admitted-semantic-record",
      "--config",
      configurationPath,
    ],
    {
      encoding: "utf8",
      input: `${JSON.stringify({ at: "2026-09-08T00:00:00.000Z", told: { for: true, against: false }, value: "kept" })}\n${JSON.stringify({ at: "2026-09-08T00:00:00.000Z", told: { for: true, against: false }, value: 1 })}\n`,
    },
  );
  assert.equal(command.status, 0, command.stderr);
  assert.equal(
    JSON.parse(command.stdout.trim().split("\n")[1]).refused,
    "INVALID_SEMANTIC_RECORD",
  );
  assert.equal(
    querySemanticRecords({
      root,
      objectKind: "test.command-template",
      category: "test",
    }).length,
    1,
  );
});

test("semantic-record retirement inventories raw bytes, replays only valid SEAVT, and is idempotent", (t) => {
  const source = mkdtempSync(
    join(tmpdir(), "semantic-record-retirement-source-"),
  );
  const target = mkdtempSync(
    join(tmpdir(), "semantic-record-retirement-target-"),
  );
  t.after(() => {
    rmSync(source, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  });
  const day = join(source, "data", "logs", "2026", "09", "10");
  mkdirSync(day, { recursive: true });
  const valid = {
    e: jsonToTerm("entity"),
    a: jsonToTerm("category"),
    v: jsonToTerm("kept"),
    t: "2026-09-10T00:00:00.000Z",
  };
  const invalid = {
    e: "legacy",
    a: "category",
    v: { retained: true },
    t: "2026-09-10T00:00:01.000Z",
  };
  const sourceFile = join(day, "semantic-record-content.jsonl");
  writeFileSync(
    sourceFile,
    `${JSON.stringify(valid)}\n${JSON.stringify(invalid)}\n`,
  );
  const inventory = inventorySemanticRecordRetirement({ sourceRoot: source });
  assert.deepEqual(inventory.totals, {
    files: 1,
    bytes: readFileSync(sourceFile).length,
    rows: 2,
    admissible: 1,
    refused: 1,
    sourceReferences: 0,
  });
  assert.deepEqual(inventory.files[0].rows[1].reAdmission.requirements, [
    "ORIGINAL_SOURCE_EVIDENCE",
    "DOMAIN_ADMISSION",
    "CUSTODY_WITNESS",
  ]);
  const first = replaySemanticRecordRetirement({
    sourceRoot: source,
    targetRoot: target,
  });
  const second = replaySemanticRecordRetirement({
    sourceRoot: source,
    targetRoot: target,
  });
  assert.equal(first.appended, 1);
  assert.equal(second.appended, 0);
  assert.equal(
    first.receipt,
    second.receipt,
    "the persisted retirement plan is content-addressed and stable across replays",
  );
  assert.equal(first.refusals.length, 1);
  assert.equal(
    first.refusals[0].reAdmission.status,
    "SOURCE_EVIDENCE_REQUIRED",
  );
  assert.equal(
    readSeavtEntries({
      root: target,
      feed: "witness-journal-seavt",
      at: valid.t,
    }).length,
    1,
  );
  const archive = join(target, first.archived[0].archive);
  assert.ok(
    readFileSync(archive).equals(readFileSync(sourceFile)),
    "legacy bytes are preserved verbatim",
  );
  assert.equal(first.deletionAuthorized, false);
});

test(
  "the NDJSON command commits and responds before stdin ends",
  { timeout: 5_000 },
  async (t) => {
    const root = mkdtempSync(join(tmpdir(), "semantic-record-stream-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const child = spawn(process.execPath, [
      new URL("../src/command.mjs", import.meta.url).pathname,
      "record-admitted-semantic-record",
    ]);
    t.after(() => child.kill());
    const exited = once(child, "exit");
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const lines = createInterface({ input: child.stdout });
    t.after(() => lines.close());
    const response = lines[Symbol.asyncIterator]().next();
    child.stdin.write(
      JSON.stringify({
        root,
        objectKind: "test.streaming",
        category: "test",
        schema: { type: "object" },
        record: { value: "kept" },
        recordedAt: "2026-09-08T00:00:00.000Z",
        told: { for: true, against: false },
      }) + "\n",
    );
    const first = await response;
    assert.equal(first.done, false, stderr);
    assert.equal(JSON.parse(first.value).objectKind, "test.streaming");
    assert.equal(child.stdin.writableEnded, false);
    assert.equal(
      querySemanticRecords({
        root,
        objectKind: "test.streaming",
        category: "test",
      }).length,
      1,
    );
    child.stdin.end();
    assert.equal((await exited)[0], 0, stderr);
  },
);
