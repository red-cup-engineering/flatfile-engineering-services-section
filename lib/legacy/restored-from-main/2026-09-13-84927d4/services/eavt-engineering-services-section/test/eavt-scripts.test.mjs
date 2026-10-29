// eavt-scripts.test.mjs — happy-path conformance for every thin scripts/*.mjs effect script (one
// script per effect/transform over src/eavt.mjs's laws), plus the composed apps/eavt-cli.mjs face.
// Hermetic temp-dir fixtures; no net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import assertEavtRowScript from "../scripts/assert-eavt-row.mjs";
import identifyEavtRowScript from "../scripts/identify-eavt-row.mjs";
import dedupeEavtRowsScript from "../scripts/dedupe-eavt-rows.mjs";
import settleEavtTraceScript from "../scripts/settle-eavt-trace.mjs";
import sectionEavtTraceScript from "../scripts/section-eavt-trace.mjs";
import stratifyEavtTraceScript from "../scripts/stratify-eavt-trace.mjs";
import readEavtEntityRowsScript from "../scripts/read-eavt-entity-rows.mjs";
import supersedeEavtRowsScript from "../scripts/supersede-eavt-rows.mjs";
import relateEavtRowsScript from "../scripts/relate-eavt-rows.mjs";
import relateEavtRowsFromScript from "../scripts/relate-eavt-rows-from.mjs";
import appendEavtRowScript from "../scripts/append-eavt-row.mjs";
import constituteEntityScript from "../scripts/constitute-entity.mjs";
import verifyEntityAddressScript from "../scripts/verify-entity-address.mjs";
import eavtCli from "../apps/eavt-cli.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "eavt-scripts-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("assert-eavt-row.mjs: happy path returns a conformant row unchanged", () => {
  const row = { e: "x", a: "color", v: "blue", t: 1 };
  assert.equal(assertEavtRowScript(row), row);
});

test("identify-eavt-row.mjs: happy path returns the row's ni: content id", () => {
  const id = identifyEavtRowScript({ e: "x", a: "color", v: "blue", t: 1 });
  assert.match(id, /^ni:\/\/\/sha-256;/);
});

test("dedupe-eavt-rows.mjs: happy path drops a later duplicate, keeps first occurrence", () => {
  const a = { e: "x", a: "color", v: "blue", t: 1 };
  const b = { e: "y", a: "size", v: 3, t: 2 };
  assert.deepEqual(dedupeEavtRowsScript([a, b, a]), [a, b]);
});

test("settle-eavt-trace.mjs: happy path reads a log off disk and settles one subject", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 }); // duplicate
  const settled = settleEavtTraceScript(log, "thing:pebble");
  assert.equal(settled.entity, "thing:pebble");
  assert.equal(settled.fiber.length, 1, "the duplicated row contributes no extra cell");
}));

test("section-eavt-trace.mjs: happy path reads a log off disk and projects the settled section", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  const projected = sectionEavtTraceScript(log, "thing:pebble");
  assert.deepEqual(projected, { affirmed: [{ predicate: "named", object: "pebble" }], denied: [], contradicted: [] });
}));

test("stratify-eavt-trace.mjs: happy path reads a log off disk and stratifies one subject into Level 0/1/2", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  appendEavtRowScript(log, { e: "thing:pebble", a: "located-in", v: "place:hall", t: 2 });
  appendEavtRowScript(log, { e: "thing:pebble", a: "located-in", v: null, t: 3 }); // tombstone
  const strata = stratifyEavtTraceScript(log, "thing:pebble");
  assert.equal(strata.entity, "thing:pebble");
  assert.equal(strata.asserted.length, 3, "Level 0: every asserted row, tombstone included");
  assert.equal(strata.saturated.length, 1, "Level 1: retraction-closed — only 'named' survives");
  assert.equal(strata.settled.fiber.length, 1, "Level 2: the retracted located-in cell never settles");
  assert.equal(strata.settled.fiber[0].predicate, "named");
  assert.equal(strata.settled.fiber[0].object, "pebble");
}));

test("read-eavt-entity-rows.mjs: happy path reads a log off disk and returns only one entity's rows", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  appendEavtRowScript(log, { e: "thing:other", a: "named", v: "other", t: 1 });
  const rows = readEavtEntityRowsScript(log, "thing:pebble");
  assert.deepEqual(rows, [{ e: "thing:pebble", a: "named", v: "pebble", t: 1 }]);
}));

test("supersede-eavt-rows.mjs: happy path keeps only the latest-t row for a functional predicate", () => {
  const rows = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  const lensed = supersedeEavtRowsScript(rows, ["located-in"]);
  assert.equal(lensed.length, 1);
  assert.equal(lensed[0].v, "yard");
});

test("relate-eavt-rows.mjs: happy path reads the subjects standing in P to O", () => {
  const world = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "q", a: "located-in", v: "hall", t: 1 },
  ];
  assert.deepEqual(relateEavtRowsScript(world, "located-in", "hall"), ["p", "q"]);
});

test("relate-eavt-rows-from.mjs: happy path reads the objects subject stands in P to", () => {
  const world = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  assert.deepEqual(relateEavtRowsFromScript(world, "p", "located-in"), ["hall", "yard"]);
});

test("constitute-entity.mjs: happy path births an entity, e rewritten to its own address", () => {
  const { address, genesisRow } = constituteEntityScript("task", { title: "dig" }, 1);
  assert.match(address, /^task:/);
  assert.equal(genesisRow.e, address);
});

test("verify-entity-address.mjs: happy path verifies a genuine genesis row", () => {
  const { genesisRow } = constituteEntityScript("task", { title: "dig" }, 1);
  assert.deepEqual(verifyEntityAddressScript(genesisRow), { address: genesisRow.e, verified: true });
});

// === apps/eavt-cli.mjs: covers every script above, one command each ============================

test("eavt-cli assert: happy path", () => {
  assert.deepEqual(eavtCli(["assert", JSON.stringify({ e: "x", a: "color", v: "blue", t: 1 })]), { e: "x", a: "color", v: "blue", t: 1 });
});

test("eavt-cli row-id: happy path", () => {
  assert.match(eavtCli(["row-id", JSON.stringify({ e: "x", a: "color", v: "blue", t: 1 })]), /^ni:\/\/\/sha-256;/);
});

test("eavt-cli dedupe: happy path", () => {
  const row = { e: "x", a: "color", v: "blue", t: 1 };
  assert.deepEqual(eavtCli(["dedupe", JSON.stringify([row, row])]), [row]);
});

test("eavt-cli settle and section: happy path off a real appended trace", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  assert.equal(eavtCli(["settle", log, "thing:pebble"]).entity, "thing:pebble");
  assert.deepEqual(eavtCli(["section", log, "thing:pebble"]).affirmed, [{ predicate: "named", object: "pebble" }]);
}));

test("eavt-cli stratify: happy path off a real appended trace", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavtRowScript(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  const strata = eavtCli(["stratify", log, "thing:pebble"]);
  assert.equal(strata.entity, "thing:pebble");
  assert.equal(strata.asserted.length, 1);
  assert.equal(strata.saturated.length, 1);
  assert.equal(strata.settled.fiber.length, 1);
  assert.equal(strata.settled.fiber[0].predicate, "named");
  assert.equal(strata.settled.fiber[0].object, "pebble");
  assert.equal(strata.settled.fiber[0].value.pos, 1);
}));

test("eavt-cli supersede: happy path", () => {
  const rows = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  const lensed = eavtCli(["supersede", JSON.stringify(rows), JSON.stringify(["located-in"])]);
  assert.equal(lensed.length, 1);
  assert.equal(lensed[0].v, "yard");
});

test("eavt-cli relate and relate-from: happy path", () => {
  const world = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "q", a: "located-in", v: "hall", t: 1 },
  ];
  assert.deepEqual(eavtCli(["relate", JSON.stringify(world), "located-in", JSON.stringify("hall")]), ["p", "q"]);
  assert.deepEqual(eavtCli(["relate-from", JSON.stringify(world), "p", "located-in"]), ["hall"]);
});

test("eavt-cli constitute and verify-address: happy path", () => {
  const { address, genesisRow } = eavtCli(["constitute", "task", JSON.stringify({ title: "dig" }), "1"]);
  assert.match(address, /^task:/);
  assert.deepEqual(eavtCli(["verify-address", JSON.stringify(genesisRow)]), { address, verified: true });
});
