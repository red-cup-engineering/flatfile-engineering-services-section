import assert from "node:assert/strict";
import test from "node:test";
import { completeGraphWeights } from "../src/articulation/predicating/positing/settling/analysis/coloring.mjs";
import { buildTile, cliqueAdjacency } from "../src/models/tiling/tile.mjs";

const coordination = { rank: 0, vanishing: true };

test("finite local tile graph receives reversed arcs as actual coloring constraints", () => {
  const full = completeGraphWeights(2), zero = full[0][0], one = full[0][1];
  const reverse = [[zero, zero], [one, zero]];
  const tile = buildTile({ cells: ["a", "b"], adjacency: reverse, readings: { a: "potential", b: "potential" } }, coordination);
  assert.equal(tile.kappa.status, "proper");
  assert.equal(tile.kappa.refined, true);
  assert.notEqual(tile.kappa.readings.a, tile.kappa.readings.b);
  assert.equal(tile.h.properColoringCount, 12);
  assert.equal(tile.h.isolatedCells, 0);
  assert.equal(tile.delta.status, "omitted", "finite coloring is not Wang aperiodicity or diffraction");
});

test("invalid local-rule incidence refuses rather than inventing a tiling certificate", () => {
  const full = completeGraphWeights(2), zero = full[0][0], one = full[0][1];
  assert.throws(() => buildTile({ cells: ["a", "b"], adjacency: [[zero], [zero,zero]], readings: {a:"absurd",b:"absurd"} },coordination), /square/);
  assert.throws(() => buildTile({ cells: ["a","b"], adjacency: [[one,zero],[zero,zero]], readings: {a:"absurd",b:"absurd"} },coordination), /self-loop/);
  assert.throws(() => buildTile({ cells: ["a","a"], adjacency: [[zero,zero],[zero,zero]], readings: {a:"absurd"} },coordination), /distinct/);
  assert.throws(() => cliqueAdjacency(["a","b"], [["a","missing"]]), /unknown cell/);
  assert.throws(() => cliqueAdjacency(["a","a"], []), /distinct/);
  assert.deepEqual(cliqueAdjacency(["a","b"], [["a","b"]]), [[zero,one],[one,zero]]);
});

test("tile count refuses unsafe numeric precision instead of manufacturing an exact entropy witness", () => {
  const cells = Array.from({ length: 27 }, (_, i) => `cell-${i}`);
  assert.throws(() => buildTile({
    cells, adjacency: cliqueAdjacency(cells, []),
    readings: Object.fromEntries(cells.map(c => [c, "absurd"])),
  }, coordination), /exact safe integer range/);
});
