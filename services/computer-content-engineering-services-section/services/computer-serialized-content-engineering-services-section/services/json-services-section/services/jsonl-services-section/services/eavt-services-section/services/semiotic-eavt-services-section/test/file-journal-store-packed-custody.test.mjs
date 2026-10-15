import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import { journalFeedPath, journalIndexDirectory } from "../src/journal/store-root.mjs";
import { segmentAdmit, segmentStatements, locatedIndex, clearSegmentIndexes } from "../src/journal/filesystem/segment-store.mjs";
import { fileJournalStoreByKind, kindRelativeOf } from "../scripts/file-journal-store-by-kind.mjs";
import { packSegment, packingOf, openSegmentReader } from "../src/journal/filesystem/segment-bytes.mjs";

const put = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
const logicalBytes = (file, length) => {
  const reader = openSegmentReader(file), bytes = Buffer.alloc(length);
  try { assert.equal(reader.read(bytes, 0, length, 0), length); return bytes; } finally { reader.close(); }
};
function filesBelow(root) {
  const files = {};
  const walk = (directory) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) files[path.relative(root, file)] = fs.readFileSync(file).toString("base64");
  } };
  walk(root); return files;
}
function packedStore(t, count = 2, names) {
  const root = fs.mkdtempSync(path.join(tmpdir(), "packed-custody-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const date = "2026-10-01", directory = path.join(root, "data", "journals", "2026", "10", "01");
  const bytes = Buffer.from(Array.from({ length: 30 }, (_, n) => JSON.stringify({ synthetic: n, text: "same-payload" })).join("\n")+"\n");
  const members = [];
  for (const name of names ?? ["alpha", "beta"].slice(0, count).map((kind) => date+"-admit-"+kind+".jsonl.witnesses")) {
    const file = path.join(directory, name);
    put(file, bytes); const packed = packSegment(file, { frameBytes: 64 }); assert.ok(packed.packed > 0);
    const packing = packingOf(file);
    const target = path.join(root, "data", "logs", kindRelativeOf(date, name));
    members.push({ file, description: packing.descriptionPath, data: packing.dataPath, target,
      targetDescription: path.join(path.dirname(target), ".packing-"+createHash("sha256").update(path.basename(target)).digest("hex")+".packed.json"),
      targetData: path.join(path.dirname(target), path.basename(packing.dataPath)) });
    assert.deepEqual(logicalBytes(file, bytes.length), bytes);
    assert.notDeepEqual(fs.readFileSync(file), bytes, "real packing punched the source, so the payload is indispensable");
  }
  assert.equal(new Set(members.map((m) => m.data)).size, 1, "two actual pack operations share their representation");
  const originals = new Map([...new Set(members.flatMap((m) => [m.file, m.description, m.data]))].map((file) => [file, fs.readFileSync(file)]));
  return { root, directory, bytes, members, originals };
}
function sourceIntact(f) {
  for (const [file, bytes] of f.originals) assert.deepEqual(fs.readFileSync(file), bytes, "source group remains coherent: "+file);
  for (const m of f.members) assert.deepEqual(logicalBytes(m.file, f.bytes.length), f.bytes);
}
function received(f) {
  for (const m of f.members) {
    assert.deepEqual(logicalBytes(m.target, f.bytes.length), f.bytes);
    assert.deepEqual(fs.readFileSync(m.targetData), f.originals.get(m.data));
    assert.deepEqual(fs.readFileSync(m.targetDescription), f.originals.get(m.description));
  }
}
for (const count of [1, 2]) {
  test("uncontested "+count+"-segment packed group transfers and repeats without change", (t) => {
    const f = packedStore(t, count), report = fileJournalStoreByKind(f.root);
    assert.deepEqual(report.conflicts, []); received(f);
    for (const file of f.originals.keys()) assert.equal(fs.existsSync(file), false);
    const before = filesBelow(f.root), second = fileJournalStoreByKind(f.root);
    assert.equal(second.moved, 0); assert.equal(second.duplicates, 0); assert.deepEqual(second.conflicts, []);
    assert.deepEqual(filesBelow(f.root), before);
  });
  test("equal destination payload, description, and segment bytes deduplicate "+count+"-segment group", (t) => {
    const f = packedStore(t, count);
    for (const m of f.members) for (const [from, to] of [[m.data,m.targetData],[m.description,m.targetDescription],[m.file,m.target]]) put(to, f.originals.get(from));
    const report = fileJournalStoreByKind(f.root);
    assert.deepEqual(report.conflicts, []); assert.equal(report.duplicates, count * 2); received(f);
    for (const file of f.originals.keys()) assert.equal(fs.existsSync(file), false);
  });
  for (const component of ["data", "description", "segment"]) test(component+" collision retains coherent "+count+"-segment shared source group", (t) => {
    const f = packedStore(t, count), member = f.members.at(-1);
    const target = component === "data" ? member.targetData : component === "description" ? member.targetDescription : member.target;
    const conflictBytes = Buffer.from("different existing "+component+" bytes"); put(target, conflictBytes);
    const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].to, target);
    sourceIntact(f); assert.deepEqual(fs.readFileSync(target), conflictBytes);
    assert.deepEqual(filesBelow(f.root), before, "no member of a colliding shared group was transferred");
    const again = fileJournalStoreByKind(f.root);
    assert.equal(again.conflicts.length, 1); assert.deepEqual(filesBelow(f.root), before);
    // Explicitly resolving only this synthetic conflicting target permits a complete retry.
    fs.unlinkSync(target);
    const repaired = fileJournalStoreByKind(f.root);
    assert.deepEqual(repaired.conflicts, []); received(f);
    for (const file of f.originals.keys()) assert.equal(fs.existsSync(file), false);
  });
}
for (const collision of [false, true]) test("packed shared group dry run leaves all bytes and paths unchanged"+(collision ? " with collision" : ""), (t) => {
  const f = packedStore(t);
  if (collision) put(f.members[1].targetData, Buffer.from("different bytes"));
  const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root, { dryRun: true });
  assert.equal(report.conflicts.length, collision ? 1 : 0);
  assert.deepEqual(filesBelow(f.root), before); sourceIntact(f);
});
test("remaining descriptor retains its shared original payload", (t) => {
  const f = packedStore(t);
  const orphan = path.join(f.directory, ".packing-untransferred.packed.json");
  put(orphan, fs.readFileSync(f.members[0].description));
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); received(f);
  assert.deepEqual(fs.readFileSync(f.members[0].data), f.originals.get(f.members[0].data));
  assert.ok(report.leftInPlace.includes(orphan));
  assert.ok(report.leftInPlace.includes(f.members[0].data));
});
test("unreadable remaining descriptor cannot authorize shared payload retirement", (t) => {
  const f = packedStore(t); put(path.join(f.directory, ".packing-unreadable.packed.json"), "{");
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); received(f);
  assert.deepEqual(fs.readFileSync(f.members[0].data), f.originals.get(f.members[0].data));
});
test("missing packed source payload leaves its descriptor and segment in place", (t) => {
  const f = packedStore(t, 1); fs.unlinkSync(f.members[0].data);
  const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root);
  assert.deepEqual(filesBelow(f.root), before);
  assert.ok(report.leftInPlace.includes(f.members[0].file));
  assert.ok(report.leftInPlace.includes(f.members[0].description));
});

test("remaining valid JSON with unknown packing schema cannot release shared payload", (t) => {
  for (const unknown of [{}, { version: 2, packed: 10, frames: [], data: "other.zst" }, { version: 1, packed: 10, frames: [], data: 42 }]) {
    const f = packedStore(t);
    put(path.join(f.directory, ".packing-unknown.packed.json"), JSON.stringify(unknown));
    fileJournalStoreByKind(f.root); received(f);
    assert.deepEqual(fs.readFileSync(f.members[0].data), f.originals.get(f.members[0].data));
  }
});



// Defensive fault injection checks a quiescent single-writer conversion. These
// cases do not establish general concurrent or crash-atomic migration safety.
test("distinct packed source names converging on a destination retain the whole group", (t) => {
  const f = packedStore(t, 2, ["feed.jsonl.witnesses", "2026-10-01-admit-feed.jsonl.witnesses"]);
  assert.equal(f.members[0].target, f.members[1].target);
  const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root);
  assert.ok(report.conflicts.length > 0); sourceIntact(f);
  assert.deepEqual(filesBelow(f.root), before);
});
test("late staging failure removes owned links and preserves complete source bytes", (t) => {
  const f = packedStore(t), link = fs.linkSync; let calls = 0;
  fs.linkSync = (from, to) => {
    if (++calls === 3) throw Object.assign(new Error("synthetic cross-device refusal"), { code: "EXDEV" });
    return link(from, to);
  };
  try { assert.throws(() => fileJournalStoreByKind(f.root), /synthetic cross-device refusal/); }
  finally { fs.linkSync = link; }
  sourceIntact(f);
  for (const member of f.members) for (const file of [member.target, member.targetData, member.targetDescription]) assert.equal(fs.existsSync(file), false);
});
test("rollback preserves an unexpected replacement inode at a staged path", (t) => {
  const f = packedStore(t), link = fs.linkSync, replacement = Buffer.from("replacement bytes"); let calls = 0, first;
  fs.linkSync = (from, to) => {
    if (++calls === 1) { first = to; return link(from, to); }
    fs.unlinkSync(first); put(first, replacement); throw new Error("synthetic late refusal");
  };
  try { assert.throws(() => fileJournalStoreByKind(f.root), /synthetic late refusal/); }
  finally { fs.linkSync = link; }
  sourceIntact(f); assert.deepEqual(fs.readFileSync(first), replacement);
});
test("partial source retirement retains verified receiving bytes and original payload for retry", (t) => {
  const f = packedStore(t), unlink = fs.unlinkSync; let retirements = 0;
  fs.unlinkSync = (file) => {
    if (f.originals.has(String(file)) && ++retirements === 2) throw new Error("synthetic unlink refusal");
    return unlink(file);
  };
  try { assert.throws(() => fileJournalStoreByKind(f.root), /synthetic unlink refusal/); }
  finally { fs.unlinkSync = unlink; }
  received(f);
  assert.deepEqual(fs.readFileSync(f.members[0].data), f.originals.get(f.members[0].data));
  fileJournalStoreByKind(f.root); received(f);
});


test("renamed packed plain basename remains readable through its projected descriptor", (t) => {
  const f = packedStore(t, 1, ["feed.jsonl.witnesses"]);
  assert.notEqual(path.basename(f.members[0].description), path.basename(f.members[0].targetDescription));
  const report = fileJournalStoreByKind(f.root); assert.deepEqual(report.conflicts, []); received(f);
});
test("distinct packed payloads with same raw punched length cannot converge", (t) => {
  const f = packedStore(t, 1, ["feed.jsonl.witnesses"]);
  const other = path.join(f.directory, "2026-10-01-admit-feed.jsonl.witnesses");
  const otherBytes = Buffer.from(f.bytes.toString().replaceAll("same-payload", "diff-payload"));
  assert.equal(otherBytes.length, f.bytes.length); put(other, otherBytes); packSegment(other, { frameBytes: 64 });
  assert.notEqual(packingOf(other).dataPath, f.members[0].data);
  assert.deepEqual(fs.readFileSync(other), fs.readFileSync(f.members[0].file));
  const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root);
  assert.ok(report.conflicts.length > 0); assert.deepEqual(filesBelow(f.root), before);
  sourceIntact(f); assert.deepEqual(logicalBytes(other, otherBytes.length), otherBytes);
});
test("packed and unpacked source aliases are refused before either moves", (t) => {
  const f = packedStore(t, 1, ["feed.jsonl.witnesses"]);
  put(path.join(f.directory, "2026-10-01-admit-feed.jsonl.witnesses"), f.bytes);
  const before = filesBelow(f.root), report = fileJournalStoreByKind(f.root);
  assert.ok(report.conflicts.length > 0); assert.deepEqual(filesBelow(f.root), before); sourceIntact(f);
});
test("equal addressed payloads from separate dates share one receiving representation", (t) => {
  const f = packedStore(t, 1);
  const secondName = "2026-10-02-admit-alpha.jsonl.witnesses";
  const second = path.join(f.root, "data", "journals", "2026", "10", "02", secondName);
  put(second, f.bytes); packSegment(second, { frameBytes: 64 });
  const secondData = packingOf(second).dataPath;
  assert.notEqual(secondData, f.members[0].data);
  assert.equal(path.basename(secondData), path.basename(f.members[0].data));
  assert.deepEqual(fs.readFileSync(secondData), f.originals.get(f.members[0].data));
  const report = fileJournalStoreByKind(f.root);
  assert.deepEqual(report.conflicts, []); received(f);
  assert.deepEqual(logicalBytes(path.join(f.root, "data", "logs", "alpha-logs", secondName), f.bytes.length), f.bytes);
  assert.equal(fs.existsSync(secondData), false); assert.equal(fs.existsSync(f.members[0].data), false);
  const before = filesBelow(f.root), again = fileJournalStoreByKind(f.root);
  assert.equal(again.moved, 0); assert.deepEqual(again.conflicts, []); assert.deepEqual(filesBelow(f.root), before);
});
for (const located of [false, true]) test("packed conflict preserves old symlink and "+(located ? "located" : "v2")+" index route", (t) => {
  const base = fs.mkdtempSync(path.join(tmpdir(), "packed-index-route-"));
  t.after(() => { clearSegmentIndexes(); fs.rmSync(base, { recursive: true, force: true }); });
  const date = "2026-10-01", root = path.join(base, "settlement"), state = path.join(base, "state", "settlement", "journals");
  const relative = "2026/10/01/2026-10-01-admit-feed.jsonl", oldLog = path.join(state, relative);
  const statement = journalWitness({ kind: "metroplat.journal.observation", seat: "urn:test:packed-route", claim: tm.mark("observed"),
    address: tm.mark("held"), time: date+"T00:00:00.000Z", causes: [], payload: { synthetic: true } });
  const scratchLog = journalFeedPath(path.join(base, "scratch"), "feed", date);
  segmentAdmit(scratchLog, [statement]); fs.mkdirSync(path.dirname(oldLog), { recursive: true });
  for (const suffix of [".witnesses", ".admitted"]) fs.renameSync(scratchLog+suffix, oldLog+suffix);
  packSegment(oldLog+".witnesses", { frameBytes: 64 });
  const indexDirectory = located ? journalIndexDirectory(state) : path.join(state, "index");
  put(path.join(indexDirectory, "causal-admission", "v2", "admitted.jsonl"), JSON.stringify({ id: statement.id, log: relative })+"\n");
  clearSegmentIndexes();
  if (located) assert.deepEqual([...locatedIndex(state).admittedLogs(statement.id)], [relative]);
  fs.mkdirSync(path.join(root, "data"), { recursive: true }); fs.symlinkSync(state, path.join(root, "data", "journals"));
  const sourcePacked = packingOf(oldLog+".witnesses"), targetStore = path.join(base, "state", "settlement", "data", "logs");
  put(path.join(targetStore, "feed-logs", path.basename(sourcePacked.dataPath)), Buffer.from("different packed destination"));
  const route = path.join(root, "data", "journals", relative);
  // The current path owner deliberately refuses the literal retired segment.
  // Resolve the preserved old symlink to its physical store, then use the genuine reader.
  assert.throws(() => segmentStatements(route), /superseded/);
  assert.deepEqual(segmentStatements(fs.realpathSync(route+".witnesses").slice(0, -".witnesses".length)).map((each) => each.id), [statement.id]);
  const before = filesBelow(base), report = fileJournalStoreByKind(root);
  assert.ok(report.conflicts.length > 0); assert.equal(fs.readlinkSync(path.join(root, "data", "journals")), state);
  assert.deepEqual(filesBelow(base), before, "preflight did not carry, move, or rewrite original indexes");
  clearSegmentIndexes();
  if (located) assert.deepEqual([...locatedIndex(state).admittedLogs(statement.id)], [relative]);
  assert.throws(() => segmentStatements(route), /superseded/);
  assert.deepEqual(segmentStatements(fs.realpathSync(route+".witnesses").slice(0, -".witnesses".length)).map((each) => each.id), [statement.id]);
});
