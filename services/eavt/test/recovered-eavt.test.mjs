import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { appendEavtRow } from "../scripts/append-eavt-row.mjs";
import { constituteContentAddressedEntity } from "../scripts/constitute-content-addressed-entity.mjs";
import { foldEavtEvidence } from "../scripts/fold-eavt-evidence.mjs";
import { identifyContentAddressedRow } from "../scripts/identify-content-addressed-row.mjs";
import { readEavtTrace } from "../scripts/read-eavt-trace.mjs";
import { resolveEavtProofTree } from "../scripts/resolve-eavt-proof-tree.mjs";
import { saturateEavtTrace } from "../scripts/saturate-eavt-trace.mjs";
import { settleEavtEvidence } from "../scripts/settle-eavt-evidence.mjs";
import { stratifyEavtEvidence } from "../scripts/stratify-eavt-evidence.mjs";
import { verifyContentAddressedEntity } from "../scripts/verify-content-addressed-entity.mjs";
import { verifyEavtProofClosure } from "../scripts/verify-eavt-proof-closure.mjs";

test("content addresses use stable NI row identities and verify the constituting row", () => {
  const row = { e: "work", a: "named", v: "proof", t: 1 };
  const first = identifyContentAddressedRow({ row }),
    second = identifyContentAddressedRow({
      row: { t: 1, v: "proof", a: "named", e: "work" },
    });
  assert.equal(first.identity, second.identity);
  assert.match(first.identity, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/);
  const entity = constituteContentAddressedEntity({
    kind: "claim",
    attributes: { title: "proof" },
    t: 1,
  });
  assert.equal(
    verifyContentAddressedEntity({ genesisRow: entity.genesisRow }).valid,
    true,
  );
});

test("fold, settle, saturation, and stratification preserve distinct evidence readings", () => {
  const old = { e: "door", a: "open", v: "yes", t: 1 },
    tombstone = { e: "door", a: "open", v: null, t: 2 },
    newFact = { e: "door", a: "open", v: "yes", t: 2 };
  assert.deepEqual(
    foldEavtEvidence({ subject: "door", rows: [old, tombstone, newFact] })
      .fiber,
    [
      {
        predicate: "open",
        object: "yes",
        value: {
          pos: 1,
          neg: 0,
          evidence: [
            [identifyContentAddressedRow({ row: newFact }).identity],
            [],
          ],
        },
      },
    ],
  );
  assert.equal(
    settleEavtEvidence({ subject: "door", rows: [newFact, newFact] }).fiber[0]
      .value.evidence[0].length,
    1,
  );
  assert.deepEqual(
    saturateEavtTrace({ rows: [old, tombstone, newFact] }).rows,
    [newFact],
  );
  const tower = stratifyEavtEvidence({
    subject: "door",
    rows: [old, tombstone, newFact],
  });
  assert.deepEqual(tower.closure, {
    saturation: 1,
    transfer: 1,
    kappa: 1,
    regime: "strict",
  });
  assert.deepEqual(tower.saturated, [newFact]);
});

test("proof traversal reports missing citations and closure rather than throwing", () => {
  const leaf = { e: "leaf", a: "observed", v: "ground", t: 1 };
  const leafIdentity = identifyContentAddressedRow({ row: leaf }).identity;
  const root = { e: "root", a: "proved-by", v: leafIdentity, t: 2 };
  const proof = resolveEavtProofTree({ rows: [root, leaf], root: "root" });
  assert.equal(proof.depth, 1);
  assert.deepEqual(proof.missing, []);
  assert.equal(
    verifyEavtProofClosure({ rows: [root, leaf], roots: ["root"] }).results[0]
      .closed,
    true,
  );
  assert.deepEqual(
    resolveEavtProofTree({ rows: [root], root: "root" }).missing,
    [leafIdentity],
  );
});

test("append writes strict JSONL while recovery reads intact historical or current lines", () => {
  const path = join(
      mkdtempSync(join(tmpdir(), "eavt-recovery-")),
      "trace.jsonl",
    ),
    row = { e: "x", a: "seen", v: true, t: 1 };
  appendEavtRow({ path, row });
  writeFileSync(path, `${readFileSync(path, "utf8")}torn\n`);
  assert.deepEqual(readEavtTrace({ path }).rows, [row]);
});
