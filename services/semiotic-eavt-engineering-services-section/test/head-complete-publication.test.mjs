import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { readHead, writeHead } from '../src/store-core.mjs';
import { headFile } from '../src/layout.mjs';

const store = new URL('../src/store-core.mjs', import.meta.url).href;
const id = value => 'ni:///sha-256;' + createHash('sha256').update(value).digest('base64url');
const old = { frontier: [id('old')], at: '2026-10-17T00:00:00.000Z' };
const next = { frontier: Array.from({ length: 1400 }, (_, i) => id(String(i))).sort(), at: '2026-10-17T00:00:01.000Z', closed: true };
const workerSource = String.raw`
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const { parentPort, workerData: d } = require('node:worker_threads');
const path = require('node:path');
const original = { openSync: fs.openSync, closeSync: fs.closeSync, writeSync: fs.writeSync, writeFileSync: fs.writeFileSync, fsyncSync: fs.fsyncSync, renameSync: fs.renameSync };
const temporaryDescriptors = new Set();
let published = false, partialWrites = 0;
fs.openSync = (file, flags, ...rest) => {
  const fd = original.openSync(file, flags, ...rest);
  if (typeof file === 'string' && path.dirname(file) === path.dirname(d.file) && file.endsWith('.tmp')) temporaryDescriptors.add(fd);
  return fd;
};
fs.closeSync = fd => { temporaryDescriptors.delete(fd); return original.closeSync(fd); };
const fragment = (fd, data) => {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  partialWrites++;
  return original.writeSync(fd, bytes.subarray(0, 65536));
};
fs.writeSync = (fd, data, ...rest) => {
  if (temporaryDescriptors.has(fd) && ['short-write', 'write-error'].includes(d.action)) {
    const written = fragment(fd, data);
    if (d.action === 'write-error') throw Object.assign(new Error('injected full filesystem'), { code: 'ENOSPC' });
    return written;
  }
  return original.writeSync(fd, data, ...rest);
};
// The file owner's complete write either finishes or throws. Inject its
// failure after a real fragment; never pretend a partial writeFile is success.
fs.writeFileSync = (fd, data, ...rest) => {
  if (temporaryDescriptors.has(fd) && d.action === 'write-error') {
    fragment(fd, data);
    throw Object.assign(new Error('injected full filesystem'), { code: 'ENOSPC' });
  }
  return original.writeFileSync(fd, data, ...rest);
};
fs.fsyncSync = fd => {
  if ((d.action === 'sync-error' && temporaryDescriptors.has(fd)) || (d.action === 'post-rename-error' && published))
    throw Object.assign(new Error('injected sync failure'), { code: 'EIO' });
  return original.fsyncSync(fd);
};
fs.renameSync = (from, to, ...rest) => {
  const result = original.renameSync(from, to, ...rest);
  if (to === d.file) published = true;
  return result;
};
syncBuiltinESMExports();
(async () => {
  let result;
  try {
    const { writeHead, extend } = await import(d.store);
    const options = d.strict ? { durableRoot: d.root } : {};
    if (d.extend) extend(d.root, 'arrival', '2026-10-17', { at: d.head.at, event: 'next' }, { ...options, causes: [] });
    else writeHead(d.root, 'arrival', '2026-10-17', d.head, { ...options, ...(d.expect === undefined ? {} : { expect: d.expect }) });
    result = { result: 'written' };
  } catch (error) { result = { result: 'refused', code: error.code, message: error.message }; }
  let readError;
  try { JSON.parse(fs.readFileSync(d.file, 'utf8')); } catch (error) { readError = error.message; }
  parentPort.postMessage({ ...result, partialWrites, readError });
})();
`;
function environment(t, head = old) {
  const root = mkdtempSync(join(tmpdir(), 'seavt-complete-head-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeHead(root, 'arrival', '2026-10-17', head);
  return { root, file: headFile(root, 'arrival', '2026-10-17') };
}
function run(t, env, options = {}) {
  const worker = new Worker(workerSource, { eval: true, workerData: { ...env, store, head: next, ...options } });
  t.after(() => worker.terminate());
  return new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => { if (code !== 0) reject(new Error('worker exited ' + code)); });
  });
}
for (const strict of [false, true]) {
  const label = strict ? 'strict' : 'ordinary';
  test(`${label}: replacement publishes the complete frontier beyond one I/O chunk`, async t => {
    const env = environment(t);
    const result = await run(t, env, { strict, action: 'short-write', expect: old.frontier });
    assert.equal(result.result, 'written');
    assert.equal(result.readError, undefined, JSON.stringify(result));
    assert.deepEqual(readHead(env.root, 'arrival', '2026-10-17'), { name: '2026-10-17', ...next });
    assert.ok(statSync(env.file).size > 65536);
  });
  for (const action of ['write-error', 'sync-error']) {
    test(`${label}: ${action} before publication preserves the exact old head`, async t => {
      const env = environment(t), before = readFileSync(env.file);
      const result = await run(t, env, { strict, action });
      assert.equal(result.result, 'refused');
      assert.equal(result.code, action === 'write-error' ? 'ENOSPC' : 'EIO');
      assert.deepEqual(readFileSync(env.file), before);
      assert.deepEqual(readdirSync(dirname(env.file)), ['2026-10-17.json']);
    });
  }
  test(`${label}: failure after rename retains the complete but uncertain new head`, async t => {
    const env = environment(t);
    const result = await run(t, env, { strict, action: 'post-rename-error' });
    assert.equal(result.result, 'refused');
    assert.equal(result.code, 'EIO');
    assert.deepEqual(readHead(env.root, 'arrival', '2026-10-17'), { name: '2026-10-17', ...next });
  });
  test(`${label}: arrival-style extension keeps all independent frontier members`, async t => {
    const env = environment(t, next);
    const result = await run(t, env, { strict, action: 'short-write', extend: true });
    assert.equal(result.result, 'written');
    assert.equal(result.readError, undefined, JSON.stringify(result));
    const received = readHead(env.root, 'arrival', '2026-10-17');
    assert.equal(received.frontier.length, next.frontier.length + 1);
    assert.ok(next.frontier.every(address => received.frontier.includes(address)));
  });
}
test('expected-frontier conflict does not publish or change the old head', async t => {
  const env = environment(t), before = readFileSync(env.file);
  const result = await run(t, env, { action: 'short-write', expect: next.frontier });
  assert.equal(result.code, 'head-conflict');
  assert.equal(result.partialWrites, 0);
  assert.deepEqual(readFileSync(env.file), before);
});
test('ordinary replacement preserves Unicode head names and original umask-derived mode', t => {
  const env = environment(t), name = '雪 café/arrival', beforeMask = process.umask(0o077);
  try {
    writeHead(env.root, 'arrival', name, old);
    writeHead(env.root, 'arrival', name, next, { expect: old.frontier });
  } finally { process.umask(beforeMask); }
  assert.deepEqual(readHead(env.root, 'arrival', name), { name, ...next });
  assert.equal(statSync(headFile(env.root, 'arrival', name)).mode & 0o777, 0o600);
});
