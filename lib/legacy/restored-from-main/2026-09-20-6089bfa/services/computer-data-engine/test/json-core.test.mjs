import assert from "node:assert/strict";
import test from "node:test";
import {
  canonical,
  canonicalChecked,
  isJsonRecord,
  isJsonValue,
  isObjectRecord,
  jsonlProjector,
  parse,
  parseLines,
  requireJsonArray,
  requireJsonBoolean,
  requireJsonField,
  requireJsonNumber,
  requireJsonRecord,
  requireJsonString,
  serializeLines,
} from "../dist/json/index.mjs";

test("JSON and JSONL preserve canonical recovered behavior", () => {
  assert.equal(canonical(parse('{"b":2,"a":1}')), '{"a":1,"b":2}');
  assert.deepEqual(parseLines('{"b":2}\n{"a":1}\n'), [{ b: 2 }, { a: 1 }]);
  assert.equal(serializeLines([{ b: 2 }, { a: 1 }]), '{"b":2}\n{"a":1}\n');
});

test("canonicalization recursively sorts objects and preserves arrays", () => {
  const ordinary = { z: [{ b: 2, a: 1 }, true, null], a: { y: 2, x: 1 } };
  assert.equal(canonical(ordinary), '{"a":{"x":1,"y":2},"z":[{"a":1,"b":2},true,null]}');
  assert.equal(canonicalChecked(ordinary), canonical(ordinary));
});

test("canonical and checked canonicalization refuse JavaScript-only values", () => {
  const withMissing = { z: 3, missing: undefined, a: { y: undefined, x: 1 } };
  assert.throws(() => canonical(withMissing), TypeError);
  assert.throws(() => canonicalChecked(withMissing), /not a JSON value/u);
});

test("generic JSON admission rejects sparse arrays and cycles while retaining RFC 8259 string admission", () => {
  const cyclic = { self: null };
  cyclic.self = cyclic;
  for (const value of [[, 1], cyclic, Number.NaN, new Date("2026-08-30T00:00:00.000Z")]) assert.equal(isJsonValue(value), false);
  assert.equal(isJsonValue("\ud800"), true);
  assert.throws(() => canonicalChecked("\ud800"), /lone Unicode surrogate/u);
  assert.equal(canonicalChecked(-0), "0");
});

test("JSONL recognition is line-wise rather than whole-document JSON", () => {
  assert.equal(jsonlProjector.recognize({ content: '{"a":1}\n{"b":2}\n' }), true);
  assert.equal(jsonlProjector.recognize({ content: '{"a":1}\nnot-json\n' }), false);
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

test("JSON readers retain the caller's boundary vocabulary", () => {
  const record = requireJsonRecord({ title: "game", ready: true, turns: [1] }, "game", "game-codecs");
  assert.equal(requireJsonString(record.title, "game.title", "game-codecs"), "game");
  assert.equal(requireJsonBoolean(record.ready, "game.ready", "game-codecs"), true);
  assert.deepEqual(requireJsonArray(record.turns, "game.turns", "game-codecs"), [1]);
  assert.equal(requireJsonNumber(3, "game.score", "game-codecs"), 3);
  assert.equal(requireJsonField(record, "title", "game", "game-codecs"), "game");
  assert.throws(() => requireJsonString(3, "game.title", "game-codecs"), /game-codecs: expected string for game.title, got number/u);
  assert.throws(() => requireJsonRecord(null, "game", "game-codecs"), /game-codecs: expected object for game, got null/u);
  assert.throws(() => requireJsonArray({}, "game.turns", "game-codecs"), /game-codecs: expected array for game.turns, got object/u);
  assert.throws(() => requireJsonNumber(Number.NaN, "game.score", "game-codecs"), /game.score: not a JSON value/u);
  assert.throws(() => requireJsonField(record, "missing", "game", "game-codecs"), /game-codecs: missing field "missing" in game/u);
});

test("JSONL errors identify the failing nonblank record", () => {
  assert.throws(() => parseLines('\n {"ok":true}\n \n invalid\n'), /^TypeError: line 2:/u);
  assert.deepEqual(parseLines('\n {"ok":true}\n \n'), [{ ok: true }]);
});
