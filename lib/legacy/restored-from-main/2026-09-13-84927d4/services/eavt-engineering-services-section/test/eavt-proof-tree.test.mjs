// eavt-proof-tree.test.mjs — conformance tests for the proof-tree citation laws added to
// src/eavt.mjs (citationsOf, resolveProofTree, verifyProofClosure, recordRowFromJsonl,
// readJsonlRows) and the three thin scripts over them. Hermetic temp-dir fixtures; no net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  rowId,
  constituteEntity,
  citationsOf,
  resolveProofTree,
  verifyProofClosure,
  recordRowFromJsonl,
  readJsonlRows,
} from "../src/eavt.mjs";
import appendEavtRowScript from "../scripts/append-eavt-row.mjs";
import resolveEavtProofTreeScript from "../scripts/resolve-eavt-proof-tree.mjs";
import verifyEavtProofClosureScript from "../scripts/verify-eavt-proof-closure.mjs";
import verifySetOfEavtProofClosuresScript, {
  parseVerifySetOfEavtProofClosuresArgs,
} from "../scripts/verify-set-of-eavt-proof-closures.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "eavt-proof-tree-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const metroplatArtifactAddress = (bytes) =>
  `metroplat:artifact:1:rfc8785-jcs:sha-256:${createHash("sha256").update(bytes).digest("hex")}`;

// === citationsOf =================================================================================

test("citationsOf finds a full ni: URI anywhere in v, at any depth", () => {
  const cited = rowId({ e: "x", a: "color", v: "blue", t: 1 });
  const row = { e: "y", a: "referencing", v: { nested: [{ deep: cited }] }, t: 2 };
  assert.deepEqual(citationsOf(row), new Set([cited]));
});

test("citationsOf finds a <kind>:<digest> entity address", () => {
  const { address } = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  const row = { e: "y", a: "referencing", v: { ref: address }, t: 2 };
  assert.deepEqual(citationsOf(row), new Set([address]));
});

test("citationsOf finds a metroplat artifact address and does not misread it as a kind:digest pair", () => {
  const address = metroplatArtifactAddress(Buffer.from("metroplat-witness-core"));
  const row = { e: "y", a: "referencing", v: { ref: address }, t: 2 };
  assert.deepEqual(citationsOf(row), new Set([address]));
});

test("citationsOf finds every distinct citation form together, deduped", () => {
  const cited = rowId({ e: "x", a: "color", v: "blue", t: 1 });
  const { address } = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  const metro = metroplatArtifactAddress(Buffer.from("another-witness"));
  const row = { e: "y", a: "referencing", v: { a: cited, b: [address, address], c: { d: metro } }, t: 2 };
  assert.deepEqual(citationsOf(row), new Set([cited, address, metro]));
});

test("citationsOf invents no other syntax: a plain string is not a citation", () => {
  const row = { e: "y", a: "named", v: "just a plain string, not an address", t: 2 };
  assert.deepEqual(citationsOf(row), new Set());
});

// === resolveProofTree ============================================================================

test("resolveProofTree: two constituted entities plus a citing row resolve with no missing, depth 1", () => {
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  const b = constituteEntity({ kind: "task", attributes: { title: "fill" }, t: 1 });
  const citing = { e: "task:citer", a: "cites", v: { first: a.address, second: rowId(b.genesisRow) }, t: 2 };
  const rows = [a.genesisRow, b.genesisRow, citing];

  const tree = resolveProofTree({ rows, root: "task:citer" });
  assert.equal(Object.keys(tree.nodes).length, 3, "citer + both cited nodes");
  assert.deepEqual(tree.missing, []);
  assert.deepEqual(tree.cycles, []);
  assert.equal(tree.depth, 1);
  assert.ok(tree.nodes["task:citer"]);
  assert.ok(tree.nodes[a.address]);
  assert.ok(tree.nodes[rowId(b.genesisRow)]);
});

test("resolveProofTree: a citation to a fabricated digest is reported missing, never thrown", () => {
  const fabricated = rowId({ e: "nowhere", a: "constituted", v: { never: "appended" }, t: 999 });
  const citing = { e: "task:citer", a: "cites", v: { ref: fabricated }, t: 2 };
  const tree = resolveProofTree({ rows: [citing], root: "task:citer" });
  assert.deepEqual(tree.missing, [fabricated]);
  assert.deepEqual(tree.cycles, []);
});

test("resolveProofTree: a two-row citation cycle terminates and is reported in cycles", () => {
  // Content-addressed identities (rowId, constituteEntity addresses) cannot cycle by
  // construction — a digest cannot depend on a not-yet-computed digest. A genuine cycle needs
  // two freely-chosen (non-content-derived) identities, exactly what --rows-from-jsonl records
  // carry: two entity-address-shaped ids, each row citing the other.
  const idA = `record:${"A".repeat(43)}`;
  const idB = `record:${"B".repeat(43)}`;
  const rowA = { e: idA, a: "recorded", v: { ref: idB }, t: 0 };
  const rowB = { e: idB, a: "recorded", v: { ref: idA }, t: 1 };
  const tree = resolveProofTree({ rows: [rowA, rowB], root: idA });
  assert.equal(Object.keys(tree.nodes).length, 2, "both rows resolve before the cycle closes");
  assert.deepEqual(tree.cycles, [idA], "the back-edge to the root is reported");
  assert.deepEqual(tree.missing, []);
});

test("resolveProofTree: a diamond (two rows citing the same third row) lists the shared node once", () => {
  const shared = constituteEntity({ kind: "task", attributes: { title: "shared" }, t: 1 });
  const left = constituteEntity({ kind: "task", attributes: { ref: shared.address, side: "left" }, t: 2 });
  const right = constituteEntity({ kind: "task", attributes: { ref: shared.address, side: "right" }, t: 2 });
  const root = { e: "task:root", a: "cites", v: { left: left.address, right: right.address }, t: 3 };
  const rows = [shared.genesisRow, left.genesisRow, right.genesisRow, root];

  const tree = resolveProofTree({ rows, root: "task:root" });
  assert.equal(Object.keys(tree.nodes).length, 4, "root, left, right, and the shared node — once");
  const sharedOccurrences = Object.keys(tree.nodes).filter((k) => k === shared.address);
  assert.equal(sharedOccurrences.length, 1);
  assert.deepEqual(tree.missing, []);
});

test("resolveProofTree: an ni: citation and a metroplat citation naming the same 32 bytes resolve to the same node", () => {
  const target = { e: "task:target", a: "named", v: "pebble", t: 1 };
  const targetNiUri = rowId(target);
  const metroAddress = `metroplat:artifact:1:rfc8785-jcs:sha-256:${Buffer.from(targetNiUri.slice("ni:///sha-256;".length), "base64url").toString("hex")}`;
  const citing = { e: "task:citer", a: "cites", v: { ref: metroAddress }, t: 2 };
  const tree = resolveProofTree({ rows: [target, citing], root: "task:citer" });
  assert.deepEqual(tree.missing, [], "the metroplat-form citation resolves against the ni-uri-indexed row");
  assert.equal(Object.keys(tree.nodes).length, 2);
});

test("resolveProofTree throws on non-array rows or an empty root", () => {
  assert.throws(() => resolveProofTree({ rows: "nope", root: "x" }), TypeError);
  assert.throws(() => resolveProofTree({ rows: [], root: "" }), TypeError);
});

// === verifyProofClosure ==========================================================================

test("verifyProofClosure: a closed root and an open root are both reported as data, never thrown", () => {
  const a = constituteEntity({ kind: "task", attributes: { title: "closed" }, t: 1 });
  const closedCiter = { e: "task:closed-citer", a: "cites", v: { ref: a.address }, t: 2 };
  const fabricated = rowId({ e: "nowhere", a: "constituted", v: {}, t: 999 });
  const openCiter = { e: "task:open-citer", a: "cites", v: { ref: fabricated }, t: 2 };
  const rows = [a.genesisRow, closedCiter, openCiter];

  const result = verifyProofClosure({ rows, roots: ["task:closed-citer", "task:open-citer"] });
  assert.equal(result.kind, "eavt.proof-closure");
  assert.equal(result.summary.roots, 2);
  assert.equal(result.summary.closed, 1);
  assert.equal(result.summary.open, 1);
  assert.equal(result.results.find((r) => r.root === "task:closed-citer").closed, true);
  assert.equal(result.results.find((r) => r.root === "task:open-citer").closed, false);
});

// === recordRowFromJsonl / readJsonlRows ==========================================================

test("recordRowFromJsonl returns an already-conformant {e,a,v,t} object unchanged", () => {
  const row = { e: "x", a: "named", v: "pebble", t: 1 };
  assert.equal(recordRowFromJsonl(row, 0), row);
});

test("recordRowFromJsonl wraps a non-conformant record, preferring its own \"id\" field", () => {
  const record = { id: "receipt:abc", other: "field" };
  const wrapped = recordRowFromJsonl(record, 5);
  assert.deepEqual(wrapped, { e: "receipt:abc", a: "recorded", v: record, t: 5 });
});

test("recordRowFromJsonl falls back to the line ordinal when no id-like field is present", () => {
  const record = { unrelated: true };
  const wrapped = recordRowFromJsonl(record, 3);
  assert.equal(wrapped.e, "3");
  assert.equal(wrapped.t, 3);
});

test("readJsonlRows skips a malformed line and shapes the rest", () => withDir((dir) => {
  const path = join(dir, "records.jsonl");
  writeFileSync(path, ['{"id":"a","x":1}', "not json", '{"id":"b","x":2}', ""].join("\n"));
  const rows = readJsonlRows(path);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].e, "a");
  assert.equal(rows[1].e, "b");
}));

// === scripts ======================================================================================

test("resolve-eavt-proof-tree.mjs: happy path reads a log off disk and resolves from one root", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  appendEavtRowScript(log, a.genesisRow);
  const citing = { e: "task:citer", a: "cites", v: { ref: a.address }, t: 2 };
  appendEavtRowScript(log, citing);

  const tree = resolveEavtProofTreeScript(log, "task:citer");
  assert.equal(Object.keys(tree.nodes).length, 2);
  assert.deepEqual(tree.missing, []);
}));

test("verify-eavt-proof-closure.mjs: happy path reports closed/open per root off a real trace", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  appendEavtRowScript(log, a.genesisRow);
  appendEavtRowScript(log, { e: "task:closed-citer", a: "cites", v: { ref: a.address }, t: 2 });
  const fabricated = rowId({ e: "nowhere", a: "constituted", v: {}, t: 999 });
  appendEavtRowScript(log, { e: "task:open-citer", a: "cites", v: { ref: fabricated }, t: 2 });

  const result = verifyEavtProofClosureScript(log, ["task:closed-citer", "task:open-citer"]);
  assert.equal(result.summary.closed, 1);
  assert.equal(result.summary.open, 1);
}));

test("verify-eavt-proof-closure.mjs: the CLI process exits 1 when a root is open, 0 when every root is closed", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  appendEavtRowScript(log, a.genesisRow);
  appendEavtRowScript(log, { e: "task:closed-citer", a: "cites", v: { ref: a.address }, t: 2 });
  const fabricated = rowId({ e: "nowhere", a: "constituted", v: {}, t: 999 });
  appendEavtRowScript(log, { e: "task:open-citer", a: "cites", v: { ref: fabricated }, t: 2 });

  const scriptPath = join(import.meta.dirname, "..", "scripts", "verify-eavt-proof-closure.mjs");
  execFileSync(process.execPath, [scriptPath, log, "task:closed-citer"], { stdio: "pipe" }); // does not throw: exit 0

  assert.throws(() => execFileSync(process.execPath, [scriptPath, log, "task:open-citer"], { stdio: "pipe" }));
}));

test("verify-set-of-eavt-proof-closures.mjs: happy path over multiple --trace files with explicit --root", () => withDir((dir) => {
  const log1 = join(dir, "log1.jsonl");
  const log2 = join(dir, "log2.jsonl");
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  appendEavtRowScript(log1, a.genesisRow);
  appendEavtRowScript(log2, { e: "task:citer", a: "cites", v: { ref: a.address }, t: 2 });

  const result = verifySetOfEavtProofClosuresScript({ traces: [log1, log2], roots: ["task:citer"] });
  assert.equal(result.summary.closed, 1);
}));

test("verify-set-of-eavt-proof-closures.mjs: default roots are every row whose v carries a citation", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const a = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  appendEavtRowScript(log, a.genesisRow); // v is a plain attributes object — no citation
  appendEavtRowScript(log, { e: "task:citer", a: "cites", v: { ref: a.address }, t: 2 });

  const result = verifySetOfEavtProofClosuresScript({ traces: [log] });
  assert.equal(result.summary.roots, 1, "only task:citer's row carries a citation");
  assert.equal(result.results[0].root, "task:citer");
}));

test("verify-set-of-eavt-proof-closures.mjs: --rows-from-jsonl closes a citation against a non-eavt house record", () => withDir((dir) => {
  const recordsPath = join(dir, "records.jsonl");
  const receiptDigest = createHash("sha256").update("evidence-object").digest("base64url");
  const receiptNiUri = `ni:///sha-256;${receiptDigest}`;
  writeFileSync(
    recordsPath,
    [
      JSON.stringify({ id: receiptNiUri, kind: "receipt", body: "evidence-object" }),
      JSON.stringify({ id: "discharge:today", evidence: receiptNiUri }),
    ].join("\n"),
  );

  const result = verifySetOfEavtProofClosuresScript({ rowsFromJsonl: [recordsPath], roots: ["discharge:today"] });
  assert.equal(result.summary.roots, 1);
  // the receipt's own declared "id" equals the ni: URI the discharge record cites; recordRowFromJsonl
  // uses that field as the wrapped row's e, so the citation resolves directly against it — missing is
  // empty (evidence found). The receipt's v echoes its own id, so it also self-cites (a degenerate
  // cycle); that keeps `closed` false even though the evidence citation itself is fully resolved.
  assert.deepEqual(result.results[0].missing, [], "the evidence citation resolves — no missing digest");
  assert.ok(result.results[0].cycles.length > 0, "the receipt's own id, echoed inside its v, self-cites");
}));

test("verify-set-of-eavt-proof-closures.mjs: unknown CLI argument is rejected", () => {
  assert.throws(() => parseVerifySetOfEavtProofClosuresArgs(["--bogus", "x"]), /unknown argument/);
});

test("verify-set-of-eavt-proof-closures.mjs: parses repeatable --trace/--root and --rows-from-jsonl", () => {
  const args = parseVerifySetOfEavtProofClosuresArgs([
    "--trace", "a.jsonl",
    "--trace", "b.jsonl",
    "--rows-from-jsonl", "c.jsonl",
    "--root", "x",
    "--root", "y",
  ]);
  assert.deepEqual(args, { traces: ["a.jsonl", "b.jsonl"], rowsFromJsonl: ["c.jsonl"], roots: ["x", "y"] });
});
