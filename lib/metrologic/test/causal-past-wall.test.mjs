import { test } from "node:test";
import assert from "node:assert/strict";
import { finitePastWallMetricOf as M, finitePastWallAngleOf as A } from "../src/articulation/predicating/positing/settling/analysis/causal-past-wall.mjs";

function checkOrder(precedence, n) {
  const relation = new Set(precedence.map(({ parent, child }) => parent + ":" + child));
  const metric = M({ pointCount: n, precedence });
  const pasts = Array.from({ length: n }, (_, i) =>
    new Set(Array.from({ length: n }, (_, j) => j)
      .filter(j => j === i || relation.has(j + ":" + i))));
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    const xor = [...new Set([...pasts[a], ...pasts[b]])]
      .filter(z => pasts[a].has(z) !== pasts[b].has(z)).length;
    assert.equal(metric.distanceCounts[a][b], xor);
    assert.equal(metric.distanceCounts[a][b], metric.distanceCounts[b][a]);
    assert.equal(metric.distanceCounts[a][b] === 0, a === b);
    for (let c = 0; c < n; c++) {
      assert.ok(metric.distanceCounts[a][c] <= metric.distanceCounts[a][b] + metric.distanceCounts[b][c]);
      if (relation.has(a + ":" + b) && relation.has(b + ":" + c))
        assert.equal(metric.distanceCounts[a][c], metric.distanceCounts[a][b] + metric.distanceCounts[b][c]);
    }
  }
  assert.deepEqual(metric.principalPastPointIndices, pasts.map(set => [...set]));
}

test("1,100 independently generated K(C) orders recover a positive definite wall metric and exact causal-chain additivity", () => {
  let count = 0;
  for (let n = 0; n <= 5; n++) {
    const possible = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) possible.push([a, b]);
    for (let mask = 0; mask < 2 ** possible.length; mask++) {
      const reach = Array.from({ length: n }, () => Array(n).fill(false));
      possible.forEach(([a, b], i) => { if (mask & (1 << i)) reach[a][b] = true; });
      for (let k = 0; k < n; k++) for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) reach[i][j] ||= reach[i][k] && reach[k][j];
      const diamonds = possible.filter(([a, b]) => reach[a][b]);
      const precedence = [];
      for (let a = 0; a < diamonds.length; a++) for (let b = a + 1; b < diamonds.length; b++)
        if (diamonds[a][1] === diamonds[b][0] || reach[diamonds[a][1]][diamonds[b][0]])
          precedence.push({ parent: a, child: b });
      checkOrder(precedence, diamonds.length);
      count++;
    }
  }
  assert.equal(count, 1100);
});

test("branching generated kinematic diamond retains its isolated long interval", () => {
  const metric = M({ pointCount: 5, precedence: [{ parent: 0, child: 3 }, { parent: 1, child: 4 }] });
  assert.deepEqual(metric.principalPastPointIndices, [[0], [1], [2], [0, 3], [1, 4]]);
  assert.equal(metric.distanceCounts[2][0], 2);
  assert.equal(metric.distanceCounts[2][3], 3);
});

test("exact dot and cosine are a specified cut-incidence shadow, not a physical metric", () => {
  const chain = { pointCount: 3, precedence: [{ parent: 0, child: 1 }, { parent: 0, child: 2 }, { parent: 1, child: 2 }] };
  const angle = A(chain, { vertex: 0, first: 1, second: 2 });
  assert.equal(angle.dotProduct, 1);
  assert.equal(angle.squaredFirstArm, 1);
  assert.equal(angle.squaredSecondArm, 2);
  assert.equal(angle.cosineSquaredNumerator, 1);
  assert.equal(angle.cosineSquaredDenominator, 2);
  assert.ok(Math.abs(angle.cosineApproximation - 1 / Math.sqrt(2)) < 1e-14);
  const right = A({ pointCount: 3, precedence: [{ parent: 0, child: 2 }] }, { vertex: 0, first: 1, second: 2 });
  assert.equal(right.cosineApproximation, 0);
  assert.throws(() => A(chain, { vertex: 0, first: 0, second: 1 }), /nonzero arms/);
});

test("refuse incomplete, inconsistent, and unbounded claimed orders", () => {
  assert.throws(() => M({ pointCount: 3, precedence: [{ parent: 0, child: 1 }, { parent: 1, child: 2 }] }), /not transitively closed/);
  assert.throws(() => M({ pointCount: 3, precedence: [{ parent: 1, child: 0 }] }), /topological/);
  assert.throws(() => M({ pointCount: 3, precedence: [{ parent: 0, child: 1 }, { parent: 0, child: 1 }] }), /duplicate/);
  assert.throws(() => M({ pointCount: 497, precedence: [] }), /0..496/);
  assert.throws(() => M({ pointCount: 0, precedence: [{ parent: 0, child: 0 }] }), /bounded strict/);
  assert.throws(() => A({ pointCount: 2, precedence: [] }, { vertex: 0, first: 1, second: 2 }), /unknown point/);
  assert.deepEqual(M({ pointCount: 0, precedence: [] }).distanceCounts, []);
});
