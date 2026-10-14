import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {extend} from '../src/store.mjs';
import {recordFile} from '../src/layout.mjs';
import {checkCurrentState} from '../scripts/check-current-state.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'current-state-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const plan = {version: 1, oldStore: '/nonexistent/historical-provider', bindings: [{name: 'world', target: root, conversion: 'world', types: ['claim-session']}]};
  return {root, plan};
}
test('empty native types are usable but never proof of a historical transfer', async t => {
  const f = fixture(t); f.plan.bindings[0].conversion = 'activitypub';
  f.plan.bindings[0].types = ['activitypub-inbox', 'activitypub-outbox', 'activitypub-follower'];
  const result = await checkCurrentState(f.plan);
  assert.equal(result.currentStateUsable, true); assert.equal(result.historicalTransferProven, false);
  for (const counts of Object.values(result.bindings[0].types)) assert.deepEqual(counts, {records: 0, heads: 0});
});
test('an absent target is not silently created by validation', async t => {
  const f = fixture(t); f.plan.bindings[0].target = path.join(f.root, 'absent');
  await assert.rejects(checkCurrentState(f.plan)); assert.ok(!fs.existsSync(f.plan.bindings[0].target));
});
test('current native records and heads need no historical provider or conversion journal', async t => {
  const f = fixture(t); extend(f.root, 'claim-session', 'current-session', {thread: 'current-session', work: 'retained'});
  const result = await checkCurrentState(f.plan);
  assert.equal(result.currentStateUsable, true); assert.equal(result.historicalTransferProven, false);
  assert.deepEqual(result.bindings[0].types['claim-session'], {records: 1, heads: 1});
});
test('a missing causal record prevents current-state acceptance', async t => {
  const f = fixture(t); const address = extend(f.root, 'claim-session', 'current-session', {thread: 'current-session', work: 'retained'});
  fs.unlinkSync(recordFile(f.root, 'claim-session', address));
  await assert.rejects(checkCurrentState(f.plan));
});
test('malformed appended native rows cannot hide behind a good record prefix', async t => {
  const f = fixture(t); const address = extend(f.root, 'claim-session', 'current-session', {thread: 'current-session', work: 'retained'});
  fs.appendFileSync(recordFile(f.root, 'claim-session', address), '{malformed}\n');
  await assert.rejects(checkCurrentState(f.plan));
});
test('a legacy layout is refused even when valid current records also exist', async t => {
  const f = fixture(t); extend(f.root, 'claim-session', 'current-session', {thread: 'current-session', work: 'retained'});
  fs.mkdirSync(path.join(f.root, 'data/journals'), {recursive: true});
  await assert.rejects(checkCurrentState(f.plan), /earlier store layout/);
});
