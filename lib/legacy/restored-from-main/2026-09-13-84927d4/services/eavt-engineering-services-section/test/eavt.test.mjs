// eavt.test.mjs — conformance tests for every src/eavt.mjs law: row assertion, canonical
// identity, dedupe, durable append (OP1/OP2/OP4), torn-final-line-tolerant disk read-back (OP3),
// entity listing, fold with retraction tombstones, settle, and the settled-section projection.
// Hermetic temp-dir fixtures; no net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  assertRow,
  rowId,
  canonicalKey,
  dedupe,
  encodeRow,
  decodeRow,
  appendEavt,
  readEavtFile,
  listEntities,
  supersede,
  relate,
  relateFrom,
  fold,
  settle,
  section,
  constituteEntity,
  entityAddress,
  saturate,
  transfer,
  stratify,
} from "../src/eavt.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "eavt-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// === assertRow ==================================================================================

test("assertRow accepts an exact {e,a,v,t} row and returns it unchanged", () => {
  const row = { e: "x", a: "color", v: "blue", t: 1 };
  assert.equal(assertRow(row), row);
});

test("assertRow throws on a non-object", () => {
  assert.throws(() => assertRow(null), TypeError);
  assert.throws(() => assertRow("nope"), TypeError);
  assert.throws(() => assertRow([1, 2, 3, 4]), TypeError);
});

test("assertRow throws when a required field is missing", () => {
  assert.throws(() => assertRow({ a: "color", v: "blue", t: 1 }), /missing "e"/);
});

test("assertRow throws when the row carries extra fields", () => {
  assert.throws(() => assertRow({ e: "x", a: "color", v: "blue", t: 1, extra: true }), /exactly \{e,a,v,t\}/);
});

// === rowId / canonicalKey / dedupe ==============================================================

test("rowId is a deterministic ni: URI over the row's canonical CBOR encoding", () => {
  const row = { v: "blue", t: 1, e: "x", a: "color" }; // keys deliberately out of order
  const id1 = rowId(row);
  const id2 = rowId({ e: "x", a: "color", v: "blue", t: 1 }); // same content, sorted keys
  assert.match(id1, /^ni:\/\/\/sha-256;/);
  assert.equal(id1, id2, "identical content gives identical id regardless of JS key order");
});

test("rowId differs for rows with different content", () => {
  assert.notEqual(
    rowId({ e: "x", a: "color", v: "blue", t: 1 }),
    rowId({ e: "x", a: "color", v: "red", t: 1 }),
  );
});

test("canonicalKey is stable regardless of object key insertion order", () => {
  const k1 = canonicalKey(["located-in", { place: "riverbed", zone: 3 }]);
  const k2 = canonicalKey(["located-in", { zone: 3, place: "riverbed" }]);
  assert.equal(k1, k2);
});

test("dedupe keeps first occurrence, drops later duplicates, preserves order", () => {
  const a = { e: "x", a: "color", v: "blue", t: 1 };
  const b = { e: "y", a: "size", v: 3, t: 2 };
  const out = dedupe([a, b, a]);
  assert.equal(out.length, 2);
  assert.deepEqual(out, [a, b]);
});

// === encodeRow / decodeRow round trip ===========================================================

test("encodeRow/decodeRow round-trips a row exactly", () => {
  const row = { e: "x", a: "color", v: "blue", t: 1 };
  const decoded = decodeRow(encodeRow(row));
  assert.deepEqual(decoded, row);
});

test("decodeRow throws on a line that is not clean base64-of-canonical-CBOR", () => {
  assert.throws(() => decodeRow("not valid base64 cbor at all!!"));
});

// === durable append (OP1/OP2/OP4) ==============================================================

test("OP4 — appended bytes are base64-of-canonical-CBOR, not JSON.stringify", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const row = { v: "blue", t: 1, e: "x", a: "color" }; // keys deliberately unsorted
  appendEavt(log, row);
  const onDisk = readFileSync(log, "utf8");
  assert.equal(onDisk, encodeRow(row) + "\n", "on-disk line is the canonical encoded form");
  assert.notEqual(onDisk, JSON.stringify(row) + "\n", "and is not a plain JSON.stringify line");
}));

test("OP2 — two appends both land (G-Set, no loss, no interleave)", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavt(log, { e: "x", a: "color", v: "blue", t: 1 });
  appendEavt(log, { e: "y", a: "size", v: 3, t: 2 });
  const lines = readFileSync(log, "utf8").split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 2, "both rows on disk");
  const rows = readEavtFile(log);
  assert.equal(rows.length, 2, "read sees both rows");
}));

test("OP2 — many sequential appends to one log all land in order", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const N = 50;
  for (let i = 0; i < N; i++) appendEavt(log, { e: "counter", a: "tick", v: i, t: i });
  const rows = readEavtFile(log);
  assert.equal(rows.length, N, "no append lost (G-Set monotone)");
  assert.deepEqual(rows.map((r) => r.v), Array.from({ length: N }, (_, i) => i), "order preserved");
}));

test("OP1 — append is durable: the row is readable immediately, no flush step", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavt(log, { e: "x", a: "color", v: "blue", t: 1 });
  assert.equal(readEavtFile(log).length, 1);
}));

test("appendEavt creates parent directories as needed", () => withDir((dir) => {
  const log = join(dir, "nested", "deeper", "log.jsonl");
  appendEavt(log, { e: "x", a: "color", v: "blue", t: 1 });
  assert.equal(readEavtFile(log).length, 1);
}));

// === disk read-back, torn-final-line tolerant (OP3) ============================================

test("OP3 — a torn final line from a crash mid-append is tolerated (skipped, not thrown)", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavt(log, { e: "x", a: "color", v: "blue", t: 1 });
  appendEavt(log, { e: "y", a: "size", v: 3, t: 2 });
  // simulate a crash mid-append: a partial, non-decoding final line, never newline-terminated.
  appendFileSync(log, "not-a-complete-base64-row-tail", "utf8");
  let rows;
  assert.doesNotThrow(() => { rows = readEavtFile(log); }, "read does NOT throw on a torn final line (OP3)");
  assert.equal(rows.length, 2, "the two intact rows survive; the torn tail is dropped");
  assert.deepEqual(rows.map((r) => r.e), ["x", "y"]);
}));

test("OP3 — torn line in the middle: non-decoding lines skipped, intact rows still read", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  writeFileSync(
    log,
    [encodeRow({ e: "x", a: "color", v: "blue", t: 1 }), "not decodable at all", encodeRow({ e: "y", a: "size", v: 3, t: 2 })].join("\n") + "\n",
    "utf8",
  );
  let rows;
  assert.doesNotThrow(() => { rows = readEavtFile(log); });
  assert.deepEqual(rows.map((r) => r.e), ["x", "y"], "both intact rows recovered, bad line skipped");
}));

test("empty / blank-only log reads to zero rows, no throw", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  writeFileSync(log, "\n\n", "utf8");
  let rows;
  assert.doesNotThrow(() => { rows = readEavtFile(log); });
  assert.equal(rows.length, 0);
}));

test("a missing log reads as the empty append-only history", () => withDir((dir) => {
  assert.deepEqual(readEavtFile(join(dir, "not-yet-created.eavt")), []);
}));

// === listEntities ===============================================================================

test("listEntities lists distinct subjects, first-occurrence order, deduped", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:leaf", a: "named", v: "leaf", t: 2 },
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 3 },
  ];
  assert.deepEqual(listEntities(rows), ["thing:pebble", "thing:leaf"]);
});

test("listEntities off a real appended, disk-read trace", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  appendEavt(log, { e: "thing:pebble", a: "named", v: "pebble", t: 1 });
  appendEavt(log, { e: "thing:leaf", a: "named", v: "leaf", t: 2 });
  appendEavt(log, { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 3 });
  assert.deepEqual(listEntities(readEavtFile(log)), ["thing:pebble", "thing:leaf"]);
}));

// === supersede (the per-predicate functional read-lens) ========================================

test("supersede keeps only latest-t for a functional predicate", () => {
  const locs = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 }, // latest functional
    { e: "p", a: "skill", v: "swim", t: 1 },      // non-functional accrues
    { e: "p", a: "skill", v: "climb", t: 3 },
  ];
  const lensed = supersede(locs, new Set(["located-in"]));
  assert.equal(lensed.filter((r) => r.a === "located-in").length, 1);
  assert.equal(lensed.find((r) => r.a === "located-in").v, "yard", "keeps the max-t functional row");
  assert.equal(lensed.filter((r) => r.a === "skill").length, 2, "non-functional rows all survive");
  assert.equal(locs.length, 4, "supersede is non-destructive: input trace untouched");
});

test("supersede accepts a predicate fn too", () => {
  const locs = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  const lensed = supersede(locs, (a) => a === "located-in");
  assert.equal(lensed.length, 1);
  assert.equal(lensed[0].v, "yard");
});

test("supersede with no functional set is identity", () => {
  const locs = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  assert.equal(supersede(locs).length, 2);
});

// === relate / relateFrom (the general relational graph read) ===================================

test("relate reads the subjects standing in P to O (who is located-in hall)", () => {
  const world = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "q", a: "located-in", v: "hall", t: 1 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  assert.deepEqual(relate(world, "located-in", "hall"), ["p", "q"]);
});

test("relateFrom reads the objects subject stands in P to (p's locations)", () => {
  const world = [
    { e: "p", a: "located-in", v: "hall", t: 0 },
    { e: "q", a: "located-in", v: "hall", t: 1 },
    { e: "p", a: "located-in", v: "yard", t: 2 },
  ];
  assert.deepEqual(relateFrom(world, "p", "located-in"), ["hall", "yard"]);
});

test("relateFrom dedupes repeated objects, in trace order", () => {
  const rows = [
    { e: "p", a: "skill", v: "swim", t: 0 },
    { e: "p", a: "skill", v: "climb", t: 1 },
    { e: "p", a: "skill", v: "swim", t: 2 }, // repeated
  ];
  assert.deepEqual(relateFrom(rows, "p", "skill"), ["swim", "climb"]);
});

// === fold, with retraction tombstones ===========================================================

test("fold groups rows for one subject into a fiber of {predicate,object,value} cells", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 },
    { e: "thing:other", a: "named", v: "irrelevant", t: 1 },
  ];
  const folded = fold("thing:pebble", rows);
  assert.equal(folded.entity, "thing:pebble");
  assert.equal(folded.fiber.length, 2, "only thing:pebble's own rows contribute");
  const named = folded.fiber.find((c) => c.predicate === "named");
  assert.equal(named.object, "pebble");
  assert.equal(named.value.pos, 1);
  assert.equal(named.value.neg, 0);
});

test("fold applies a retraction tombstone: a later {v:null} row drops the earlier assertion", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 }, // tombstone
  ];
  const folded = fold("thing:pebble", rows);
  assert.equal(folded.fiber.length, 0, "the tombstoned assertion does not survive the fold");
});

test("fold's tombstone only retracts rows strictly earlier than the tombstone's t", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: null, t: 1 }, // tombstone at t=1
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 }, // asserted AFTER the tombstone
  ];
  const folded = fold("thing:pebble", rows);
  assert.equal(folded.fiber.length, 1, "a later re-assertion survives its earlier tombstone");
  assert.equal(folded.fiber[0].object, "place:riverbed");
});

test("fold with {retract:false} ignores tombstones entirely (raw fold)", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 },
  ];
  const folded = fold("thing:pebble", rows, { retract: false });
  assert.equal(folded.fiber.length, 1, "without retraction, the pre-tombstone assertion still shows");
});

test("fold throws for a non-string / empty subject", () => {
  assert.throws(() => fold("", []), TypeError);
  assert.throws(() => fold(null, []), TypeError);
});

test("fold throws if rows is not an array", () => {
  assert.throws(() => fold("thing:pebble", "not-an-array"), TypeError);
});

// === differential: opts.converse absent is byte-identical to pre-0.4.0 (0.3.0) fold =============
// 0.3.0 had no opts.converse at all; this pins that its ABSENCE (the default) still produces the
// exact same fold output — same rows in, same result out — whether or not the added feature exists
// in the module. A trace containing an unrelated "has-converse" declaration row must not be
// affected either: the legacy lane is inert unless opts.converse is explicitly passed.
test("differential: fold with no opts.converse matches the pre-0.4.0 fold exactly, same rows same result", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 },
    { e: "thing:other", a: "named", v: "irrelevant", t: 1 },
  ];
  const expected = {
    entity: "thing:pebble",
    fiber: [
      {
        predicate: "named",
        object: "pebble",
        value: { pos: 1, neg: 0, evidence: [[rowId(rows[0])], []] },
      },
      {
        predicate: "located-in",
        object: "place:riverbed",
        value: { pos: 1, neg: 0, evidence: [[rowId(rows[1])], []] },
      },
    ],
  };
  assert.deepEqual(fold("thing:pebble", rows), expected, "no-opts fold is unchanged");
  assert.deepEqual(fold("thing:pebble", rows, {}), expected, "empty-opts fold is unchanged");
});

test("differential: an in-trace has-converse row does not affect a fold that never opts into opts.converse", () => {
  const withoutDeclaration = fold("thing:door", [{ e: "thing:door", a: "open", v: "yes", t: 1 }]);
  const withDeclaration = fold("thing:door", [
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "open", a: "has-converse", v: "shut", t: 0 },
  ]);
  // the has-converse row itself is a different subject (e:"open"), so it never contributes to
  // thing:door's fiber regardless — the fold's *shape* for thing:door is unaffected by its mere
  // presence in the trace when opts.converse was never passed.
  assert.deepEqual(withoutDeclaration, withDeclaration);
});

// === legacy converse lane (opts.converse) — ported intents ======================================
// Intents ported from @red-cup-engineering/computer's posix-holography/tests/substrate.mjs: a
// declared converse charges the negative face, and a cell told both settles to a held ⊤
// (contradiction), never an error.

test("opts.converse charges the negative face of the positive predicate it opposes", () => {
  const rows = [{ e: "thing:door", a: "shut", v: "yes", t: 1 }];
  const folded = fold("thing:door", rows, { converse: { shut: "open" } });
  assert.equal(folded.fiber.length, 1);
  const cell = folded.fiber[0];
  assert.equal(cell.predicate, "open", "the cell settles under the POSITIVE predicate name");
  assert.equal(cell.object, "yes");
  assert.equal(cell.value.pos, 0);
  assert.equal(cell.value.neg, 1);
  assert.deepEqual(cell.value.evidence, [[], [rowId(rows[0])]]);
});

test("the fleet idiom: a CONVERSE map charging negative faces yields a contested ⊤ cell where both faces are charged", () => {
  const rows = [
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "thing:door", a: "shut", v: "yes", t: 2 },
  ];
  const folded = fold("thing:door", rows, { converse: { shut: "open" } });
  assert.equal(folded.fiber.length, 1, "both rows fold to the SAME cell (open,yes)");
  const cell = folded.fiber[0];
  assert.equal(cell.predicate, "open");
  assert.equal(cell.value.pos, 1);
  assert.equal(cell.value.neg, 1, "told both its predicate and its declared converse: a held ⊤, not an error");
  assert.deepEqual(section(folded).contradicted, [{ predicate: "open", object: "yes" }]);
});

test("opts.converse merges with an in-trace {a:\"has-converse\"} declaration row", () => {
  const rows = [
    { e: "open", a: "has-converse", v: "shut", t: 0 }, // declares: open's converse is shut
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "thing:door", a: "shut", v: "yes", t: 2 },
  ];
  // opts.converse starts empty; the in-trace declaration alone supplies the pair.
  const folded = fold("thing:door", rows, { converse: {} });
  assert.equal(folded.fiber.length, 1);
  const cell = folded.fiber[0];
  assert.equal(cell.value.pos, 1);
  assert.equal(cell.value.neg, 1, "the in-trace has-converse declaration alone charges the negative face");
});

test("a has-converse declaration row never itself contributes a fiber cell", () => {
  const folded = fold("open", [{ e: "open", a: "has-converse", v: "shut", t: 0 }], { converse: {} });
  assert.equal(folded.fiber.length, 0, "declarations are world-mechanic metadata, not subject state");
});

test("opts.converse is inert without being passed: the SAME rows fold plainly (no negative charge) by default", () => {
  const rows = [
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "thing:door", a: "shut", v: "yes", t: 2 },
  ];
  const folded = fold("thing:door", rows); // no opts.converse
  assert.equal(folded.fiber.length, 2, "shut is its own predicate/object cell, not merged into open's");
  assert.ok(folded.fiber.every((c) => c.value.neg === 0), "no negative charges without opting in");
});

// === settle / section carry the legacy converse lane through unchanged =========================

test("settle passes opts.converse through to fold", () => {
  const row = { e: "thing:door", a: "shut", v: "yes", t: 1 };
  const settled = settle("thing:door", [row, row], { converse: { shut: "open" } });
  assert.equal(settled.fiber[0].predicate, "open");
  assert.equal(settled.fiber[0].value.neg, 1);
});

test("section buckets a converse-charged neg-only cell as denied, and a contested cell as contradicted", () => {
  const denied = section(fold("thing:door", [{ e: "thing:door", a: "shut", v: "yes", t: 1 }], { converse: { shut: "open" } }));
  assert.deepEqual(denied.denied, [{ predicate: "open", object: "yes" }]);
  assert.deepEqual(denied.affirmed, []);
  assert.deepEqual(denied.contradicted, []);
});

// === settle (dedupe + fold) =====================================================================

test("settle dedupes duplicate appended rows before folding", () => {
  const row = { e: "thing:pebble", a: "named", v: "pebble", t: 1 };
  const withDuplicate = settle("thing:pebble", [row, row]);
  const withoutDuplicate = settle("thing:pebble", [row]);
  assert.deepEqual(withDuplicate, withoutDuplicate, "a duplicated row contributes no extra evidence");
});

test("settle off a real disk read-back matches an in-memory fold of the same rows", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const row1 = { e: "thing:pebble", a: "named", v: "pebble", t: 1 };
  const row2 = { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 };
  appendEavt(log, row1);
  appendEavt(log, row2);
  const fromDisk = settle("thing:pebble", readEavtFile(log));
  const inMemory = settle("thing:pebble", [row1, row2]);
  assert.deepEqual(fromDisk, inMemory, "settling the disk read-back matches settling the in-memory rows");
}));

// === section projection =========================================================================

test("section projects an affirmed cell into the affirmed bucket", () => {
  const folded = fold("thing:pebble", [{ e: "thing:pebble", a: "named", v: "pebble", t: 1 }]);
  const projected = section(folded);
  assert.deepEqual(projected.affirmed, [{ predicate: "named", object: "pebble" }]);
  assert.deepEqual(projected.denied, []);
  assert.deepEqual(projected.contradicted, []);
});

test("section on an empty fold gives all-empty buckets", () => {
  const projected = section(fold("thing:nothing", []));
  assert.deepEqual(projected, { affirmed: [], denied: [], contradicted: [] });
});

// === entity constitution (the EAVT address rule) ================================================

test("constituteEntity derives a <kind>:<digest> address and rewrites genesisRow.e to it", () => {
  const { address, genesisRow } = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  assert.match(address, /^task:[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/, "task: + a bare RFC 6920 base64url digest, no ni:/// prefix");
  assert.equal(genesisRow.e, address, "the returned genesis row carries its own derived address as e");
  assert.equal(genesisRow.a, "constituted");
  assert.deepEqual(genesisRow.v, { title: "dig" });
  assert.equal(genesisRow.t, 1);
  assertRow(genesisRow); // still a conformant {e,a,v,t} row
});

test("constituteEntity is deterministic: same inputs -> same address, byte-identical genesis row", () => {
  const a = constituteEntity({ kind: "project", attributes: { name: "lagoon" }, t: 7 });
  const b = constituteEntity({ kind: "project", attributes: { name: "lagoon" }, t: 7 });
  assert.equal(a.address, b.address, "same inputs give the same address");
  assert.deepEqual(a.genesisRow, b.genesisRow, "same inputs give a byte-identical genesis row");
  assert.equal(encodeRow(a.genesisRow), encodeRow(b.genesisRow), "identical on-disk encoding too");
});

test("constituteEntity gives different addresses for different kind, attributes, or t", () => {
  const base = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  const diffKind = constituteEntity({ kind: "project", attributes: { title: "dig" }, t: 1 });
  const diffAttrs = constituteEntity({ kind: "task", attributes: { title: "swim" }, t: 1 });
  const diffT = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 2 });
  assert.notEqual(base.address, diffKind.address);
  assert.notEqual(base.address, diffAttrs.address);
  assert.notEqual(base.address, diffT.address);
});

test("constituteEntity rejects a malformed kind or attributes", () => {
  assert.throws(() => constituteEntity({ kind: "", attributes: {}, t: 1 }), TypeError);
  assert.throws(() => constituteEntity({ kind: "task:machine", attributes: {}, t: 1 }), TypeError);
  assert.throws(() => constituteEntity({ kind: "task", attributes: null, t: 1 }), TypeError);
  assert.throws(() => constituteEntity({ kind: "task", attributes: ["not", "an", "object"], t: 1 }), TypeError);
});

test("entityAddress verification round-trip: recomputing a genuine genesis row's address matches its own e", () => {
  const { address, genesisRow } = constituteEntity({ kind: "machine", attributes: { hostname: "cold-red-gate" }, t: 3 });
  assert.equal(entityAddress(genesisRow), address);
});

test("entityAddress catches a tampered genesis row: recomputation no longer matches e", () => {
  const { genesisRow } = constituteEntity({ kind: "task", attributes: { title: "dig" }, t: 1 });
  const tampered = { ...genesisRow, v: { title: "TAMPERED" } };
  assert.notEqual(entityAddress(tampered), tampered.e, "tampered content no longer reproduces the stored address");
});

test("entityAddress throws on a row whose e is not a <kind>:<digest> address", () => {
  assert.throws(() => entityAddress({ e: "no-colon-here", a: "constituted", v: {}, t: 1 }), TypeError);
});

test("appendEavt + readEavtFile + fold end-to-end over a constituted entity's trace", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const { address, genesisRow } = constituteEntity({ kind: "thing", attributes: { named: "pebble" }, t: 1 });
  appendEavt(log, genesisRow);
  appendEavt(log, { e: address, a: "located-in", v: "place:riverbed", t: 2 });

  const rows = readEavtFile(log);
  assert.equal(rows.length, 2);
  assert.equal(entityAddress(rows[0]), address, "the on-disk genesis row still verifies after a real append+read round-trip");

  const folded = fold(address, rows);
  assert.equal(folded.entity, address);
  const projected = section(folded);
  assert.deepEqual(projected.affirmed.sort((x, y) => (x.predicate < y.predicate ? -1 : 1)), [
    { predicate: "constituted", object: { named: "pebble" } },
    { predicate: "located-in", object: "place:riverbed" },
  ]);
}));

test("a torn genesis row (crash mid-append) is dropped by readEavtFile, never miscomputed", () => withDir((dir) => {
  const log = join(dir, "log.jsonl");
  const { genesisRow } = constituteEntity({ kind: "thing", attributes: { named: "leaf" }, t: 1 });
  // simulate a crash mid-append of the genesis row itself: a partial, non-decoding, unterminated line.
  writeFileSync(log, encodeRow(genesisRow).slice(0, 10), "utf8");
  let rows;
  assert.doesNotThrow(() => { rows = readEavtFile(log); }, "a torn genesis line does not throw (OP3)");
  assert.equal(rows.length, 0, "the torn genesis row contributes nothing — never a half-constituted entity");
}));

// === stratification: saturate (Fix σ), transfer (Fix Δ), stratify (Level 0/1/2) ================
// The braided-tower law (561-group-services-section notes 2026-04-04 dont-flatten-the-tower,
// 2026-04-06 pws-core-systems-design): stratum is a DERIVED reading, never a stored field.

// --- saturate: the σ nucleus (Level 1, Fix σ) ---------------------------------------------------

test("saturate is identity (modulo dedupe) when no tombstones are present", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 },
  ];
  assert.deepEqual(saturate(rows), rows);
});

test("saturate drops a tombstone row itself and the earlier assertion it retracts", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 }, // tombstone
  ];
  assert.deepEqual(saturate(rows), []);
});

test("saturate's tombstone only retracts rows strictly earlier than the tombstone's t", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: null, t: 1 }, // tombstone at t=1
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 }, // asserted AFTER the tombstone
  ];
  assert.deepEqual(saturate(rows), [rows[1]]);
});

test("saturate scopes retraction per subject: one entity's tombstone never retracts another's same predicate", () => {
  const rows = [
    { e: "thing:a", a: "color", v: "blue", t: 1 },
    { e: "thing:b", a: "color", v: "red", t: 2 },
    { e: "thing:a", a: "color", v: null, t: 3 }, // retracts only thing:a's color
  ];
  assert.deepEqual(saturate(rows), [rows[1]], "thing:b's color survives; thing:a's is retracted");
});

test("saturate leaves has-converse declaration rows untouched (never v===null, never a subject's own tombstone)", () => {
  const rows = [
    { e: "open", a: "has-converse", v: "shut", t: 0 },
    { e: "thing:door", a: "open", v: "yes", t: 1 },
  ];
  assert.deepEqual(saturate(rows), rows);
});

test("saturate with {retract:false} disables the tombstone law entirely, deduped only", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 },
  ];
  assert.deepEqual(saturate(rows, { retract: false }), rows);
});

test("saturate dedupes duplicate rows before applying retraction (G-Set safety)", () => {
  const row = { e: "thing:pebble", a: "named", v: "pebble", t: 1 };
  assert.deepEqual(saturate([row, row]), [row]);
});

test("saturate is idempotent: saturate(saturate(rows)) === saturate(rows) — this IS Fix(σ)", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:hall", t: 2 },
    { e: "thing:pebble", a: "located-in", v: null, t: 3 },
    { e: "thing:pebble", a: "located-in", v: "place:yard", t: 4 },
    { e: "open", a: "has-converse", v: "shut", t: 0 },
  ];
  const once = saturate(rows);
  const twice = saturate(once);
  assert.deepEqual(twice, once, "re-saturating an already-saturated trace changes nothing");
});

test("saturate throws on a non-array or a malformed row", () => {
  assert.throws(() => saturate("not-an-array"), TypeError);
  assert.throws(() => saturate([{ e: "x", a: "y", v: "z" }]), TypeError); // missing t
});

// --- transfer: the Δ nucleus (Fix Δ) -------------------------------------------------------------

test("transfer with no opts.converse matches fold's own no-converse output exactly", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 2 },
    { e: "thing:other", a: "named", v: "irrelevant", t: 1 },
  ];
  assert.deepEqual(transfer("thing:pebble", rows), fold("thing:pebble", rows));
});

test("transfer's opts.converse charges the negative face, exactly like fold", () => {
  const rows = [{ e: "thing:door", a: "shut", v: "yes", t: 1 }];
  assert.deepEqual(
    transfer("thing:door", rows, { converse: { shut: "open" } }),
    fold("thing:door", rows, { converse: { shut: "open" } }),
  );
});

test("transfer: told both a predicate and its declared converse settles a held ⊤, exactly like fold", () => {
  const rows = [
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "thing:door", a: "shut", v: "yes", t: 2 },
  ];
  const transferred = transfer("thing:door", rows, { converse: { shut: "open" } });
  assert.equal(transferred.fiber.length, 1);
  assert.equal(transferred.fiber[0].value.pos, 1);
  assert.equal(transferred.fiber[0].value.neg, 1, "held contradiction, not an error");
  assert.deepEqual(transferred, fold("thing:door", rows, { converse: { shut: "open" } }));
});

test("transfer merges opts.converse with an in-trace has-converse declaration, exactly like fold", () => {
  const rows = [
    { e: "open", a: "has-converse", v: "shut", t: 0 },
    { e: "thing:door", a: "open", v: "yes", t: 1 },
    { e: "thing:door", a: "shut", v: "yes", t: 2 },
  ];
  assert.deepEqual(transfer("thing:door", rows, { converse: {} }), fold("thing:door", rows, { converse: {} }));
});

test("a has-converse declaration row never itself contributes a fiber cell under transfer", () => {
  const transferred = transfer("open", [{ e: "open", a: "has-converse", v: "shut", t: 0 }], { converse: {} });
  assert.equal(transferred.fiber.length, 0);
});

test("transfer never retracts: called directly on un-saturated rows, an earlier assertion still shows despite a later tombstone", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 }, // a tombstone transfer must ignore
  ];
  const transferred = transfer("thing:pebble", rows);
  assert.equal(transferred.fiber.length, 1, "transfer alone never applies retraction — that is saturate's job");
  assert.equal(transferred.fiber[0].object, "place:riverbed");
  // contrast: fold DOES retract by default, so this is where transfer and fold legitimately diverge
  // when fed the SAME un-saturated rows directly.
  assert.notDeepEqual(transferred, fold("thing:pebble", rows));
});

test("transfer throws for a non-string/empty subject or non-array rows", () => {
  assert.throws(() => transfer("", []), TypeError);
  assert.throws(() => transfer(null, []), TypeError);
  assert.throws(() => transfer("x", "not-an-array"), TypeError);
});

// --- stratify: the derived multi-level reading (Level 0 asserted / 1 saturated / 2 settled) -----

test("stratify returns the three levels: asserted (Level 0), saturated (Level 1), settled (Level 2)", () => {
  const rows = [
    { e: "thing:pebble", a: "named", v: "pebble", t: 1 },
    { e: "thing:pebble", a: "located-in", v: "place:hall", t: 2 },
    { e: "thing:pebble", a: "located-in", v: null, t: 3 }, // tombstone
    { e: "thing:pebble", a: "located-in", v: "place:yard", t: 4 },
  ];
  const strata = stratify("thing:pebble", rows);
  assert.equal(strata.entity, "thing:pebble");

  // Level 0: every row for the subject, unfiltered — the tombstone and the shadowed row both present.
  assert.equal(strata.asserted.length, 4);

  // Level 1: retraction-closed — the tombstone and the row it shadows are both gone.
  assert.equal(strata.saturated.length, 2);
  assert.deepEqual(strata.saturated.map((r) => r.a + ":" + r.v).sort(), ["located-in:place:yard", "named:pebble"]);

  // Level 2: fold's own settled-fiber shape, and equal to what fold/settle already compute.
  assert.deepEqual(strata.settled, fold("thing:pebble", rows));
  assert.deepEqual(strata.settled, settle("thing:pebble", rows));

  // closure: a finite trace's fold reaches Fix(σ) and Fix(Δ) each in exactly one pass.
  assert.deepEqual(strata.closure, { saturation: 1, transfer: 1, kappa: 1, regime: "strict" });
});

test("stratify's closure stays single-pass (kappa 1, regime strict) across a multi-hop supersession chain", () => {
  // a -> b -> c: three successive positive assertions of thing:puzzle's "state", each retracted
  // before the next asserts, so saturate must resolve a chain of tombstones rather than one.
  const rows = [
    { e: "thing:puzzle", a: "state", v: "a", t: 1 },
    { e: "thing:puzzle", a: "state", v: null, t: 2 }, // retracts a
    { e: "thing:puzzle", a: "state", v: "b", t: 3 },
    { e: "thing:puzzle", a: "state", v: null, t: 4 }, // retracts b
    { e: "thing:puzzle", a: "state", v: "c", t: 5 },
  ];
  const strata = stratify("thing:puzzle", rows);

  // The chain still resolves to exactly the final assertion, in the one saturate pass.
  assert.deepEqual(strata.saturated.map((r) => r.v), ["c"]);
  assert.deepEqual(strata.closure, { saturation: 1, transfer: 1, kappa: 1, regime: "strict" });
});

test("stratify's settled level matches fold exactly for the converse-held-contradiction case (LAGOON's own scenario)", () => {
  // Mirrors lagoon-services-section's world-look.test.mjs: a (running,has-converse,stopped)
  // declaration, one service told only "running", one told both "running" and "stopped".
  const baseT = 1000;
  const rows = [
    { e: "running", a: "has-converse", v: "stopped", t: baseT },
    { e: "svc:one", a: "running", v: "yes", t: baseT + 1 },
    { e: "svc:two", a: "running", v: "yes", t: baseT + 2 },
    { e: "svc:two", a: "stopped", v: "yes", t: baseT + 3 },
  ];
  const opts = { converse: {} };

  const svcOne = stratify("svc:one", rows, opts);
  assert.deepEqual(svcOne.settled, fold("svc:one", rows, opts));
  assert.equal(svcOne.settled.fiber.find((c) => c.predicate === "running").value.pos, 1);
  assert.equal(svcOne.settled.fiber.find((c) => c.predicate === "running").value.neg, 0);

  const svcTwo = stratify("svc:two", rows, opts);
  assert.deepEqual(svcTwo.settled, fold("svc:two", rows, opts));
  const cell = svcTwo.settled.fiber.find((c) => c.predicate === "running" && c.object === "yes");
  assert.equal(cell.value.pos, 1);
  assert.equal(cell.value.neg, 1, "genuine told-both: a held ⊤, exactly like fold");
});

test("stratify tracks a retraction resolving a held ⊤ and a fresh assertion re-raising it, matching fold at every step", () => {
  const baseT = 1000;
  const opts = { converse: {} };
  const rows = [
    { e: "running", a: "has-converse", v: "stopped", t: baseT },
    { e: "svc:two", a: "running", v: "yes", t: baseT + 1 },
    { e: "svc:two", a: "stopped", v: "yes", t: baseT + 2 },
  ];
  const cellOf = (rs) => stratify("svc:two", rs, opts).settled.fiber.find((c) => c.predicate === "running" && c.object === "yes");

  const initial = cellOf(rows);
  assert.equal(initial.value.pos, 1);
  assert.equal(initial.value.neg, 1, "told both — drift present");
  assert.deepEqual(stratify("svc:two", rows, opts).settled, fold("svc:two", rows, opts));

  const withTombstone = [...rows, { e: "svc:two", a: "stopped", v: null, t: 2000 }];
  const resolved = cellOf(withTombstone);
  assert.equal(resolved.value.pos, 1);
  assert.equal(resolved.value.neg, 0, "the retraction supersedes the stale claim — drift resolves");
  assert.deepEqual(stratify("svc:two", withTombstone, opts).settled, fold("svc:two", withTombstone, opts));

  const withReassertion = [...withTombstone, { e: "svc:two", a: "stopped", v: "yes", t: 3000 }];
  const reraised = cellOf(withReassertion);
  assert.equal(reraised.value.pos, 1);
  assert.equal(reraised.value.neg, 1, "a fresh assertion after the tombstone re-raises the drift");
  assert.deepEqual(stratify("svc:two", withReassertion, opts).settled, fold("svc:two", withReassertion, opts));
});

test("stratify with {retract:false}: saturated equals asserted, and settled matches fold's own {retract:false}", () => {
  const rows = [
    { e: "thing:pebble", a: "located-in", v: "place:riverbed", t: 1 },
    { e: "thing:pebble", a: "located-in", v: null, t: 2 },
  ];
  const strata = stratify("thing:pebble", rows, { retract: false });
  assert.deepEqual(strata.saturated, strata.asserted, "nothing filtered when retraction is disabled");
  assert.deepEqual(strata.settled, fold("thing:pebble", rows, { retract: false }));
});

test("stratify throws for a non-string/empty subject or non-array rows", () => {
  assert.throws(() => stratify("", []), TypeError);
  assert.throws(() => stratify(null, []), TypeError);
  assert.throws(() => stratify("x", "not-an-array"), TypeError);
});
