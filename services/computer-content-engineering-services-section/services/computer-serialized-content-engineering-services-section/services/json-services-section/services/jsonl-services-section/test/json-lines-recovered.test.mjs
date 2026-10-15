import assert from "node:assert/strict";
import test from "node:test";
import { decodeJsonLines, encodeJsonLines, isJsonlText, parseLines, serializeLines } from "../src/index.mjs";

test("JSONL preserves canonical recovered behavior", () => {
  assert.deepEqual(parseLines('{"b":2}\n{"a":1}\n'), [{ b: 2 }, { a: 1 }]);
  assert.equal(serializeLines([{ b: 2 }, { a: 1 }]), '{"b":2}\n{"a":1}\n');
});

test("JSONL recognition is line-wise rather than whole-document JSON", () => {
  assert.equal(isJsonlText('{"a":1}\n{"b":2}\n'), true);
  assert.equal(isJsonlText('{"a":1}\nnot-json\n'), false);
});

test("JSONL errors identify the failing physical source line", () => {
  assert.throws(
    () => parseLines('\n {"ok":true}\n \n invalid\n'),
    /^TypeError: JSON Lines line 4:/u,
  );
  assert.deepEqual(parseLines('\n {"ok":true}\n \n'), [{ ok: true }]);
});

test("JSON Lines is a sequence of canonical JSON documents", () => {
  const text = encodeJsonLines([{ b: 2, a: 1 }, false]);
  assert.equal(text, '{"a":1,"b":2}\nfalse\n');
  assert.deepEqual(decodeJsonLines("\n" + text + "\n"), [
    { a: 1, b: 2 },
    false,
  ]);
  assert.throws(() => decodeJsonLines('{"ok":true}\nnot-json\n'), /line 2/u);
});

test("JSON Lines decodes a large sequence without copying prior records", () => {
  const values = Array.from({ length: 10000 }, (_, index) => ({ index }));
  assert.deepEqual(decodeJsonLines(encodeJsonLines(values)), values);
});
