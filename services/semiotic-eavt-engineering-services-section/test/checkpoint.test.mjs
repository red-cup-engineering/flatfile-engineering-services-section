import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {prepareNativeCheckpoint, verifyNativeCheckpoint} from '../src/checkpoint.mjs';
import {put, writeHead, each, readHead} from '../src/store.mjs';
import {recordFile} from '../src/layout.mjs';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-checkpoint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const source = path.join(root, 'source'), destination = path.join(root, 'destination');
  fs.mkdirSync(source); fs.mkdirSync(destination);
  const first = put(source, 'arrival', {value: 1, causes: []});
  const second = put(source, 'arrival', {value: 2, causes: [first]});
  const unheaded = put(source, 'arrival', {value: 3, causes: []});
  writeHead(source, 'arrival', 'main', {frontier: [second], at: '2026-10-15T00:00:00Z'});
  return {root, source, destination, first, second, unheaded, types: ['arrival'], quiescent: true};
}
const verify = f => verifyNativeCheckpoint({...f, checkpoint: f.destination});
test('CP-1..7: exact native round trip includes unheaded rows and original timestamp, excludes logs', t => {
  const f = fixture(t); fs.mkdirSync(path.join(f.source, 'data/logs')); fs.writeFileSync(path.join(f.source, 'data/logs/private'), 'excluded');
  const result = prepareNativeCheckpoint(f);
  assert.equal(result.captureIntegrity, true); assert.equal(result.causality.complete, true);
  assert.deepEqual(result.counts, {arrival: {records: 3, heads: 1}});
  assert.deepEqual([...each(f.destination, 'arrival')].map(x => x.address).sort(), [f.first, f.second, f.unheaded].sort());
  assert.equal(readHead(f.destination, 'arrival', 'main').at, '2026-10-15T00:00:00Z');
  assert.equal(fs.existsSync(path.join(f.destination, 'data/logs')), false);
  assert.deepEqual(verify(f), result); assert.deepEqual(verify(f), result);
});
test('CP-6: missing unheaded cause and external reference survive exact capture with distinct obligations', t => {
  const f = fixture(t), absent = 'ni:///sha-256;' + 'A'.repeat(43);
  put(f.source, 'arrival', {causes: [absent, {type: 'other', id: absent}]});
  const result = prepareNativeCheckpoint(f);
  assert.equal(result.captureIntegrity, true); assert.equal(result.causality.complete, false);
  assert.deepEqual(result.causality.missing, [{type: 'arrival', id: absent}]);
  assert.deepEqual(result.causality.external, [{type: 'other', id: absent}]);
  assert.equal(result.counts.arrival.records, 4);
});
test('CP-1,5,8: refuse missing quiescence, duplicate types, overlap and occupied destination', t => {
  const f = fixture(t);
  for (const delta of [{quiescent: false}, {types: ['arrival', 'arrival']}, {destination: f.source}]) assert.throws(() => prepareNativeCheckpoint({...f, ...delta}));
  fs.writeFileSync(path.join(f.destination, 'keep'), 'unchanged');
  assert.throws(() => prepareNativeCheckpoint(f), /destination must be empty/);
  assert.equal(fs.readFileSync(path.join(f.destination, 'keep'), 'utf8'), 'unchanged');
});
test('CP-3,5: malformed records and nonnative extra files refuse certification', t => {
  const f = fixture(t), file = recordFile(f.source, 'arrival', f.first);
  fs.appendFileSync(file, 'invalid\n');
  assert.throws(() => prepareNativeCheckpoint(f)); assert.deepEqual(fs.readdirSync(f.destination), []);
});
test('CP-5: extra selected file cannot silently disappear', t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.source, 'data/records/arrival-records', 'unexpected'), 'extra');
  assert.throws(() => prepareNativeCheckpoint(f), /paths or bytes differ/);
  assert.equal(fs.readFileSync(path.join(f.source, 'data/records/arrival-records', 'unexpected'), 'utf8'), 'extra');
});
test('CP-2: linked selected directory refused', t => {
  const f = fixture(t); fs.renameSync(path.join(f.source, 'data/records'), path.join(f.root, 'saved'));
  fs.symlinkSync(path.join(f.root, 'saved'), path.join(f.source, 'data/records'));
  assert.throws(() => prepareNativeCheckpoint(f), /real directory/);
});
test('CP-7: byte tampering and unrelated checkpoint files fail read-only verify', t => {
  const f = fixture(t); prepareNativeCheckpoint(f);
  fs.writeFileSync(path.join(f.destination, 'extra'), 'excluded'); assert.throws(() => verify(f), /unrelated/);
  fs.unlinkSync(path.join(f.destination, 'extra'));
  fs.appendFileSync(recordFile(f.destination, 'arrival', f.first), '\n'); assert.throws(() => verify(f), /paths or bytes differ/);
});
test('CP-1,3: explicitly declared empty native type is lawful', t => {
  const f = fixture(t); const result = prepareNativeCheckpoint({...f, types: ['empty']});
  assert.deepEqual(result.counts, {empty: {records: 0, heads: 0}}); assert.deepEqual(result.files, []);
});
test('CP-4: concurrent source change at native publication boundary refuses success', t => {
  const f = fixture(t), original = fs.writeSync; let changed = false;
  t.mock.method(fs, 'writeSync', (...args) => { const out = original(...args); if (!changed) { changed = true; writeHead(f.source, 'arrival', 'main', {frontier: [f.second], at: '2026-10-15T01:00:00Z'}); } return out; });
  syncBuiltinESMExports();
  try { assert.throws(() => prepareNativeCheckpoint(f), /source changed/); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(changed); assert.ok(fs.readdirSync(f.destination).length > 0);
});
test('CP-8: interrupted write retains original and partial destination, fresh retry succeeds', t => {
  const f = fixture(t), before = fs.readFileSync(recordFile(f.source, 'arrival', f.first)), original = fs.writeSync; let writes = 0;
  t.mock.method(fs, 'writeSync', (...args) => { if (++writes === 2) throw new Error('simulated interruption'); return original(...args); }); syncBuiltinESMExports();
  try { assert.throws(() => prepareNativeCheckpoint(f), /simulated interruption/); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(fs.readFileSync(recordFile(f.source, 'arrival', f.first)), before);
  assert.throws(() => verify(f), /paths or bytes differ/); assert.throws(() => prepareNativeCheckpoint(f), /destination must be empty/);
  const fresh = path.join(f.root, 'fresh'); fs.mkdirSync(fresh); assert.equal(prepareNativeCheckpoint({...f, destination: fresh}).captureIntegrity, true);
});
test('CP-8: uncertainty after head rename can be resolved by read-only verification', t => {
  const f = fixture(t), original = fs.renameSync;
  t.mock.method(fs, 'renameSync', (...args) => { original(...args); throw new Error('lost completion after rename'); }); syncBuiltinESMExports();
  try { assert.throws(() => prepareNativeCheckpoint(f), /lost completion/); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(verify(f).captureIntegrity, true);
  assert.throws(() => prepareNativeCheckpoint(f), /destination must be empty/);
});
test('CP-3: malformed head is refused before any publication', t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.source, 'data/state/arrival-state/main.json'), '{');
  assert.throws(() => prepareNativeCheckpoint(f)); assert.deepEqual(fs.readdirSync(f.destination), []);
});
test('CP-6: selected cross-type causes establish closure, missing frontier remains an obligation', t => {
  const f = fixture(t), other = put(f.source, 'other', {causes: []});
  put(f.source, 'arrival', {causes: [{type: 'other', id: other}]});
  const absent = 'ni:///sha-256;' + 'A'.repeat(43);
  writeHead(f.source, 'other', 'waiting', {frontier: [absent], at: '2026-10-15T00:00:00Z'});
  const result = prepareNativeCheckpoint({...f, types: ['arrival', 'other']});
  assert.deepEqual(result.causality.external, []); assert.deepEqual(result.causality.missing, [{type:'other', id:absent}]);
});
test('CP-2: selected file links refuse capture', t => {
  const f = fixture(t), file = recordFile(f.source, 'arrival', f.first), held = path.join(f.root, 'held');
  fs.renameSync(file, held); fs.symlinkSync(held, file);
  assert.throws(() => prepareNativeCheckpoint(f), /linked checkpoint/);
});
test('CP-4: oversized source refuses before unbounded content allocation or publication', t => {
  const f = fixture(t), file = recordFile(f.source, 'arrival', f.first);
  fs.truncateSync(file, 16 * 1024 * 1024 + 1);
  assert.throws(() => prepareNativeCheckpoint(f), /byte\/file limit/); assert.deepEqual(fs.readdirSync(f.destination), []);
});

test('CP-5: multiple records sharing a bucket preserve native line order exactly', t => {
  const f = fixture(t), seen = new Map(); let pair;
  for (let i = 0; i < 10000 && !pair; i++) {
    const record = {collisionCandidate: i, causes: []}, id = semanticId(record), file = recordFile(f.source, 'arrival', id);
    if (seen.has(file)) pair = [seen.get(file), record]; else seen.set(file, record);
  }
  assert.ok(pair, 'deterministic fixture must contain a shared bucket');
  const first = put(f.source, 'arrival', pair[0]); put(f.source, 'arrival', pair[1]);
  const expected = fs.readFileSync(recordFile(f.source, 'arrival', first));
  prepareNativeCheckpoint(f);
  assert.deepEqual(fs.readFileSync(recordFile(f.destination, 'arrival', first)), expected);
});
