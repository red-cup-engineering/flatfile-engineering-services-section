import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  appendJsonl,
  commitJsonlRecords,
  parseLines,
  projectJsonlRecords,
  readJsonlAtPath,
  serializeLines,
  verifyJsonlCommitment,
  writeJsonl,
} from "../src/index.mjs";

test("JSONL parsing preserves line order, skips blanks, and names malformed lines", () => {
  assert.deepEqual(parseLines('{"a":1}\n\n {"b":2}\n'), [{ a: 1 }, { b: 2 }]);
  assert.throws(() => parseLines('{"a":1}\nnope\n'), /line 2/);
});

test("JSONL serialization is canonical and has exactly one trailing newline", () => {
  assert.equal(serializeLines([{ z: 1, a: [true] }]), '{"a":[true],"z":1}\n');
  assert.equal(serializeLines([]), "");
});

test("JSONL commitments bind canonical values, sequence order, and Merkle blocks", () => {
  const records = [
    { type: "key", payload: { repeat: false }, seq: 1, source_id: "ui.keyboard", mono_ts: 1.5 },
    { seq: 2, mono_ts: 1.8, source_id: "ui.keyboard", type: "key", code: "KeyA", payload: { repeat: false } },
  ];
  const commitment = commitJsonlRecords({ records });
  assert.deepEqual(commitment, {
    profile: "jsonl-jcs-sha256-sequence-v1",
    records: 2,
    entries: [
      {
        ordinal: 1,
        canonical: '{"mono_ts":1.5,"payload":{"repeat":false},"seq":1,"source_id":"ui.keyboard","type":"key"}',
        digest: "858fb7aa0cd582d94f5d27a8cbf8bb584d1198d00048f57d28eebc61ea0df3fd",
        rollingDigest: "858fb7aa0cd582d94f5d27a8cbf8bb584d1198d00048f57d28eebc61ea0df3fd",
      },
      {
        ordinal: 2,
        canonical: '{"code":"KeyA","mono_ts":1.8,"payload":{"repeat":false},"seq":2,"source_id":"ui.keyboard","type":"key"}',
        digest: "5873e9fe0680d293e9f1222356b565c6085803e57d168b8c60115f9e2e14cbb5",
        rollingDigest: "c1f2db10f4bed2cb49e7b7e5bf3eac63f648f15e642463a21bdfeb97c95926f0",
      },
    ],
    rollingDigest: "c1f2db10f4bed2cb49e7b7e5bf3eac63f648f15e642463a21bdfeb97c95926f0",
    merkleRoot: "35ca25aeb242c2ac3b764ccbe57969b566ff3be9a061707135fa179a3a578f7a",
  });
  assert.deepEqual(verifyJsonlCommitment({ records, commitment }), { ok: true, records: 2, failure: null });
  const altered = { ...commitment, entries: commitment.entries.map((entry) => ({ ...entry })) };
  altered.entries[1].digest = "0".repeat(64);
  assert.deepEqual(verifyJsonlCommitment({ records, commitment: altered }), {
    ok: false,
    records: 0,
    failure: { code: "digest-mismatch", message: "commitment digest differs at ordinal 2", ordinal: 2 },
  });
  assert.equal(verifyJsonlCommitment({ records: [...records].reverse(), commitment }).failure.code, "canonical-mismatch");
});

test("read, replace, append, and projection retain the carrier's order", () => {
  const root = mkdtempSync(join(tmpdir(), "jsonl-"));
  try {
    const path = join(root, "nested", "rows.jsonl");
    assert.deepEqual(readJsonlAtPath(path), []);
    assert.deepEqual(writeJsonl({ path, records: [{ b: 2, a: 1 }] }), {
      path,
      records: 1,
      bytes: 14,
    });
    assert.deepEqual(appendJsonl({ path, records: [{ a: 3, b: 4 }] }), {
      path,
      records: 1,
      bytes: 14,
    });
    assert.deepEqual(readJsonlAtPath(path), [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    assert.deepEqual(
      projectJsonlRecords({ records: readJsonlAtPath(path), keys: ["b"] }),
      [{ b: 2 }, { b: 4 }],
    );
    assert.equal(readFileSync(path, "utf8"), '{"a":1,"b":2}\n{"a":3,"b":4}\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("each capability script accepts and emits its JSON carrier", () => {
  const script = fileURLToPath(
    new URL("../scripts/parse-jsonl.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify('{"x":1}\n'),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [{ x: 1 }]);
});
