import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSegmentReader, packSegment, packingOf } from "../src/journal/filesystem/segment-bytes.mjs";

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
