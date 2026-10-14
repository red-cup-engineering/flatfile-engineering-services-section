import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness, parseJournalWitness } from "../src/journal/event.mjs";
import { journalDirectoryOf, journalFeedPath, journalIndexDirectory, journalPacketDirectory } from "../src/journal/store-root.mjs";
import { clearSegmentIndexes } from "../src/journal/filesystem/segment-store.mjs";
import { fileJournalStoreByKind } from "../scripts/file-journal-store-by-kind.mjs";

const put = (file, bytes) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes); };
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), "plain-dated-custody-"));
  t.after(() => { clearSegmentIndexes(); rmSync(base, { recursive: true, force: true }); });
  const root = join(base, "settlement");
  const store = journalDirectoryOf(root);
  mkdirSync(store, { recursive: true });
  return { base, root, store };
}
function snapshot(base) {
  const found = {};
  const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name), key = relative(base, file);
    if (entry.isSymbolicLink()) found[key] = { link: readlinkSync(file) };
    else if (entry.isDirectory()) { found[key] = { directory: true }; walk(file); }
    else found[key] = { sha256: digest(readFileSync(file)) };
  } };
  walk(base); return found;
}
function datedFiles(f, date = "2026-10-01", kind = "feed") {
  const day = join(f.store, ...date.split("-"));
  const log = join(day, `${kind}.jsonl`);
  const target = journalFeedPath(f.root, kind, date);
  const packetText = canonicalJson({ payload: `synthetic-${date}` });
  const packet = `${packetText}\n`;
  const packetId = digest(packetText);
  const statement = journalWitness({ kind: "metroplat.journal.observation", seat: "urn:test:dated-custody",
    claim: tm.mark("observed"), address: tm.mark("retained"), time: `${date}T00:00:00.000Z`, causes: [], payload: { date } });
  const statementName = `${statement.id.slice("ni:///sha-256;".length)}.json`;
  const statementBytes = `${canonicalJson(statement)}\n`;
  const row = `${JSON.stringify({ e: "urn:test:packet", a: "source", v: { kind: "metroplat.witness-packet-reference", mediaType: "application/json", sha256: packetId, bytes: Buffer.byteLength(packetText, "utf8"), href: `blob:sha256:${packetId}`, path: `packets/sha256/${packetId}.json` }, t: date })}\n`;
  const pairs = [
    [log, target, row, "projection"],
    [join(`${log}.statements`, "sha-256", statementName), join(`${target}.statements`, "sha-256", statementName), statementBytes, "statement"],
    [join(`${log}.statements`, "received", "sha-256", statementName), join(`${target}.statements`, "received", "sha-256", statementName), statementBytes, "received"],
    [join(`${log}.index`, "statements", "sha-256", statementName), join(`${target}.index`, "statements", "sha-256", statementName), statementBytes, "feed-index"],
    [join(day, "index", "work-heads", "key.json"), join(journalIndexDirectory(f.store), "heads", date, "work-heads", "key.json"), `${JSON.stringify({ id: statement.id, date })}\n`, "head"],
    [join(day, "packets", "sha256", `${packetId}.json`), join(journalPacketDirectory(f.store), "sha256", `${packetId}.json`), packet, "packet"],
  ];
  for (const [from, , bytes] of pairs) put(from, bytes);
  return { day, log, target, pairs, statement };
}

for (const label of ["statement", "received", "feed-index", "head", "packet"]) {
  test(`plain dated ${label} survives conversion byte-for-byte at its declared destination`, (t) => {
    const f = fixture(t), d = datedFiles(f);
    const [from, to, bytes] = d.pairs.find((pair) => pair[3] === label);
    const report = fileJournalStoreByKind(f.root);
    assert.deepEqual(report.conflicts, []);
    assert.ok(existsSync(to), `missing retained ${label}: ${to}`);
    assert.equal(readFileSync(to, "utf8"), bytes);
    assert.equal(existsSync(from), false);
    if (label === "statement" || label === "received") assert.equal(parseJournalWitness(JSON.parse(readFileSync(to, "utf8"))).id, d.statement.id);
  });
}

test("plain dated two-date conversion keeps source references and isolated heads, then reruns cleanly", (t) => {
  const f = fixture(t), days = [datedFiles(f), datedFiles(f, "2026-10-02")];
  const first = fileJournalStoreByKind(f.root);
  assert.deepEqual(first.conflicts, []); assert.deepEqual(first.leftInPlace, []);
  for (const d of days) for (const [from, to, bytes] of d.pairs) {
    assert.equal(readFileSync(to, "utf8"), bytes); assert.equal(existsSync(from), false);
  }
  assert.equal(existsSync(join(f.store, "2026")), false);
  const before = snapshot(f.base), again = fileJournalStoreByKind(f.root);
  assert.equal(again.moved, 0); assert.equal(again.duplicates, 0); assert.equal(again.rewritten, 0);
  assert.deepEqual(again.leftInPlace, []); assert.deepEqual(again.conflicts, []);
  assert.deepEqual(snapshot(f.base), before);
});

test("plain dated directory-only statement sources are retained without inventing a projection", (t) => {
  const f = fixture(t), d = datedFiles(f);
  rmSync(d.log);
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.leftInPlace, []);
  assert.equal(existsSync(d.target), false);
  assert.ok(existsSync(`${d.target}.statements`));
  assert.ok(existsSync(`${d.target}.index`));
});

test("dry-run previews all plain dated directory forms without any filesystem change", (t) => {
  const f = fixture(t); datedFiles(f);
  const before = snapshot(f.base), report = fileJournalStoreByKind(f.root, { dryRun: true });
  assert.deepEqual(snapshot(f.base), before);
  assert.deepEqual(report.leftInPlace, []); assert.deepEqual(report.conflicts, []);
  assert.equal(report.moved, 5, "projection, statements, feed index, head tree and packet tree are planned");
});

for (const label of ["statement", "feed-index", "head", "packet"]) {
  test(`same-byte ${label} destination is deduplicated without loss`, (t) => {
    const f = fixture(t), d = datedFiles(f), [from, to, bytes] = d.pairs.find((pair) => pair[3] === label);
    put(to, bytes);
    const report = fileJournalStoreByKind(f.root);
    assert.deepEqual(report.conflicts, []); assert.deepEqual(report.leftInPlace, []);
    assert.ok(report.duplicates >= 1); assert.equal(readFileSync(to, "utf8"), bytes); assert.equal(existsSync(from), false);
  });
  test(`different-byte ${label} destination reports conflict and retains both versions on rerun`, (t) => {
    const f = fixture(t), d = datedFiles(f), [from, to, bytes] = d.pairs.find((pair) => pair[3] === label);
    put(to, "different target bytes\n");
    for (let run = 0; run < 2; run++) {
      const report = fileJournalStoreByKind(f.root);
      assert.ok(report.conflicts.some((entry) => entry.from === from && entry.to === to));
      assert.equal(readFileSync(from, "utf8"), bytes); assert.equal(readFileSync(to, "utf8"), "different target bytes\n");
    }
  });
}

test("unknown directories and unsupported packet children remain visible in leftInPlace", (t) => {
  const f = fixture(t), d = datedFiles(f);
  const unknown = join(d.day, "not-a-feed"), other = join(d.day, "packets", "other");
  put(join(unknown, "keep.json"), "unknown\n"); put(join(other, "keep.json"), "unknown packet format\n");
  const report = fileJournalStoreByKind(f.root);
  assert.ok(report.leftInPlace.includes(unknown)); assert.ok(report.leftInPlace.includes(other));
  assert.equal(readFileSync(join(unknown, "keep.json"), "utf8"), "unknown\n");
  assert.equal(readFileSync(join(other, "keep.json"), "utf8"), "unknown packet format\n");
  assert.ok(existsSync(d.pairs.find((pair) => pair[3] === "packet")[1]));
});

test("empty or non-directory sha256 packet carriers are reported without throwing", (t) => {
  for (const content of [undefined, "not a packet directory\n"]) {
    const f = fixture(t), day = join(f.store, "2026", "10", "01"), packets = join(day, "packets");
    mkdirSync(packets, { recursive: true });
    if (content !== undefined) put(join(packets, "sha256"), content);
    const report = fileJournalStoreByKind(f.root);
    assert.ok(report.leftInPlace.includes(packets));
    if (content !== undefined) assert.equal(readFileSync(join(packets, "sha256"), "utf8"), content);
  }
});

test("a linked day entry is not reclassified as a retained directory", (t) => {
  const f = fixture(t), day = join(f.store, "2026", "10", "01"), outside = join(f.base, "unrelated");
  put(join(outside, "source.json"), "untouched\n"); mkdirSync(day, { recursive: true });
  const link = join(day, "feed.jsonl.statements"); symlinkSync(outside, link);
  const report = fileJournalStoreByKind(f.root);
  assert.ok(report.leftInPlace.includes(link)); assert.equal(readlinkSync(link), outside);
  assert.equal(readFileSync(join(outside, "source.json"), "utf8"), "untouched\n");
});

test("plain dated directory forms join the physical store selected by the existing old-store link", (t) => {
  const f = fixture(t), d = datedFiles(f), oldStore = join(f.base, "machine", "settlement", "journals");
  mkdirSync(oldStore, { recursive: true }); symlinkSync(oldStore, join(f.root, "data", "journals"));
  const physical = join(dirname(oldStore), "data", "logs");
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); assert.deepEqual(report.leftInPlace, []);
  assert.equal(report.store, physical); assert.equal(readlinkSync(f.store), physical);
  assert.ok(lstatSync(join(f.root, "data", "journals")).isFile());
  for (const [, to, bytes, label] of d.pairs) {
    const received = label === "head" ? join(journalIndexDirectory(physical), "heads", "2026-10-01", "work-heads", "key.json") : to;
    assert.equal(readFileSync(received, "utf8"), bytes);
  }
});


test("canonical date-bearing statement directory keeps its existing canonical basename", (t) => {
  const f = fixture(t), date = "2026-10-01", day = join(f.store, "2026", "10", "01");
  const name = `${date}-admit-feed.jsonl.statements`;
  const from = join(day, name, "sha-256", "fixture.json"), to = join(`${journalFeedPath(f.root, "feed", date)}.statements`, "sha-256", "fixture.json");
  put(from, "synthetic addressed source bytes\n");
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); assert.deepEqual(report.leftInPlace, []);
  assert.equal(readFileSync(to, "utf8"), "synthetic addressed source bytes\n"); assert.equal(existsSync(from), false);
});

test("packet-only dated directories share identical addressed bytes without a fabricated dated feed", (t) => {
  const f = fixture(t), bytes = "{\"packet\":\"shared\"}\n", id = digest(bytes.slice(0, -1));
  for (const day of ["01", "02"]) put(join(f.store, "2026", "10", day, "packets", "sha256", `${id}.json`), bytes);
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); assert.deepEqual(report.leftInPlace, []);
  assert.equal(report.duplicates, 1);
  assert.equal(readFileSync(join(journalPacketDirectory(f.store), "sha256", `${id}.json`), "utf8"), bytes);
  assert.equal(existsSync(join(f.store, "2026")), false);
  assert.deepEqual(readdirSync(f.store), ["journal-packet-logs"]);
});

test("dry-run reports retained-directory collisions without changing either tree", (t) => {
  const f = fixture(t), d = datedFiles(f), [from, to] = d.pairs.find((pair) => pair[3] === "packet");
  put(to, "different target\n");
  const before = snapshot(f.base), report = fileJournalStoreByKind(f.root, { dryRun: true });
  assert.ok(report.conflicts.some((entry) => entry.from === from && entry.to === to));
  assert.deepEqual(snapshot(f.base), before);
});

test("a file obstructing a target statement directory leaves its full source tree intact", (t) => {
  const f = fixture(t), d = datedFiles(f), from = `${d.log}.statements`, to = `${d.target}.statements`;
  put(to, "target is a file\n");
  const before = snapshot(from), report = fileJournalStoreByKind(f.root);
  assert.ok(report.conflicts.some((entry) => entry.from === from && entry.to === to));
  assert.deepEqual(snapshot(from), before); assert.equal(readFileSync(to, "utf8"), "target is a file\n");
});

test("a linked sha256 carrier stays in place without traversing its target", (t) => {
  const f = fixture(t), packets = join(f.store, "2026", "10", "01", "packets"), unrelated = join(f.base, "unrelated");
  put(join(unrelated, "value.json"), "untouched\n"); mkdirSync(packets, { recursive: true });
  symlinkSync(unrelated, join(packets, "sha256"));
  const before = snapshot(f.base), report = fileJournalStoreByKind(f.root);
  assert.ok(report.leftInPlace.includes(packets)); assert.deepEqual(snapshot(f.base), before);
});

test("unknown feed directory suffix and record-sidecar directories stay outside the declared migration", (t) => {
  const f = fixture(t), day = join(f.store, "2026", "10", "01");
  const directories = [join(day, "feed.jsonl.custom"), join(day, "feed.record.jsonl.statements")];
  for (const directory of directories) put(join(directory, "source.json"), "unknown retained bytes\n");
  const before = snapshot(f.base), report = fileJournalStoreByKind(f.root);
  for (const directory of directories) assert.ok(report.leftInPlace.includes(directory));
  assert.deepEqual(snapshot(f.base), before);
});
