// Independent receiving cases frozen before implementation inspection.
// Original case SHA256: 37929390cdf5985657767f2d926fdf17e87be1edc21f3e2765571462dd5dbed1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateFairSharedSources, capacityUpgradeResponse } from '../src/obstruction/capacity-flow.mjs';

const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
function fraction(actual, numerator, denominator = 1n) {
  numerator = BigInt(numerator); denominator = BigInt(denominator);
  const divisor = gcd(numerator, denominator);
  assert.deepEqual(actual, { numerator: String(numerator / divisor), denominator: String(denominator / divisor) });
}
function amounts(result) {
  return Object.fromEntries(result.routes.map(route => [route.id, route.allocated]));
}
function feasible(input, result) {
  const routes = new Map(result.routes.map(route => [route.id, route]));
  assert.equal(routes.size, input.routes.length);
  let total = 0n;
  for (const route of input.routes) {
    const actual = routes.get(route.id);
    assert.ok(actual);
    const allocated = BigInt(actual.allocated);
    assert.ok(allocated >= 0n && allocated <= BigInt(route.demand));
    total += allocated;
  }
  assert.equal(total, BigInt(result.totalAllocated));
  for (const source of input.sources) {
    const used = input.routes.filter(route => route.uses.includes(source.id))
      .reduce((sum, route) => sum + BigInt(routes.get(route.id).allocated), 0n);
    assert.ok(used <= BigInt(source.capacity), `${source.id} is over capacity`);
  }
  assert.equal(result.fairness.integerRoundOptimal, true);
  assert.equal(result.fairness.searchTruncated, false);
  return routes;
}
function asymmetric(scale = 1n) {
  return {
    unit: 'atom',
    sources: [{ id: 'A', capacity: String(7n * scale) }, { id: 'B', capacity: String(5n * scale) }],
    routes: [
      { id: 'p', demand: String(6n * scale), uses: ['A'] },
      { id: 'q', demand: String(9n * scale), uses: ['A', 'B'] },
      { id: 'r', demand: String(3n * scale), uses: ['B'] },
    ],
  };
}
function shared() {
  return {
    unit: 'atom', sources: [{ id: 'A', capacity: '3' }, { id: 'B', capacity: '3' }],
    routes: [
      { id: 'p', demand: '10', uses: ['A', 'B'] },
      { id: 'q', demand: '10', uses: ['A'] },
      { id: 'r', demand: '10', uses: ['B'] },
    ],
  };
}

test('separate bottlenecks retain the independently derived weighted ideal and unique whole-atom optimum', () => {
  const input = asymmetric(); const result = allocateFairSharedSources(input); const routes = feasible(input, result);
  fraction(routes.get('p').idealAtoms, 13n, 4n);
  fraction(routes.get('q').idealAtoms, 15n, 4n);
  fraction(routes.get('r').idealAtoms, 5n, 4n);
  assert.deepEqual(amounts(result), { p: '4', q: '3', r: '2' });
  assert.equal(result.totalAllocated, '9');
});

test('permuting source, route, and shared-source order retains the unique optimum by original identity', () => {
  const input = asymmetric(); input.sources.reverse(); input.routes.reverse(); input.routes[1].uses.reverse();
  const result = allocateFairSharedSources(input); const routes = feasible(input, result);
  assert.deepEqual(amounts(result), { p: '4', q: '3', r: '2' });
  fraction(routes.get('p').idealAtoms, 13n, 4n);
  fraction(routes.get('q').idealAtoms, 15n, 4n);
  fraction(routes.get('r').idealAtoms, 5n, 4n);
});

test('selective freezing and rounding remain exact beyond binary-float integer precision', () => {
  const n = 9007199254740993n; const input = asymmetric(n);
  const result = allocateFairSharedSources(input); const routes = feasible(input, result);
  fraction(routes.get('p').idealAtoms, 13n * n, 4n);
  fraction(routes.get('q').idealAtoms, 15n * n, 4n);
  fraction(routes.get('r').idealAtoms, 5n * n, 4n);
  assert.deepEqual(amounts(result), { p: String((13n * n + 3n) / 4n), q: String((15n * n - 3n) / 4n), r: String((5n * n + 3n) / 4n) });
  assert.equal(result.totalAllocated, String((33n * n + 3n) / 4n));
});

test('whole-atom optimization stays inside the fair ideal floor/ceiling box', () => {
  const input = shared(); const result = allocateFairSharedSources(input); const routes = feasible(input, result);
  for (const route of routes.values()) fraction(route.idealAtoms, 3n, 2n);
  assert.deepEqual(amounts(result), { p: '1', q: '2', r: '2' });
  assert.equal(result.totalAllocated, '5');
  assert.notEqual(result.totalAllocated, '6', 'unrestricted throughput would violate the stated floor/ceiling policy');
});

test('rounded capacity response retains a negative mixed difference at the shared bottleneck', () => {
  const result = capacityUpgradeResponse({ ...shared(), probeSourceIds: ['A', 'B'], increment: '1' });
  assert.equal(result.baselineAllocatedAtoms, '5');
  assert.deepEqual(Object.fromEntries(result.firstDifferences.map(row => [row.sourceId, row.marginalGainAtoms])), { A: '1', B: '1' });
  for (const row of result.firstDifferences) { assert.equal(row.previousAtoms, '5'); assert.equal(row.nextAtoms, '6'); }
  assert.equal(result.secondDifferences.length, 1);
  assert.equal(result.secondDifferences[0].combinedAllocatedAtoms, '6');
  assert.equal(result.secondDifferences[0].mixedDifferenceAtoms, '-1');
  assert.deepEqual(new Set(result.secondDifferences[0].sourceIds), new Set(['A', 'B']));
  assert.equal(result.allIntegerRoundingsOptimal, true);
});

test('an unused source cannot create a route or a marginal gain', () => {
  const input = asymmetric(); input.sources.push({ id: 'U', capacity: '0' });
  const plan = allocateFairSharedSources(input); feasible(input, plan);
  assert.deepEqual(amounts(plan), { p: '4', q: '3', r: '2' });
  const result = capacityUpgradeResponse({ ...input, probeSourceIds: ['U'], increment: '9007199254740993' });
  assert.equal(result.baselineAllocatedAtoms, '9');
  assert.equal(result.firstDifferences.length, 1);
  assert.equal(result.firstDifferences[0].nextAtoms, '9');
  assert.equal(result.firstDifferences[0].marginalGainAtoms, '0');
});

test('zero capacity and zero demand preserve feasibility without occupying a disjoint available source', () => {
  const input = {
    unit: 'atom', sources: [{ id: 'A', capacity: '0' }, { id: 'B', capacity: '4' }],
    routes: [
      { id: 'p', demand: '7', uses: ['A'] }, { id: 'q', demand: '3', uses: ['B'] },
      { id: 'r', demand: '0', uses: ['A', 'B'] },
    ],
  };
  const result = allocateFairSharedSources(input); const routes = feasible(input, result);
  assert.deepEqual(amounts(result), { p: '0', q: '3', r: '0' });
  fraction(routes.get('p').idealAtoms, 0n); fraction(routes.get('q').idealAtoms, 3n); fraction(routes.get('r').idealAtoms, 0n);
  assert.equal(result.totalAllocated, '3');
});
