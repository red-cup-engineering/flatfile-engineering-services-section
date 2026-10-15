#!/usr/bin/env node
/** One-time state operation beside the existing semantic converter.
 * The caller holds its deployment lease and stops ALL writers before every
 * phase. This module does not manage services, profiles, credentials or releases.
 * The private operation journal records actual rename recovery, not deployment
 * certification. It and every original/failed tree are retained, never pruned.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const exists = file => { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const under = (file, root) => file === root || file.startsWith(root + path.sep);
function ordinary(file, {directory = true, privateMode = false} = {}) {
  assert.ok(path.isAbsolute(file) && path.normalize(file) === file, 'absolute normalized path required');
  for (let current = file;; current = path.dirname(current)) {
    if (exists(current)) assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'linked state path refused');
    if (current === path.dirname(current)) break;
  }
  const stat = fs.lstatSync(file);
  assert.ok(stat.uid === process.getuid() && (directory ? stat.isDirectory() : stat.isFile()), 'state is not an owned ordinary entry');
  if (privateMode) assert.equal(stat.mode & 0o077, 0, 'operation directory must be private');
  return stat;
}
const stamp = stat => [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs];
/** Stream real bytes, including directory structure and modes, without copying history. */
export function treeDigest(root) {
  if (!exists(root)) return null;
  ordinary(root);
  const digest = createHash('sha256');
  let files = 0, bytes = 0;
  function visit(file, depth = 0) {
    assert.ok(depth <= 64, 'state depth exceeds bound');
    const before = fs.lstatSync(file), name = path.relative(root, file);
    assert.ok(before.uid === process.getuid() && !before.isSymbolicLink(), 'foreign or linked state entry');
    if (before.isDirectory()) {
      digest.update(JSON.stringify([name, 'directory', before.mode & 0o777]) + '\n');
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name), depth + 1);
    } else {
      assert.ok(before.isFile(), 'nonregular state entry');
      const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const body = createHash('sha256'), buffer = Buffer.alloc(65536);
      let count, size = 0;
      try {
        while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) { body.update(buffer.subarray(0, count)); size += count; }
        assert.deepEqual(stamp(fs.fstatSync(fd)), stamp(before), 'state changed during reading');
      } finally { fs.closeSync(fd); }
      assert.equal(size, before.size);
      digest.update(JSON.stringify([name, 'file', before.mode & 0o777, size, body.digest('hex')]) + '\n');
      files++; bytes += size;
    }
    assert.deepEqual(stamp(fs.lstatSync(file)), stamp(before), 'state changed during reading');
  }
  visit(root);
  return {sha256: digest.digest('hex'), files, bytes};
}
function syncDirectory(directory) { const fd = fs.openSync(directory, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function syncTree(root) {
  for (const name of fs.readdirSync(root)) {
    const file = path.join(root, name), stat = fs.lstatSync(file);
    assert.ok(!stat.isSymbolicLink());
    if (stat.isDirectory()) syncTree(file);
    else { assert.ok(stat.isFile()); const fd = fs.openSync(file, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
  }
  syncDirectory(root);
}
function writeJournal(work, journal) {
  ordinary(work, {privateMode: true});
  const temporary = path.join(work, '.operation-' + randomUUID());
  fs.writeFileSync(temporary, JSON.stringify(journal) + '\n', {flag: 'wx', mode: 0o600});
  const fd = fs.openSync(temporary, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, path.join(work, 'operation.json')); syncDirectory(work);
}
function move(from, to) {
  assert.ok(!exists(to), 'rename destination exists');
  fs.renameSync(from, to); syncDirectory(path.dirname(from));
  if (path.dirname(from) !== path.dirname(to)) syncDirectory(path.dirname(to));
}
function validatePlan(plan, work) {
  assert.equal(plan.version, 1);
  assert.ok(Array.isArray(plan.bindings) && plan.bindings.length > 0 && plan.bindings.length <= 16);
  assert.ok(path.isAbsolute(work) && path.normalize(work) === work && !under(work, '/tmp') && !under(work, '/var/tmp'));
  ordinary(path.dirname(work), {privateMode: true});
  const volume = fs.statSync(path.dirname(work)).dev, names = new Set(), targets = [];
  for (const binding of plan.bindings) {
    assert.ok(/^[a-z][a-z0-9-]{0,63}$/u.test(binding.name) && !names.has(binding.name)); names.add(binding.name);
    assert.ok(['world', 'activitypub', 'kalshi'].includes(binding.conversion));
    if (binding.deferKinds !== undefined) assert.ok(binding.conversion === 'world' && Array.isArray(binding.deferKinds) && binding.deferKinds.every(kind => ['agent-session-token-usage','rpc','metroplat.clock','settlement-signal'].includes(kind)), 'only historical service telemetry may be explicitly deferred');
    for (const file of [binding.source, binding.target, binding.clockLastSource, binding.queue].filter(Boolean)) {
      assert.ok(path.isAbsolute(file) && path.normalize(file) === file && !under(file, work) && !under(work, file));
      ordinary(exists(file) ? file : path.dirname(file));
      assert.equal(fs.statSync(exists(file) ? file : path.dirname(file)).dev, volume, 'state operation crosses volumes');
    }
    ordinary(binding.source);
    assert.ok(binding.source === binding.target || (!under(binding.source, binding.target) && !under(binding.target, binding.source)));
    assert.ok(binding.source === binding.target || !exists(binding.target), 'a different existing target requires its own explicit receiving');
    const active = [binding.target, binding.queue].filter(Boolean);
    for (const target of active) { assert.ok(!targets.some(prior => under(target, prior) || under(prior, target)), 'active state roots overlap'); targets.push(target); }
    if (binding.clockLastSource) { assert.equal(binding.conversion, 'world'); ordinary(binding.clockLastSource); }
    if (binding.queue) { assert.equal(binding.conversion, 'activitypub'); assert.equal(binding.queue, path.join(path.dirname(binding.target), 'queue')); ordinary(binding.queue); }
  }
  for (const binding of plan.bindings) {
    for (const source of [binding.source, binding.clockLastSource].filter(Boolean)) {
      assert.ok(!targets.some(target => source !== target && (under(source, target) || under(target, source))), 'source overlaps another active root');
    }
  }
}
function provider(directory) {
  assert.ok(typeof directory === 'string' && path.isAbsolute(directory));
  const actual = fs.realpathSync(directory);
  assert.ok(under(actual, '/gnu/store'), 'provider must be an existing immutable Guix input');
  return actual;
}
/** Bind only historical readers to the caller's configured immutable artifact.
 * LAGOON obtains it from the actual unit before stopping writers and retains it
 * for recovery. The token uses the existing artifact's authored package layout;
 * it neither discovers a provider nor proves historical representation coverage.
 */
export function bindOriginalArtifact(plan, originalArtifact) {
  assert.ok(typeof originalArtifact === 'string' && /^\/gnu\/store\/[0123456789abcdfghijklmnpqrsvwxyz]{32}-[^/]+$/u.test(originalArtifact),
    'original artifact must be one immutable Guix output');
  const bound = {...plan};
  for (const key of ['oldStore', 'oldActivitypub']) {
    const value = plan[key];
    if (typeof value !== 'string' || !value.startsWith('@ORIGINAL_RELEASE@/')) continue;
    const relative = value.slice('@ORIGINAL_RELEASE@/'.length);
    assert.ok(relative && !path.isAbsolute(relative) && path.normalize(relative) === relative
      && relative !== '..' && !relative.startsWith('../'), 'original provider escapes its artifact');
    bound[key] = path.join(originalArtifact, relative);
  }
  return bound;
}
async function receiveNative(root, newStore, report) {
  const store = await import(pathToFileURL(path.join(newStore, 'src/store.mjs')).href);
  const require = createRequire(path.join(newStore, 'package.json'));
  const {semanticAddress} = await import(pathToFileURL(require.resolve('@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address')).href);
  for (const [type, expected] of Object.entries(report.types)) {
    assert.ok(Number.isSafeInteger(expected.written) && expected.written >= 0 && expected.verified === expected.written);
    let count = 0;
    for (const {address, record} of store.each(root, type, {strict: true})) { assert.ok(store.get(root, type, address)); assert.equal(semanticAddress(record).id, address); count++; }
    assert.equal(count, expected.written);
    for (const {head} of store.heads(root, type, {strict: true})) for (const step of store.walk(root, type, head.frontier, {limit: 100000})) assert.ok(!step.missing && !step.truncated);
  }
}
function unchanged(file, expected) { assert.deepEqual(treeDigest(file), expected, 'state changed; writers must remain stopped: ' + file); }
function sourceRoots(binding) { return [binding.source, binding.clockLastSource, binding.queue].filter(Boolean); }
function recordBinding(work, binding, target, candidate, name = binding.name) {
  return {name, target, candidate, retained: path.join(work, name, 'original'), failed: path.join(work, name, 'failed'), before: treeDigest(target), prepared: treeDigest(candidate), phase: 'prepared'};
}
/** Prepare every candidate before any live pathname is rebound. */
export async function prepare(plan, work) {
  validatePlan(plan, work); assert.ok(!exists(work), 'first cutover requires a new operation directory');
  fs.mkdirSync(work, {mode: 0o700}); syncDirectory(path.dirname(work));
  const journal = {version: 1, plan, phase: 'preparing', sources: [], pendingDeliveries: [], bindings: []}; writeJournal(work, journal);
  const newStore = provider(plan.newStore), oldStore = provider(plan.oldStore);
  for (const binding of plan.bindings) {
    for (const source of sourceRoots(binding)) if (!journal.sources.some(row => row.path === source)) journal.sources.push({path: source, digest: treeDigest(source)});
    const directory = path.join(work, binding.name); fs.mkdirSync(directory, {mode: 0o700});
    let nativeActivitypub=false;
    if(binding.conversion==='activitypub'){const {activityPubSourceFormat}=await import('./receive-native-activitypub.mjs');nativeActivitypub=activityPubSourceFormat({source:binding.source,sourceStoreRoot:oldStore,sourceActivitypubRoot:provider(plan.oldActivitypub)})==='native-activitypub-13bca0b8';}
    const candidate = path.join(directory, binding.conversion==='activitypub'?'journal':'candidate'), reportFile = path.join(directory, 'conversion.json');
    let args, environment = {HOME: process.env.HOME, PATH: process.env.PATH, LANG: process.env.LANG};
    if (binding.conversion === 'kalshi') {
      const stage = path.join(directory, 'staging'); fs.mkdirSync(stage, {mode: 0o700}); environment.TMPDIR = stage;
      args = [provider(plan.kalshiConverter), '--settlement', binding.source, '--output', candidate, '--apply', '--writers-stopped'];
    } else {
      args = [path.join(here, 'convert-settlement.mjs'), '--settlement', binding.source, '--into', candidate, '--old-store', oldStore, '--new-store', newStore, '--report', reportFile];
      if (binding.conversion === 'world') args.push('--new-organizing', provider(plan.newOrganizing));
      if (binding.clockLastSource) args.push('--clock-last', binding.clockLastSource);
      if (binding.deferKinds?.length) args.push('--defer-kinds', binding.deferKinds.join(','));
      if (binding.conversion === 'activitypub') args.push('--activitypub', '--old-activitypub', provider(plan.oldActivitypub), '--new-activitypub', provider(plan.newActivitypub));
      if (binding.queue) args.push('--queue', binding.queue);
    }
    writeJournal(work, journal);
    const result = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 1800000, maxBuffer: 1024 * 1024, env: environment});
    fs.writeFileSync(path.join(directory, 'converter.stdout'), result.stdout ?? '', {flag:'wx',mode:0o600});
    fs.writeFileSync(path.join(directory, 'converter.stderr'), (result.stderr ?? '') + (result.error?.code ?? ''), {flag:'wx',mode:0o600});
    assert.equal(result.status, 0, 'existing owner converter refused; original trees are unchanged');
    const report = binding.conversion === 'kalshi' ? JSON.parse(result.stdout) : JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(report.originalsPreserved, true);
    if (binding.conversion === 'kalshi') {
      assert.equal(report.orderEffect, false); assert.equal(report.dryRun, false); assert.deepEqual(report.conflicts, []);
      assert.ok(Array.isArray(report.files));
      for (const file of report.files) {
        const target = path.resolve(candidate, file.path); assert.ok(under(target, candidate));
        ordinary(target, {directory: false}); const bytes = fs.readFileSync(target); assert.equal(bytes.length, file.bytes); assert.equal(hash(bytes), file.sha256);
      }
      fs.writeFileSync(reportFile, JSON.stringify(report) + '\n', {flag: 'wx', mode: 0o600});
    } else {
      assert.equal(report.type, 'OneTimeStoreConversion'); assert.equal(report.version, 1); assert.equal(report.qualified, true);
      assert.equal(report.source, binding.source); assert.equal(report.output, candidate); assert.equal(report.ordersExecuted, false); assert.equal(report.transportActivated, false);
      if(binding.conversion==='activitypub')assert.equal(report.sourceFormat,nativeActivitypub?'native-activitypub-13bca0b8':'witnessed-activitypub');
      assert.equal(report.suppliers.oldStore, oldStore); assert.equal(report.suppliers.newStore, newStore); assert.deepEqual(report.missingBodies, []);
      // No unknown historical references gain authority during this cutover.
      assert.equal(report.referenceDispositions?.count ?? 0, 0, 'original reference disposition still needs its real consumer');
      if (binding.clockLastSource) assert.equal(report.mainSuppliers.clockLastSource, binding.clockLastSource);
      await receiveNative(candidate, newStore, report);
    }
    syncTree(candidate); syncDirectory(directory);
    journal.bindings.push(recordBinding(work, binding, binding.target, candidate));
    if (binding.queue) {
      assert.deepEqual(report.queue.originalOnly, [], 'pending delivery is not admitted by current transport');
      assert.equal(report.queue.activated, 0); // Archived deliveries remain inactive in their original custody.
      const queue = path.join(directory, 'queue'); fs.mkdirSync(path.join(queue, 'ready'), {recursive: true, mode: 0o700}); fs.mkdirSync(path.join(queue, 'claimed'), {mode: 0o700});
      assert.deepEqual(treeDigest(path.join(queue, 'ready')), treeDigest(path.join(binding.queue, 'ready')), 'pending message bytes were not all received');
      // The queue owner has not changed its path or message format. Leave the
      // original queue, indexes and exact message bytes IN PLACE; do not swap it.
      // Only real ready/claimed custody, not a derived scheduling index, gates
      // later restoration of the journal after the new consumer has started.
      for (const part of ['ready', 'claimed']) {
        const file = path.join(binding.queue, part);
        journal.pendingDeliveries.push({path: file, digest: treeDigest(file)});
      }
    }
    for (const source of journal.sources) unchanged(source.path, source.digest);
    writeJournal(work, journal);
  }
  journal.phase = 'prepared'; writeJournal(work, journal);
  return {phase: 'prepared', bindings: journal.bindings.length};
}
function readJournal(plan, work) {
  ordinary(work, {privateMode: true}); ordinary(path.join(work, 'operation.json'), {directory: false});
  const journal = JSON.parse(fs.readFileSync(path.join(work, 'operation.json'), 'utf8'));
  assert.equal(journal.version, 1); assert.deepEqual(journal.plan, plan);
  for (const row of journal.bindings) {
    assert.ok(plan.bindings.some(binding => row.target === binding.target));
    for (const key of ['candidate', 'retained', 'failed']) assert.ok(under(row[key], work) && row[key] !== work);
  }
  return journal;
}
export function bind(plan, work) {
  const journal = readJournal(plan, work); assert.equal(journal.phase, 'prepared');
  for (const source of journal.sources) unchanged(source.path, source.digest);
  for (const row of journal.bindings) { unchanged(row.target, row.before); unchanged(row.candidate, row.prepared); assert.ok(!exists(row.retained) && !exists(row.failed)); }
  journal.phase = 'binding'; writeJournal(work, journal);
  for (const row of journal.bindings) {
    row.phase = 'binding'; writeJournal(work, journal);
    if (row.before !== null) move(row.target, row.retained);
    move(row.candidate, row.target); unchanged(row.target, row.prepared);
    row.phase = 'bound'; writeJournal(work, journal);
  }
  journal.phase = 'bound'; writeJournal(work, journal);
  return {phase: 'bound', bindings: journal.bindings.length};
}
/** Restore only while native state and queue bytes have not advanced. */
export function restore(plan, work) {
  if (!exists(work)) return {phase: 'untouched'};
  const journal = readJournal(plan, work);
  if (['preparing', 'prepared'].includes(journal.phase)) {
    // A failed converter has never rebound a live pathname. Verify the actual
    // observed originals before permitting the caller to resume their writers.
    for (const source of journal.sources) unchanged(source.path, source.digest);
    for (const row of journal.bindings) unchanged(row.target, row.before);
    return {phase: 'untouched'};
  }
  if (journal.phase === 'restored') return {phase: 'untouched'};
  assert.ok(['binding', 'bound', 'restoring'].includes(journal.phase));
  for (const queue of journal.pendingDeliveries) unchanged(queue.path, queue.digest);
  // Preflight the ENTIRE cohort before restoring any old pathname. A consumed
  // message or a new write blocks automatic rollback; neither history is lost.
  for (const row of journal.bindings) {
    if (row.phase === 'restored') { unchanged(row.target, row.before); continue; }
    if (exists(row.retained)) unchanged(row.retained, row.before);
    if (exists(row.candidate)) { unchanged(row.candidate, row.prepared); unchanged(row.target, exists(row.retained) ? null : row.before); }
    else if (exists(row.failed)) { unchanged(row.failed, row.prepared); unchanged(row.target, exists(row.retained) ? null : row.before); }
    else unchanged(row.target, row.prepared);
    if (row.before !== null && !exists(row.candidate) && !exists(row.retained) && !exists(row.failed)) assert.fail('original state is unavailable');
  }
  journal.phase = 'restoring'; writeJournal(work, journal);
  for (const row of [...journal.bindings].reverse()) {
    if (row.phase === 'restored') continue;
    if (!exists(row.candidate) && !exists(row.failed)) move(row.target, row.failed);
    if (exists(row.retained)) move(row.retained, row.target);
    unchanged(row.target, row.before); row.phase = 'restored'; writeJournal(work, journal);
  }
  journal.phase = 'restored'; writeJournal(work, journal);
  return {phase: 'restored', bindings: journal.bindings.length};
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, planFile, work, stopped, originalFlag, originalArtifact, ...extra] = process.argv.slice(2);
    assert.ok(['prepare', 'bind', 'restore'].includes(operation) && stopped === '--writers-stopped'
      && originalFlag === '--original-artifact' && typeof originalArtifact === 'string' && extra.length === 0,
      'usage: first-cutover.mjs prepare|bind|restore PLAN_JSON WORK_DIRECTORY --writers-stopped --original-artifact CONFIGURED_GUIX_OUTPUT');
    const plan = bindOriginalArtifact(JSON.parse(fs.readFileSync(planFile, 'utf8')), provider(originalArtifact));
    const result = await ({prepare, bind, restore})[operation](plan, work); console.log(JSON.stringify(result));
  } catch (error) { console.error(JSON.stringify({error: error.message, writersMustRemainStopped: true})); process.exitCode = 1; }
}
