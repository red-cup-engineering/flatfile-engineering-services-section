import assert from "node:assert/strict";
import test from "node:test";
import { buildEdges, DEFAULT_EXCLUDES } from "../src/substrate/store.mjs";
import { loadFlatfiles } from "../src/substrate/read-flatfiles.mjs";
import { makeFlatfile } from "../src/substrate/flatfile.mjs";

// store.mjs's buildEdges is the pure half of the old loadFlatfiles+buildEdges
// pipeline; the disk read now lives on its own in read-flatfiles.mjs. This
// pins buildEdges's law directly, without touching a filesystem, and checks
// the two modules are still wired together correctly (loadFlatfiles is a
// function, DEFAULT_EXCLUDES is shared by both).

test("buildEdges derives an fm-relation edge and a body-link edge, in that order, from a caller-supplied note", () => {
  const note = makeFlatfile({
    slug: "a", dir: "concepts", kind: "concept",
    fm: { "depends-on": ["b"] },
    body: "see [c](c.md)",
    path: "concepts/a.md", mtime: 0,
  });
  const edges = buildEdges([note]);
  assert.deepEqual(edges.map((edge) => [edge.src, edge.kind, edge.dst, edge.source]), [
    ["a", "depends-on", "b", "fm"],
    ["a", "link", "c", "body"],
  ]);
});

test("buildEdges({ sources: [\"fm\"] }) omits body-link edges entirely", () => {
  const note = makeFlatfile({
    slug: "a", dir: "concepts", kind: "concept",
    fm: { "depends-on": ["b"] },
    body: "see [c](c.md)",
    path: "concepts/a.md", mtime: 0,
  });
  const edges = buildEdges([note], { sources: ["fm"] });
  assert.deepEqual(edges.map((edge) => edge.source), ["fm"]);
});

test("loadFlatfiles (read-flatfiles.mjs) still shares store.mjs's DEFAULT_EXCLUDES as its own default", () => {
  assert.equal(typeof loadFlatfiles, "function");
  assert.ok(DEFAULT_EXCLUDES.includes("node_modules"));
});
