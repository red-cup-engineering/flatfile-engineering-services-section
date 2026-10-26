/** Bounded native checkpoints. See specifications/native-checkpoint.md.
 * Caller owns quiescence/exclusion. Inventories detect change, not ABA or locking.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {each, heads, get, put, writeHead, referenceOf} from './store.mjs';
import {checkRoot, checkTypeName, recordsDirectory, stateDirectory, StoreError} from './layout.mjs';

const MAX_BYTES = 16 * 1024 * 1024, MAX_FILES = 8192, MAX_ITEMS = 10000;
function requireThat(ok, code, message) { if (!ok) throw new StoreError(`checkpoint-${code}`, message); }
function directory(root) {
  requireThat(typeof root === 'string' && path.isAbsolute(root) && path.normalize(root) === root, 'root', 'canonical absolute root required');
  for (let p = root;; p = path.dirname(p)) {
    const stat = fs.lstatSync(p);
    requireThat(stat.isDirectory() && !stat.isSymbolicLink(), 'root', 'root ancestry must be real directories');
    if (p === path.dirname(p)) break;
  }
  requireThat(fs.statSync(root).uid === process.getuid(), 'root', 'owned root required');
  checkRoot(root);
}
function inputs(source, target, types, quiescent) {
  requireThat(quiescent === true, 'quiescence', 'caller must hold source and destination quiescent for the whole operation');
  requireThat(Array.isArray(types) && types.length > 0 && types.length <= 32 && new Set(types).size === types.length, 'types', 'declare 1 to 32 unique native types');
  types.forEach(checkTypeName); directory(source); directory(target);
  requireThat(source !== target && !source.startsWith(target + path.sep) && !target.startsWith(source + path.sep), 'overlap', 'source and destination must be disjoint');
  return [...types].sort();
}
function children(p) { try { return fs.readdirSync(p).sort(); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
function envelope(root, types) {
  for (const name of children(root)) requireThat(name === 'data', 'scope', 'checkpoint contains unrelated root data');
  for (const name of children(path.join(root, 'data'))) requireThat(['records', 'state'].includes(name), 'scope', 'checkpoint contains an excluded tier');
  for (const [tier, directoryOf] of [['records', recordsDirectory], ['state', stateDirectory]]) {
    const admitted = new Set(types.map(type => path.basename(directoryOf(root, type))));
    for (const name of children(path.join(root, 'data', tier))) requireThat(admitted.has(name), 'scope', 'checkpoint contains an undeclared type');
  }
}
function inventory(root, types, checkpoint = false) {
  const files = []; let bytes = 0, entries = 0;
  function visit(file, depth) {
    requireThat(++entries <= MAX_FILES * 2 && depth <= 8, 'limit', 'checkpoint entry/depth limit exceeded');
    let stat; try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    requireThat(!stat.isSymbolicLink(), 'link', 'linked checkpoint path refused');
    if (stat.isDirectory()) { for (const name of children(file)) visit(path.join(file, name), depth + 1); return; }
    requireThat(stat.isFile() && stat.nlink === 1, 'file', 'regular singly-linked native file required');
    bytes += stat.size;
    requireThat(bytes <= MAX_BYTES && files.length < MAX_FILES, 'limit', 'checkpoint byte/file limit exceeded');
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    let content;
    try {
      const observed = fs.fstatSync(fd);
      requireThat(observed.isFile() && observed.ino === stat.ino && observed.dev === stat.dev && observed.size === stat.size, 'changed', 'file changed during inventory');
      content = Buffer.alloc(stat.size + 1);
      let read = 0, n;
      while (read < content.length && (n = fs.readSync(fd, content, read, content.length - read, null)) > 0) read += n;
      content = content.subarray(0, read);
      requireThat(content.length === stat.size, 'changed', 'file size changed during inventory');
    } finally { fs.closeSync(fd); }
    files.push({path: path.relative(root, file), bytes: content.length, sha256: createHash('sha256').update(content).digest('hex')});
  }
  // Check parents too; native paths may not hide a linked data/tier ancestor.
  for (const parent of ['data', 'data/records', 'data/state']) {
    try { const s = fs.lstatSync(path.join(root, parent)); requireThat(s.isDirectory() && !s.isSymbolicLink(), 'link', 'native tier must be a real directory'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (checkpoint) envelope(root, types);
  for (const type of types) { visit(recordsDirectory(root, type), 0); visit(stateDirectory(root, type), 0); }
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function same(a, b, message) { requireThat(JSON.stringify(a) === JSON.stringify(b), 'changed', message); }
function inspect(root, types) {
  let items = 0; const counts = {}, missing = new Map(), external = new Map();
  function reference(entry, type) {
    requireThat(++items <= MAX_ITEMS, 'limit', 'checkpoint record/head/reference limit exceeded');
    const ref = referenceOf(entry, type), key = `${ref.type} ${ref.id}`;
    if (!types.includes(ref.type)) external.set(key, ref);
    else if (get(root, ref.type, ref.id) === undefined) missing.set(key, ref);
  }
  for (const type of types) {
    const count = counts[type] = {records: 0, heads: 0};
    for (const {address, record} of each(root, type, {strict: true})) {
      requireThat(++items <= MAX_ITEMS, 'limit', 'checkpoint record/head/reference limit exceeded');
      requireThat(get(root, type, address) !== undefined, 'record', 'record disappeared during discovery');
      count.records++;
      if (Array.isArray(record.causes)) for (const entry of record.causes) reference(entry, type);
    }
    for (const {head} of heads(root, type, {strict: true})) {
      requireThat(++items <= MAX_ITEMS, 'limit', 'checkpoint record/head/reference limit exceeded');
      count.heads++;
      for (const entry of head.frontier) reference(entry, type);
    }
  }
  const sorted = map => [...map].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value);
  return {counts, causality: {complete: missing.size === 0 && external.size === 0, missing: sorted(missing), external: sorted(external)}};
}
/** Read-only exact native comparison; partial causality is reported independently. */
export function verifyNativeCheckpoint({source, checkpoint, types, quiescent} = {}) {
  types = inputs(source, checkpoint, types, quiescent);
  const before = inventory(source, types), captured = inventory(checkpoint, types, true);
  same(before, captured, 'checkpoint paths or bytes differ from source');
  const original = inspect(source, types), restored = inspect(checkpoint, types);
  same(original, restored, 'checkpoint native state differs from source');
  same(before, inventory(source, types), 'source changed during verification');
  same(captured, inventory(checkpoint, types, true), 'checkpoint changed during verification');
  return {captureIntegrity: true, types, ...restored, files: captured, bytes: captured.reduce((n, file) => n + file.bytes, 0)};
}
/** Fresh, existing empty destination only. Failure retains partial native bytes. */
export function prepareNativeCheckpoint({source, destination, types, quiescent} = {}) {
  types = inputs(source, destination, types, quiescent);
  requireThat(children(destination).length === 0, 'destination', 'destination must be empty; interrupted copies require verification or a fresh destination');
  const before = inventory(source, types); inspect(source, types);
  same(before, inventory(source, types), 'source changed before copying');
  let copied = 0;
  for (const type of types) {
    for (const {address, record} of each(source, type, {strict: true})) {
      requireThat(++copied <= MAX_ITEMS, 'limit', 'checkpoint copy limit exceeded');
      requireThat(put(destination, type, record, {durableRoot: destination}) === address, 'address', 'native address changed');
    }
    for (const {name, head} of heads(source, type, {strict: true})) {
      requireThat(++copied <= MAX_ITEMS, 'limit', 'checkpoint copy limit exceeded');
      writeHead(destination, type, name, head, {expect: null, durableRoot: destination});
    }
  }
  same(before, inventory(source, types), 'source changed during copying');
  const result = verifyNativeCheckpoint({source, checkpoint: destination, types, quiescent});
  same(before, result.files, 'source changed between copying and verification');
  return result;
}
