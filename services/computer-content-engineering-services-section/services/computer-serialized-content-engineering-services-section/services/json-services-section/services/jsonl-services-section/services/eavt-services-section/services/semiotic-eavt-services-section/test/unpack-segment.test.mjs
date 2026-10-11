import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { packingOf, packSegment, unpackSegment } from "../src/journal/filesystem/segment-bytes.mjs";

test("a packed segment is read back into the plain lines it held, and its packing goes", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "unpack-segment-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, "2026-10-08-admit-feed.jsonl.witnesses");
  const text = Array.from({ length: 200 }, (_, n) => `${JSON.stringify({ id: `w${n}`, observation: { n, body: "z".repeat(n % 37) } })}\n`).join("");
  writeFileSync(file, text);
  assert.ok(packSegment(file, { frameBytes: 1024 }).packed > 0);
  assert.notEqual(readFileSync(file, "utf8"), text, "a packed segment does not read as its lines in a text editor");
  const result = unpackSegment(file);
  assert.equal(result.unchanged, false);
  assert.equal(readFileSync(file, "utf8"), text);
  assert.equal(packingOf(file), null);
  assert.deepEqual(readdirSync(directory), ["2026-10-08-admit-feed.jsonl.witnesses"]);
  assert.equal(unpackSegment(file).unchanged, true);
});

test("a segment grown past its packed prefix keeps the lines written after it", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "unpack-segment-grown-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, "feed.jsonl.witnesses");
  writeFileSync(file, "{\"id\":\"a\"}\n{\"id\":\"b\"}\n");
  packSegment(file, { frameBytes: 8 });
  writeFileSync(file, "{\"id\":\"c\"}\n", { flag: "a" });
  unpackSegment(file);
  assert.equal(readFileSync(file, "utf8"), "{\"id\":\"a\"}\n{\"id\":\"b\"}\n{\"id\":\"c\"}\n");
  assert.equal(existsSync(join(directory, readdirSync(directory).find((name) => name.endsWith(".zst")) ?? "none")), false);
});
