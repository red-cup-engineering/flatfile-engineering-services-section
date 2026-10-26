import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { readHead, writeHead } from '../src/store-core.mjs';
import { headFile } from '../src/layout.mjs';

const store = new URL('../src/store-core.mjs', import.meta.url).href;
const id = (value) => 'ni:///sha-256;' + createHash('sha256').update(value).digest('base64url');
const first = { frontier: [id('first')], at: '2026-10-17T00:00:00.000Z', closed: true };
const second = { frontier: [id('second')], at: '2026-10-17T00:00:01.000Z' };
const workerSource = String.raw`
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const { parentPort, workerData: d } = require('node:worker_threads');
const gate = new Int32Array(d.gate);
let published = false;
const original = { linkSync: fs.linkSync, renameSync: fs.renameSync, openSync: fs.openSync, fsyncSync: fs.fsyncSync };
for (const operation of ['linkSync', 'renameSync']) {
  fs[operation] = (from, to, ...rest) => {
    if (to === d.file) {
      if (d.action === 'pause') {
        parentPort.postMessage({ phase: 'paused' });
        if (Atomics.wait(gate, 0, 0, 10000) === 'timed-out') throw new Error('test publication barrier timed out');
      }
      if (d.action === 'malformed') fs.writeFileSync(to, 'not a head');
      if (d.action === 'redirect') {
        fs.writeFileSync(to + '.other', JSON.stringify({ frontier: [] }));
        fs.symlinkSync(to + '.other', to);
      }
    }
    const result = original[operation](from, to, ...rest);
    if (to === d.file) published = true;
    return result;
  };
}
fs.openSync = (path, flags, ...rest) => {
  if (d.action === 'temporary-exists' && typeof path === 'string' && path.endsWith('.tmp'))
    throw Object.assign(new Error('temporary collision'), { code: 'EEXIST' });
  return original.openSync(path, flags, ...rest);
};
fs.fsyncSync = (...args) => {
  if (d.action === 'post-link-error' && published)
    throw Object.assign(new Error('uncertain directory sync'), { code: 'EIO' });
  return original.fsyncSync(...args);
};
syncBuiltinESMExports();
(async () => {
  try {
    const { writeHead } = await import(d.store);
    writeHead(d.root, 'package-publish-receipt', 'claim', d.head, { expect: null, ...(d.strict ? { durableRoot: d.root } : {}) });
    parentPort.postMessage({ result: 'created' });
  } catch (error) { parentPort.postMessage({ result: 'refused', name: error.name, code: error.code, message: error.message }); }
})();
`;
function environment(t) {
  const root = mkdtempSync(join(tmpdir(), 'seavt-absent-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, file: headFile(root, 'package-publish-receipt', 'claim') };
}
function run(t, environment, strict, head, action) {
  const gate = new SharedArrayBuffer(4);
  const worker = new Worker(workerSource, { eval: true, workerData: { ...environment, store, strict, head, action, gate } });
  t.after(() => worker.terminate());
  let notifyPaused;
  const paused = new Promise(resolve => { notifyPaused = resolve; });
  const result = new Promise((resolve, reject) => {
    worker.on('message', message => { if (message.phase === 'paused') notifyPaused(); else resolve(message); });
    worker.on('error', reject);
    worker.on('exit', code => { if (code !== 0) reject(new Error('worker exited ' + code)); });
  });
  return { paused, result, resume() { Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0); } };
}
for (const strict of [false, true]) {
  const label = strict ? 'strict' : 'ordinary';
  test(`${label}: paused absent writer cannot replace another initial claim`, { timeout: 15000 }, async t => {
    const env = environment(t);
    const a = run(t, env, strict, first, 'pause');
    await a.paused;
    // Explicit replay input: expire the test lock without a real 30-second wait.
    const past = new Date(Date.now() - 60000);
    utimesSync(env.file + '.lock', past, past);
    const b = await run(t, env, strict, second).result;
    assert.equal(b.result, 'created');
    a.resume();
    const rejected = await a.result;
    assert.equal(rejected.code, 'head-conflict');
    assert.deepEqual(readHead(env.root, 'package-publish-receipt', 'claim'), { name: 'claim', ...second });
  });
  test(`${label}: duplicate initial claim refuses, including identical bytes`, async t => {
    const env = environment(t);
    assert.equal((await run(t, env, strict, first).result).result, 'created');
    assert.equal((await run(t, env, strict, first).result).code, 'head-conflict');
    assert.deepEqual(readHead(env.root, 'package-publish-receipt', 'claim'), { name: 'claim', ...first });
  });
  test(`${label}: temporary EEXIST without a destination is not HeadConflict`, async t => {
    const env = environment(t);
    const result = await run(t, env, strict, first, 'temporary-exists').result;
    assert.equal(result.code, 'EEXIST');
    assert.equal(readHead(env.root, 'package-publish-receipt', 'claim'), undefined);
  });
  test(`${label}: post-link failure refuses while retaining the uncertain claim`, async t => {
    const env = environment(t);
    const result = await run(t, env, strict, first, 'post-link-error').result;
    assert.equal(result.code, 'EIO');
    assert.deepEqual(readHead(env.root, 'package-publish-receipt', 'claim'), { name: 'claim', ...first });
    assert.equal((await run(t, env, strict, first).result).code, 'head-conflict');
  });
  for (const action of ['malformed', 'redirect']) {
    test(`${label}: ${action} destination appearing at publication remains refused`, async t => {
      const env = environment(t);
      const result = await run(t, env, strict, first, action).result;
      assert.equal(result.result, 'refused');
      assert.notEqual(result.code, 'head-conflict');
    });
  }
}
test('expected-frontier replacement and no-check replacement retain their contracts', t => {
  const env = environment(t);
  writeHead(env.root, 'package-publish-receipt', 'claim', first, { expect: null });
  writeHead(env.root, 'package-publish-receipt', 'claim', second, { expect: first.frontier });
  assert.deepEqual(readHead(env.root, 'package-publish-receipt', 'claim'), { name: 'claim', ...second });
  writeHead(env.root, 'package-publish-receipt', 'claim', first);
  assert.deepEqual(readHead(env.root, 'package-publish-receipt', 'claim'), { name: 'claim', ...first });
});
