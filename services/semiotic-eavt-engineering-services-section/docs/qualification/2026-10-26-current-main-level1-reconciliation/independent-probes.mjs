/** Bounded independent reconciliation probes. Pass an exact source directory;
 * otherwise use this repository. Only disposable temporary roots are written. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';

const candidate = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../../..'));
const store = await import(pathToFileURL(path.join(candidate, 'src/store.mjs')));
const layout = await import(pathToFileURL(path.join(candidate, 'src/layout.mjs')));
const roots = [];
const root = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'seavt-union-review-'));
  roots.push(directory);
  return directory;
};
const cases = [];

try {
  for (const written of [0, 1]) {
    const r = root(), day = '2026-10-15', directory = layout.logsDirectory(r, 'claim-events');
    assert.equal(store.append(r, 'claim-events', { at: day + 'T00:00:00Z', body: 'x'.repeat(200000) }, { seal: false, maxBytes: 1048576 }), true);
    const original = fs.readFileSync(path.join(directory, day + '.jsonl'));
    const before = [...store.readLog(r, 'claim-events', day)];
    const open = fs.openSync, write = fs.writeSync, paths = new Map();
    let compressedWrites = 0;
    fs.openSync = (file, ...args) => {
      const descriptor = open(file, ...args);
      paths.set(descriptor, String(file));
      return descriptor;
    };
    fs.writeSync = (descriptor, bytes, ...args) => {
      if (paths.get(descriptor)?.endsWith('.jsonl.gz.partial') && ++compressedWrites === 2)
        return write(descriptor, bytes, 0, written);
      return write(descriptor, bytes, ...args);
    };
    syncBuiltinESMExports();
    try {
      assert.throws(() => store.sealLogs(r, 'claim-events', { before: '2026-10-16' }), error => error.code === 'short-write');
    } finally {
      fs.openSync = open;
      fs.writeSync = write;
      syncBuiltinESMExports();
    }
    assert.equal(compressedWrites, 2);
    assert.deepEqual(fs.readFileSync(path.join(directory, day + '.jsonl.sealing')), original);
    assert.equal(fs.readdirSync(directory).some(name => name.endsWith('.jsonl.gz') || name.endsWith('.partial')), false);
    assert.deepEqual([...store.readLog(r, 'claim-events', day)], before);
    assert.equal(store.sealLogs(r, 'claim-events', { before: '2026-10-16' }).length, 1);
    assert.deepEqual([...store.readLog(r, 'claim-events', day)], before);
    cases.push({ name: `second-block-${written}-byte-short-write`, passed: true, originalBytes: original.length, readableRows: before.length, retryExact: true });
  }

  const remote = root(), local = root(), predecessorSource = root();
  const missing = store.put(predecessorSource, 'channel-message', { text: 'missing', causes: [] });
  const reply = store.put(remote, 'ledger-entry', { amount: '17', causes: [{ type: 'channel-message', id: missing }] });
  store.writeHead(remote, 'ledger-entry', 'treasury', { frontier: [reply] });
  assert.deepEqual(await store.pull(local, store.directoryRemote(remote), 'ledger-entry'), { heads: 1, converged: 0, records: 0, truncated: true });
  assert.equal(store.readHead(local, 'ledger-entry', 'treasury'), undefined);
  store.put(remote, 'channel-message', { text: 'missing', causes: [] });
  assert.deepEqual(await store.pull(local, store.directoryRemote(remote), 'ledger-entry'), { heads: 1, converged: 1, records: 2, truncated: false });
  store.writeHead(remote, 'ledger-entry', 'treasury', { frontier: [reply], closed: true });
  assert.deepEqual(await store.pull(local, store.directoryRemote(remote), 'ledger-entry'), { heads: 1, converged: 1, records: 0, truncated: false });
  assert.equal(store.readHead(local, 'ledger-entry', 'treasury').closed, true);
  cases.push({ name: 'cross-type-missing-refusal-retry-and-closure', passed: true });

  const forgedRoot = root();
  const peer = {
    async *heads() { yield { name: 'forged', frontier: [reply] }; },
    get() { return { amount: 'counterfeit', causes: [] }; },
  };
  assert.deepEqual(await store.pull(forgedRoot, peer, 'ledger-entry'), { heads: 1, converged: 0, records: 0, truncated: true });
  assert.equal(store.readHead(forgedRoot, 'ledger-entry', 'forged'), undefined);
  cases.push({ name: 'forged-peer-refused', passed: true });

  const capRoot = root();
  let capReads = 0, refusals = 0;
  assert.equal(store.append(capRoot, 'ledger-events', { at: '2026-10-26T00:00:00Z', event: 'denied' }, {
    guard: { capOf() { capReads++; return 0; }, refuse() { refusals++; } }, seal: false,
  }), false);
  assert.equal(capReads, 1);
  assert.equal(refusals, 1);
  assert.equal([...store.readLog(capRoot, 'ledger-events', '2026-10-26')].length, 0);
  cases.push({ name: 'zero-cap-no-record-retained', passed: true });

  assert.equal(layout.checkDate('2024-02-29'), '2024-02-29');
  for (const invalid of ['2025-02-29', '2026-02-30'])
    assert.throws(() => layout.checkDate(invalid), error => error.code === 'log-date');
  cases.push({ name: 'calendar-valid-and-rollover-refusal', passed: true });

  console.log(JSON.stringify({ candidate, probes: cases.length, passed: cases.length, cases }));
} finally {
  for (const r of roots) fs.rmSync(r, { recursive: true, force: true });
}
