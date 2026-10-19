import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedNatural, elapsedTicks } from '../src/simulation/discrete-clock.mjs';

test('fractional ticks carry forward without minting fractional units', () => {
  let t = elapsedTicks(1000, 2499);
  assert.deepEqual(t, {ticks:1,accountedMs:1000,nextMs:2000,discardedMs:0});
  t = elapsedTicks(t.nextMs, 3000);
  assert.deepEqual(t, {ticks:1,accountedMs:1000,nextMs:3000,discardedMs:0});
});
test('capped offline time discards history once and does not replay it', () => {
  let t = elapsedTicks(0, 7200000, {maxElapsedMs:3600000});
  assert.equal(t.ticks, 3600);
  assert.equal(t.discardedMs, 3600000);
  assert.equal(t.nextMs, 7200000);
  assert.equal(elapsedTicks(t.nextMs, 7200000).ticks, 0);
});
test('clock regression and zero interval do not advance observation', () => {
  assert.deepEqual(elapsedTicks(10000, 9000), {ticks:0,accountedMs:0,nextMs:10000,discardedMs:0});
  assert.equal(elapsedTicks(1234,1234).ticks, 0);
});
test('caller can specify alternate exact discrete quantum', () => {
  assert.deepEqual(elapsedTicks(0,240,{tickMs:60,maxElapsedMs:240}),
    {ticks:4,accountedMs:240,nextMs:240,discardedMs:0});
});
test('invalid numbers, periods and caps refuse', () => {
  for (const x of [-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1,NaN]) {
    assert.throws(() => boundedNatural(x), RangeError);
    assert.throws(() => elapsedTicks(x,5), RangeError);
  }
  assert.throws(()=>elapsedTicks(0,1000,{tickMs:0}),RangeError);
  assert.throws(()=>elapsedTicks(0,1000,{tickMs:1001,maxElapsedMs:1000}),RangeError);
});
