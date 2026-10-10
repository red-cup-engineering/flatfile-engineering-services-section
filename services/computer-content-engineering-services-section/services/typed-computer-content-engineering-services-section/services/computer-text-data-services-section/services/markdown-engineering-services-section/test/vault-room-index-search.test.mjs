import assert from "node:assert/strict";
import test from "node:test";

import { searchImmutableRoomIndex } from "../src/vault/room-index-search.mjs";

const rooms = Object.freeze([
  { id: "science/projects/field-guide.md", key: "b", title: "Field Guide", summary: "A practical project handbook", kind: "guide", collection: "science/projects", space: { semanticPosition: { tags: ["planning"] } } },
  { id: "science/notes/field-guide.md", key: "a", title: "Notes from the field", summary: "A guide to observations", kind: "note", collection: "science/notes", space: { semanticPosition: { tags: ["field"] } } },
  { id: "operations/field-log.md", key: "c", title: "Field log", summary: "A project guide", kind: "record", collection: "operations", space: { semanticPosition: { tags: [] } } },
  { id: "science/projects/accent.md", key: "d", title: "Café Field", summary: "Diacritics should normalize", kind: "guide", collection: "science/projects", space: { semanticPosition: { tags: [] } } },
  { id: "public/logs/2026-03-28.md", key: "e", title: "Absurdity of knowledge", summary: "A personal log section", kind: "log", collection: "public/logs", space: { semanticPosition: { tags: [] } } },
]);

test("requires every query token and ranks exact normalized titles first", () => {
  const reading = searchImmutableRoomIndex(rooms, { query: "field guide" });
  assert.deepEqual(reading.results.map(({ room }) => room.key), ["b", "a", "d", "c"]);
  assert.equal(reading.results[0].exactTitle, true);
  assert.deepEqual(reading.results[0].reasons, ["exact-normalized-title", "query-token-in-title", "query-token-in-path", "query-token-in-token"]);
  assert.ok(reading.results.every(({ evidence }) => evidence.map(({ token }) => token).join(" ") === "field guide"));
});

test("can rank ordinary searches that match any query word", () => {
  const reading = searchImmutableRoomIndex(rooms, { query: "absurd planning missing", match: "any" });
  assert.deepEqual(reading.results.map(({ room }) => room.key), ["e", "b"]);
  assert.equal(reading.filters.match, "any");
  assert.deepEqual(reading.results[0].evidence.map(({ token }) => token), ["absurd"]);
  assert.throws(() => searchImmutableRoomIndex(rooms, { query: "field", match: "some" }), /match must be all or any/u);
});

test("weights title, semantic tokens, paths, and summaries deterministically", () => {
  const reading = searchImmutableRoomIndex(rooms, { query: "planning" });
  assert.equal(reading.results[0].room.key, "b");
  assert.deepEqual(reading.results[0].evidence, [{ token: "planning", matches: [{ field: "token", value: "planning", weight: 32 }] }]);
  assert.equal(Object.isFrozen(reading.results[0].evidence), true);
});

test("applies collection, path, and kind filters before ranking", () => {
  assert.deepEqual(searchImmutableRoomIndex(rooms, { query: "field", collectionPrefix: "science/proj", kind: "guide" }).results.map(({ room }) => room.key), ["b", "d"]);
  assert.deepEqual(searchImmutableRoomIndex(rooms, { query: "guide", pathPrefix: "science/notes", kinds: ["note", "record"] }).results.map(({ room }) => room.key), ["a"]);
});

test("normalizes accents, enforces a positive limit, and leaves empty queries empty", () => {
  assert.equal(searchImmutableRoomIndex(rooms, { query: "cafe field" }).results[0].room.key, "d");
  assert.equal(searchImmutableRoomIndex(rooms, { query: "field", limit: 1 }).returned, 1);
  assert.deepEqual(searchImmutableRoomIndex(rooms, { query: "  " }).results, []);
  assert.throws(() => searchImmutableRoomIndex(rooms, { query: "field", limit: 0 }), /positive safe integer/u);
});

test("finds a full multi-token heading when its room is actually admitted", () => {
  const reading = searchImmutableRoomIndex(rooms, { query: "absurdity of knowledge" });
  assert.deepEqual(reading.results.map(({ room }) => room.key), ["e"]);
  assert.equal(reading.results[0].exactTitle, true);
});

test("indexes string and structured headings with source evidence and breaks ties by document path", () => {
  const documents = [
    { path: "z.md", title: "Notes", headings: [{ text: "Café methods" }] },
    { path: "a.md", title: "Notes", headings: ["Café methods"] },
    { path: "b.md", title: "Notes", headings: [{ title: "Café methods" }, { value: "Field notes" }] },
  ];
  const reading = searchImmutableRoomIndex(documents, { query: "cafe methods" });
  assert.deepEqual(reading.results.map(({ room }) => room.path), ["a.md", "b.md", "z.md"]);
  assert.deepEqual(reading.results[0].evidence[0].matches, [{ field: "token", value: "Café methods", weight: 32 }]);
  assert.equal(searchImmutableRoomIndex(documents, { query: "field notes" }).results[0].room.path, "b.md");
});
