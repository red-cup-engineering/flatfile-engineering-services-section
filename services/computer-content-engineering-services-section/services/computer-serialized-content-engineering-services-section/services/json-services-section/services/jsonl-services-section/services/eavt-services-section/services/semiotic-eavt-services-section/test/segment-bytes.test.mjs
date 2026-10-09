import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendDurably, openSegmentReader, packSegment, packingOf } from "../src/journal/filesystem/segment-bytes.mjs";

function segment(lines) {
  const directory = mkdtempSync(join(tmpdir(), "segment-"));
  const file = join(directory, "2026-10-01-admit-rpc.jsonl.witnesses");
  fs.writeFileSync(file, lines.map((line) => `${line}\n`).join(""));
  return file;
}
const lines = Array.from({ length: 4000 }, (_, index) => JSON.stringify({ id: `w${index}`, body: "x".repeat(index % 997), at: index }));
const readAll = (file) => {
  const reader = openSegmentReader(file), size = fs.statSync(file).size, buffer = Buffer.alloc(size);
  try { assert.equal(reader.read(buffer, 0, size, 0), size); return buffer.toString("utf8"); } finally { reader.close(); }
};

test("a packed segment reads back byte for byte, keeps its size, and frees its plain bytes", () => {
  const file = segment(lines);
  const before = fs.readFileSync(file, "utf8");
  const packed = packSegment(file, { frameBytes: 64 * 1024 });
  assert.equal(packed.packed, Buffer.byteLength(before));
  assert.ok(packed.size < packed.packed / 5);
  assert.equal(fs.statSync(file).size, Buffer.byteLength(before));
  assert.ok(fs.readFileSync(file).subarray(0, 4096).every((byte) => byte === 0));
  assert.equal(readAll(file), before);
  assert.ok(packingOf(file).frames.length > 1);
  assert.equal(packSegment(file).unchanged, true);
});

test("every line is read whole at its offset, across frame boundaries", () => {
  const file = segment(lines);
  packSegment(file, { frameBytes: 64 * 1024 });
  const reader = openSegmentReader(file);
  try {
    let offset = 0;
    for (const line of lines) {
      const buffer = Buffer.alloc(Buffer.byteLength(line));
      assert.equal(reader.read(buffer, 0, buffer.length, offset), buffer.length);
      assert.equal(buffer.toString("utf8"), line);
      offset += buffer.length + 1;
    }
  } finally { reader.close(); }
});

test("appends after packing are read from the file, and a torn last line stays plain", () => {
  const file = segment(lines.slice(0, 100));
  fs.appendFileSync(file, '{"id":"torn"');
  const packed = packSegment(file, { frameBytes: 4096 });
  fs.appendFileSync(file, ',"done":true}\n{"id":"after"}\n');
  const text = readAll(file);
  assert.ok(text.endsWith('{"id":"torn","done":true}\n{"id":"after"}\n'));
  assert.equal(Buffer.byteLength(text.split('{"id":"torn"')[0]), packed.packed);
  const again = packSegment(file, { frameBytes: 4096 });
  assert.equal(again.packed, fs.statSync(file).size);
  assert.equal(readAll(file), text);
});

test("a reader opened before the packing reads the freed bytes from the frames", () => {
  const file = segment(lines);
  const reader = openSegmentReader(file);
  try {
    packSegment(file, { frameBytes: 64 * 1024 });
    const buffer = Buffer.alloc(Buffer.byteLength(lines[0]));
    assert.equal(reader.read(buffer, 0, buffer.length, 0), buffer.length);
    assert.equal(buffer.toString("utf8"), lines[0]);
  } finally { reader.close(); }
});

// ── crash tails: the shape a crash during an append leaves ──

const WARNING = "JOURNAL_TAIL_RECOVERED";
const watching = (file) => {
  const seen = [];
  const listener = (warning) => { if (warning.code === WARNING && JSON.parse(warning.detail).file === file) seen.push(warning); };
  process.on("warning", listener);
  return { seen, stop: () => process.off("warning", listener) };
};
const settle = () => new Promise((resolve) => setImmediate(resolve));
const pad = (file, bytes) => fs.appendFileSync(file, Buffer.alloc(bytes));

test("a NUL run after the last newline, with no packing, is read as absent and reported once", async () => {
  const file = segment(lines.slice(0, 50));
  const clean = fs.readFileSync(file, "utf8");
  pad(file, 1993);
  const watch = watching(file);
  try {
    const reader = openSegmentReader(file), buffer = Buffer.alloc(Buffer.byteLength(clean) + 4096);
    try {
      assert.equal(reader.read(buffer, 0, buffer.length, 0), Buffer.byteLength(clean));
      assert.equal(buffer.toString("utf8", 0, Buffer.byteLength(clean)), clean);
      assert.equal(reader.read(buffer, 0, 10, Buffer.byteLength(clean)), 0);
      assert.equal(reader.read(buffer, 0, 10, Buffer.byteLength(clean) + 5), 0);
    } finally { reader.close(); }
    await settle();
    assert.equal(watch.seen.length, 1);
    const detail = JSON.parse(watch.seen[0].detail);
    assert.deepEqual([detail.file, detail.kind, detail.offset, detail.bytes], [file, "nul", Buffer.byteLength(clean), 1993]);
  } finally { watch.stop(); }
});
test("a NUL run after a packed prefix and the lines after it is read as absent", () => {
  const file = segment(lines.slice(0, 200));
  packSegment(file, { frameBytes: 4096 });
  fs.appendFileSync(file, '{"id":"after"}\n');
  const clean = fs.readFileSync(file).length;
  pad(file, 777);
  const reader = openSegmentReader(file), buffer = Buffer.alloc(clean + 2000);
  try {
    assert.equal(reader.read(buffer, 0, buffer.length, 0), clean);
    assert.ok(buffer.toString("utf8", 0, clean).endsWith('{"id":"after"}\n'));
  } finally { reader.close(); }
});

test("a NUL byte mid-file, inside a line, or followed by data is refused", () => {
  const refused = /holds NUL bytes outside its packed prefix/;
  const read = (file) => { const reader = openSegmentReader(file), size = fs.statSync(file).size, buffer = Buffer.alloc(size); try { reader.read(buffer, 0, size, 0); } finally { reader.close(); } };
  const mid = segment(lines.slice(0, 10));
  fs.appendFileSync(mid, Buffer.concat([Buffer.alloc(30), Buffer.from('{"id":"x"}\n')]));
  assert.throws(() => read(mid), refused);
  const inside = segment([]);
  fs.writeFileSync(inside, Buffer.concat([Buffer.from('{"id":"a'), Buffer.alloc(1), Buffer.from('b"}\n')]));
  assert.throws(() => read(inside), refused);
  const mixed = segment(lines.slice(0, 10));
  fs.appendFileSync(mixed, Buffer.concat([Buffer.alloc(40), Buffer.from("tail")]));
  assert.throws(() => read(mixed), refused);
  const both = segment(lines.slice(0, 10));
  fs.appendFileSync(both, Buffer.concat([Buffer.from("{"), Buffer.alloc(40)]));
  assert.throws(() => read(both), refused);
  const early = segment(lines.slice(0, 10));
  fs.appendFileSync(early, Buffer.concat([Buffer.alloc(1), Buffer.from('{"id":"x"}\n'), Buffer.alloc(40)]));
  assert.throws(() => read(early), refused);
});

test("the writer truncates a NUL run before its append, and reports it", async () => {
  const file = segment(lines.slice(0, 20));
  const clean = fs.readFileSync(file, "utf8");
  pad(file, 1993);
  const watch = watching(file);
  try {
    appendDurably(file, '{"id":"next"}\n');
    await settle();
    assert.equal(fs.readFileSync(file, "utf8"), `${clean}{"id":"next"}\n`);
    assert.equal(watch.seen.length, 1);
    assert.equal(JSON.parse(watch.seen[0].detail).bytes, 1993);
  } finally { watch.stop(); }
});

test("the writer truncates a torn final line before its append, and reports it", async () => {
  const file = segment(lines.slice(0, 20));
  const clean = fs.readFileSync(file, "utf8");
  fs.appendFileSync(file, '{"id":"torn","bo');
  const watch = watching(file);
  try {
    appendDurably(file, '{"id":"next"}\n');
    await settle();
    assert.equal(fs.readFileSync(file, "utf8"), `${clean}{"id":"next"}\n`);
    const detail = JSON.parse(watch.seen[0].detail);
    assert.deepEqual([detail.kind, detail.bytes], ["torn", 16]);
    assert.match(detail.sha256, /^[0-9a-f]{64}$/);
  } finally { watch.stop(); }
});

test("the writer refuses a tail that mixes NUL and data, and appends to a clean or fully packed file", () => {
  const mixed = segment(lines.slice(0, 5));
  fs.appendFileSync(mixed, Buffer.concat([Buffer.alloc(8), Buffer.from("x")]));
  assert.throws(() => appendDurably(mixed, "{}\n"), /holds NUL bytes/);
  const packed = segment(lines.slice(0, 200));
  const before = fs.readFileSync(packed, "utf8");
  packSegment(packed, { frameBytes: 4096 });
  appendDurably(packed, '{"id":"z"}\n');
  assert.equal(readAll(packed), `${before}{"id":"z"}\n`);
  const fresh = join(mkdtempSync(join(tmpdir(), "segment-")), "new.jsonl.witnesses");
  appendDurably(fresh, "{}\n");
  assert.equal(fs.readFileSync(fresh, "utf8"), "{}\n");
});
