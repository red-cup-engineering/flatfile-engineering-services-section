import assert from "node:assert/strict";
import test from "node:test";

import { completeGraphChromatic, completeGraphWeights, countProperColorings, isProperColorAssignment, graphHomToCompletePalette, properColoring, chromaticNumber } from "../src/articulation/predicating/positing/settling/analysis/coloring.mjs";

test("graph runtime calculates a complete graph chromatic receipt", () => {
  const receipt = completeGraphChromatic(4);

  assert.equal(receipt.chromaticNumber, 4);
  assert.equal(receipt.requiresAllColours, true);
});

test("a reverse-directed local arc still constrains a proper graph factor", () => {
  const full = completeGraphWeights(2), zero = full[0][0], one = full[0][1];
  const reverse = [[zero, zero], [one, zero]];
  assert.equal(isProperColorAssignment(reverse, [0, 0]), false);
  const witness = properColoring(reverse, 2);
  assert.equal(witness.kind, "meme-analysis.coloring.proper:witness");
  assert.notEqual(witness.colors[0], witness.colors[1]);
  assert.equal(graphHomToCompletePalette(reverse, witness.colors), true);
  assert.equal(countProperColorings(reverse, 2), 2);
  assert.equal(chromaticNumber(reverse), 2);
});

test("64 directed three-vertex graph factors agree with an independent finite coloring census", () => {
  const full = completeGraphWeights(3), zero = full[0][0], one = full[0][1];
  const arcs = [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]];
  for (let mask = 0; mask < 64; mask += 1) {
    const weights = Array.from({ length: 3 }, () => [zero, zero, zero]);
    arcs.forEach(([i,j],bit) => { if (mask & (1 << bit)) weights[i][j] = one; });
    for (let k = 1; k <= 4; k += 1) {
      let expected = 0;
      for (let a = 0; a < k; a += 1)
        for (let b = 0; b < k; b += 1)
          for (let c = 0; c < k; c += 1) {
            const colors = [a,b,c];
            if (arcs.every(([i,j],bit) => !(mask & (1 << bit)) || colors[i] !== colors[j])) expected += 1;
          }
      assert.equal(countProperColorings(weights, k), expected, `mask ${mask}, colors ${k}`);
      const witness = properColoring(weights, k);
      assert.equal(witness.kind === "meme-analysis.coloring.proper:witness", expected > 0);
      if (expected > 0) assert.equal(isProperColorAssignment(weights, witness.colors), true);
    }
  }
});

test("self-loops cannot be certified as properly colorable", () => {
  const full = completeGraphWeights(2), loop = [[full[0][1]]];
  assert.equal(isProperColorAssignment(loop, [0]), false);
  assert.equal(graphHomToCompletePalette(loop, [0]), false);
  assert.equal(countProperColorings(loop, 4), 0);
  assert.equal(properColoring(loop, 4).kind, "meme-analysis.coloring.proper-obstruction");
  assert.throws(() => chromaticNumber(loop), /self-loop/);
});
