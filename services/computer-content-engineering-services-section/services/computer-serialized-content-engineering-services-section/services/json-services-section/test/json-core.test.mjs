import assert from "node:assert/strict";
import test from "node:test";
import {
  canonical,
  canonicalChecked,
  isJsonRecord,
  isJsonValue,
  isObjectRecord,
  parse,
  admitJsonType,
  readJsonField,
} from "../src/index.mjs";
import {
  isJsonlText,
  parseLines,
  serializeLines,
} from "../services/jsonl-services-section/src/index.mjs";

test("JSON and JSONL preserve canonical recovered behavior", () => {
  assert.equal(canonical(parse('{"b":2,"a":1}')), '{"a":1,"b":2}');
  assert.deepEqual(parseLines('{"b":2}\n{"a":1}\n'), [{ b: 2 }, { a: 1 }]);
  assert.equal(serializeLines([{ b: 2 }, { a: 1 }]), '{"b":2}\n{"a":1}\n');
});

test("canonicalization recursively sorts objects and preserves arrays", () => {
  const ordinary = { z: [{ b: 2, a: 1 }, true, null], a: { y: 2, x: 1 } };
  assert.equal(
    canonical(ordinary),
    '{"a":{"x":1,"y":2},"z":[{"a":1,"b":2},true,null]}',
  );
  assert.equal(canonicalChecked(ordinary), canonical(ordinary));
});

test("canonical and checked canonicalization refuse JavaScript-only values", () => {
  const withMissing = { z: 3, missing: undefined, a: { y: undefined, x: 1 } };
  assert.throws(() => canonical(withMissing), TypeError);
  assert.throws(() => canonicalChecked(withMissing), /JSON value/u);
});

test("generic JSON admission rejects sparse arrays and cycles while retaining RFC 8259 string admission", () => {
  const cyclic = { self: null };
  cyclic.self = cyclic;
  for (const value of [
    [, 1],
    cyclic,
    Number.NaN,
    new Date("2026-08-30T00:00:00.000Z"),
  ])
    assert.equal(isJsonValue(value), false);
  assert.equal(isJsonValue("\ud800"), true);
  assert.throws(() => canonicalChecked("\ud800"), /lone Unicode surrogate/u);
  assert.equal(canonicalChecked(-0), "0");
});

test("JSONL recognition is line-wise rather than whole-document JSON", () => {
  assert.equal(isJsonlText('{"a":1}\n{"b":2}\n'), true);
  assert.equal(isJsonlText('{"a":1}\nnot-json\n'), false);
});

test("object record admission preserves the permissive runtime boundary separately from JSON", () => {
  const nullPrototype = Object.create(null);
  const instance = new (class RecordLike {})();
  assert.equal(isObjectRecord({}), true);
  assert.equal(isObjectRecord(nullPrototype), true);
  assert.equal(isObjectRecord(instance), true);
  assert.equal(isObjectRecord([]), false);
  assert.equal(isObjectRecord(null), false);
  assert.equal(isJsonRecord(nullPrototype), false);
  assert.equal(isJsonRecord(instance), false);
});

test("JSON admission and field lookup retain context in an explicit carrier", () => {
  const record = admitJsonType({
    value: { title: "game", ready: true, turns: [1] },
    type: "object",
    name: "game",
    source: "game-codecs",
  });
  for (const [key, type] of [
    ["title", "string"],
    ["ready", "boolean"],
    ["turns", "array"],
  ])
    assert.deepEqual(admitJsonType({ value: record[key], type }), record[key]);
  assert.equal(readJsonField({ record, key: "title" }), "game");
  assert.throws(
    () =>
      admitJsonType({
        value: 3,
        type: "string",
        name: "game.title",
        source: "game-codecs",
      }),
    /game-codecs: expected string for game.title, got number/u,
  );
  assert.throws(
    () =>
      admitJsonType({ value: Number.NaN, type: "number", name: "game.score" }),
    /game.score: not a JSON value/u,
  );
  assert.throws(
    () =>
      readJsonField({
        record,
        key: "missing",
        name: "game",
        source: "game-codecs",
      }),
    /game-codecs: missing field "missing" in game/u,
  );
});

test("JSONL errors identify the failing physical source line", () => {
  assert.throws(
    () => parseLines('\n {"ok":true}\n \n invalid\n'),
    /^TypeError: JSON Lines line 4:/u,
  );
  assert.deepEqual(parseLines('\n {"ok":true}\n \n'), [{ ok: true }]);
});
