import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {bind, restore, treeDigest, bindOriginalArtifact} from '../scripts/first-cutover.mjs';

test('historical readers bind to the configured artifact, not the retained receipt', () => {
  const original = '/gnu/store/11111111111111111111111111111111-configured-deployment';
  const plan = {version: 1,
    oldStore: '@ORIGINAL_RELEASE@/packages/@red-cup-engineering__semiotic-eavt-services-section',
    oldActivitypub: '@ORIGINAL_RELEASE@/packages/@red-cup-engineering__activitypub-services-section',
    newStore: '/gnu/store/22222222222222222222222222222222-candidate/node_modules/current', bindings: []};
  const bound = bindOriginalArtifact(plan, original);
  assert.equal(bound.oldStore, original + '/packages/@red-cup-engineering__semiotic-eavt-services-section');
  assert.equal(bound.oldActivitypub, original + '/packages/@red-cup-engineering__activitypub-services-section');
  assert.equal(bound.newStore, plan.newStore);
  assert.equal(plan.oldStore.startsWith('@ORIGINAL_RELEASE@/'), true);
  assert.deepEqual(bindOriginalArtifact(plan, original), bound, 'recovery uses the same saved original');
  assert.throws(() => bindOriginalArtifact(plan, original + '/bin/node'), /one immutable Guix output/);
  assert.throws(() => bindOriginalArtifact(plan, original.replace('1111', 'eeee')), /one immutable Guix output/);
  assert.throws(() => bindOriginalArtifact({...plan, oldStore: '@ORIGINAL_RELEASE@/../another-reader'}, original), /escapes/);
  const historical = {...plan, oldStore: '/gnu/store/33333333333333333333333333333333-historical-world/packages/reader'};
  assert.equal(bindOriginalArtifact(historical, original).oldStore, historical.oldStore,
    'a separately declared historical source is not silently rebound');
});

function fixture(t, {count = 2, absent = false, queue = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'first-cutover-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const work = path.join(root, 'operation'); fs.mkdirSync(work, {mode: 0o700});
  const plan = {version: 1, bindings: []}, journal = {version: 1, plan, phase: 'prepared', sources: [], pendingDeliveries: [], bindings: []};
  for (let i = 0; i < count; i++) {
    const name = 'world-' + i, target = path.join(root, name), directory = path.join(work, name), candidate = path.join(directory, 'candidate');
    fs.mkdirSync(directory, {mode: 0o700}); fs.mkdirSync(candidate, {mode: 0o700});
    fs.writeFileSync(path.join(candidate, 'record'), 'native-' + i, {mode: 0o600});
    if (!absent) { fs.mkdirSync(target, {mode: 0o700}); fs.writeFileSync(path.join(target, 'record'), 'original-' + i, {mode: 0o600}); }
    plan.bindings.push({name, source: target, target});
    journal.bindings.push({name, target, candidate, retained: path.join(directory, 'original'), failed: path.join(directory, 'failed'), before: treeDigest(target), prepared: treeDigest(candidate), phase: 'prepared'});
    if (!absent) journal.sources.push({path: target, digest: treeDigest(target)});
  }
  if (queue) {
    const ready = path.join(root, 'ready'); fs.mkdirSync(ready, {mode: 0o700}); fs.writeFileSync(path.join(ready, 'message'), 'exact-message', {mode: 0o600});
    journal.pendingDeliveries.push({path: ready, digest: treeDigest(ready)});
  }
  const save = () => fs.writeFileSync(path.join(work, 'operation.json'), JSON.stringify(journal), {mode: 0o600}); save();
  return {root, plan, work, journal, save};
}
test('recovery refuses a different original artifact before moving state', t => {
  const f = fixture(t);
  const template = {...f.plan, oldStore: '@ORIGINAL_RELEASE@/packages/original-reader'};
  const first = bindOriginalArtifact(template, '/gnu/store/11111111111111111111111111111111-first');
  Object.assign(f.plan, first); f.save(); bind(f.plan, f.work);
  const other = bindOriginalArtifact(template, '/gnu/store/22222222222222222222222222222222-other');
  assert.throws(() => restore(other, f.work), /deep-equal/);
  for (const [i, row] of f.journal.bindings.entries()) {
    assert.equal(fs.readFileSync(path.join(row.target, 'record'), 'utf8'), 'native-' + i);
    assert.equal(fs.readFileSync(path.join(row.retained, 'record'), 'utf8'), 'original-' + i);
  }
});
test('bind and restore retain both actual state generations', t => {
  const f = fixture(t); assert.equal(bind(f.plan, f.work).phase, 'bound');
  assert.equal(restore(f.plan, f.work).phase, 'restored');
  for (const [i, row] of f.journal.bindings.entries()) {
    assert.equal(fs.readFileSync(path.join(row.target, 'record'), 'utf8'), 'original-' + i);
    assert.equal(fs.readFileSync(path.join(row.failed, 'record'), 'utf8'), 'native-' + i);
  }
  assert.equal(restore(f.plan, f.work).phase, 'untouched');
});
test('a new durable write refuses the entire rollback cohort', t => {
  const f = fixture(t); bind(f.plan, f.work);
  fs.writeFileSync(path.join(f.journal.bindings[1].target, 'new-record'), 'new work');
  assert.throws(() => restore(f.plan, f.work), /state changed/);
  assert.equal(fs.readFileSync(path.join(f.journal.bindings[0].target, 'record'), 'utf8'), 'native-0');
  assert.ok(fs.existsSync(f.journal.bindings[0].retained));
});
test('a consumed pending message refuses rollback without requeue', t => {
  const f = fixture(t, {queue: true}); bind(f.plan, f.work);
  fs.unlinkSync(path.join(f.journal.pendingDeliveries[0].path, 'message'));
  assert.throws(() => restore(f.plan, f.work), /state changed/);
  assert.ok(!fs.existsSync(path.join(f.journal.pendingDeliveries[0].path, 'message')));
  assert.equal(fs.readFileSync(path.join(f.journal.bindings[0].target, 'record'), 'utf8'), 'native-0');
});
test('an originally absent target returns to absence and keeps the candidate', t => {
  const f = fixture(t, {count: 1, absent: true}); bind(f.plan, f.work); restore(f.plan, f.work);
  const [row] = f.journal.bindings; assert.ok(!fs.existsSync(row.target)); assert.ok(fs.existsSync(row.failed));
});
for (const boundary of ['before-old-rename', 'after-old-rename', 'after-new-rename', 'after-failed-rename', 'after-original-restored']) {
  test('recover interruption ' + boundary + ' without losing state', t => {
    const f = fixture(t); const [row] = f.journal.bindings;
    f.journal.phase = boundary.startsWith('after-failed') || boundary === 'after-original-restored' ? 'restoring' : 'binding';
    row.phase = 'binding'; f.save();
    if (boundary !== 'before-old-rename') fs.renameSync(row.target, row.retained);
    if (['after-new-rename', 'after-failed-rename', 'after-original-restored'].includes(boundary)) fs.renameSync(row.candidate, row.target);
    if (['after-failed-rename', 'after-original-restored'].includes(boundary)) fs.renameSync(row.target, row.failed);
    if (boundary === 'after-original-restored') fs.renameSync(row.retained, row.target);
    assert.equal(restore(f.plan, f.work).phase, 'restored');
    for (const [i, binding] of f.journal.bindings.entries()) assert.equal(fs.readFileSync(path.join(binding.target, 'record'), 'utf8'), 'original-' + i);
  });
}
test('bind refuses source changes before any active rename', t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.journal.bindings[1].target, 'record'), 'new original');
  assert.throws(() => bind(f.plan, f.work), /state changed/);
  assert.ok(!fs.existsSync(f.journal.bindings[0].retained));
});
test('failed preparation resumes originals only after their bytes are checked', t => {
  const f = fixture(t); f.journal.phase = 'preparing'; f.save();
  assert.equal(restore(f.plan, f.work).phase, 'untouched');
  fs.writeFileSync(path.join(f.journal.bindings[0].target, 'record'), 'changed original');
  assert.throws(() => restore(f.plan, f.work), /state changed/);
});
test('linked and foreign entry kinds are not silently digested', t => {
  const f = fixture(t); fs.symlinkSync('record', path.join(f.journal.bindings[0].candidate, 'link'));
  assert.throws(() => treeDigest(f.journal.bindings[0].candidate), /linked/);
});
