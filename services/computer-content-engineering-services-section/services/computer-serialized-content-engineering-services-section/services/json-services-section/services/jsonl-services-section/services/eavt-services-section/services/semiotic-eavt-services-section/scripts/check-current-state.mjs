#!/usr/bin/env node
/** Read current state through its actual selected Data and SignCell receivers.
 * This script may be pinned beside a reviewed cutover source while those
 * runtime packages remain the current release inputs. It never writes state.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {getTypedMark} from '../src/typed-mark-store.mjs';

function directory(root) {
  assert.ok(typeof root === 'string' && path.isAbsolute(root) && path.normalize(root) === root, 'absolute state root required');
  for (let file = root;; file = path.dirname(file)) {
    assert.ok(!fs.lstatSync(file).isSymbolicLink(), 'linked state root refused');
    if (file === path.dirname(file)) break;
  }
  const stat = fs.lstatSync(root);
  assert.ok(stat.isDirectory() && stat.uid === process.getuid(), 'current state root is absent or not owned');
}
async function currentReceiver(newStore) {
  assert.ok(typeof newStore === 'string' && path.isAbsolute(newStore), 'current Data package root required');
  const require = createRequire(path.join(newStore, 'package.json'));
  const moduleOf = name => import(pathToFileURL(require.resolve(name)).href);
  const [store, layout, address, signcellMark, signcellTypedMark] = await Promise.all([
    import(pathToFileURL(path.join(newStore, 'src/store.mjs')).href),
    import(pathToFileURL(path.join(newStore, 'src/layout.mjs')).href),
    moduleOf('@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address'),
    moduleOf('@red-cup-engineering/signcell/mark'),
    moduleOf('@red-cup-engineering/signcell/typed-mark'),
  ]);
  return {store, checkRoot: layout.checkRoot, semanticAddress: address.semanticAddress,
    MarkType: signcellMark.MarkType, admitTypedMark: signcellTypedMark.admitTypedMark};
}
/** Native strict discovery must be fully exhausted; a good prefix is insufficient. */
export async function checkNativeTypes(root, types, newStore) {
  directory(root);
  const receiver = await currentReceiver(newStore);
  receiver.checkRoot(root);
  assert.ok(Array.isArray(types) && types.length > 0 && types.length <= 32);
  const typeSet = new Set(types);
  if (typeSet.has('semantic-claim')) assert.ok(typeSet.has('typed-mark'), 'semantic-claim receiving requires its typed-mark endpoint collection');
  const counts = {};
  for (const type of types) {
    let records = 0, heads = 0;
    for (const {address, record} of receiver.store.each(root, type, {strict: true})) {
      assert.equal(receiver.semanticAddress(record).id, address);
      assert.ok(receiver.store.get(root, type, address));
      if (type === 'semantic-claim') {
        for (const endpoint of [record.subject, record.object]) {
          if (endpoint?.type === receiver.MarkType.id) {
            const mark = getTypedMark(receiver.store, root, endpoint, receiver.MarkType, receiver.admitTypedMark);
            assert.equal(mark.id, endpoint.id, 'semantic claim endpoint must resolve at its declared SignCell identity');
          }
        }
      }
      records++;
    }
    for (const {head} of receiver.store.heads(root, type, {strict: true})) {
      heads++;
      for (const step of receiver.store.walk(root, type, head.frontier, {limit: 100000})) assert.ok(!step.missing && !step.truncated, 'current causal state is incomplete');
    }
    // Empty types and absent heads are lawful native states. In particular an
    // ActivityPub actor may have no followers, inbox or outbox history. These
    // counts describe actual custody; they do not certify historical transfer.
    counts[type] = {records, heads};
  }
  return counts;
}
export async function checkCurrentState(plan) {
  assert.equal(plan.version, 1);
  assert.ok(Array.isArray(plan.bindings) && plan.bindings.length > 0 && plan.bindings.length <= 16);
  const bindings = [];
  for (const binding of plan.bindings) {
    directory(binding.target);
    if (binding.conversion === 'kalshi') {
      // Read the real desk owner's current path. No client/credential/order API.
      assert.ok(typeof plan.currentKalshi === 'string' && path.isAbsolute(plan.currentKalshi));
      const {deskStatePath} = await import(pathToFileURL(path.join(plan.currentKalshi, 'services/kalshi-stake-path-service/src/desk-layout.mjs')).href);
      const file = deskStatePath(binding.target, 'arming.json');
      let stat;
      try { stat = fs.lstatSync(file); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        // The desk owner's readArming treats absence as unarmed. Do not invent
        // principal authority or turn a legitimate unarmed desk into an outage.
        bindings.push({name: binding.name, armingPresent: false}); continue;
      }
      assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid(), 'current principal arming state is absent');
      const arming = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.ok(arming && typeof arming.armed === 'boolean' && (!arming.armed || typeof arming.armedAt === 'string' && Number.isFinite(Date.parse(arming.armedAt)) && typeof arming.armedBy === 'string'), 'current principal arming state is invalid');
      bindings.push({name: binding.name, armingPresent: true});
    } else {
      assert.ok(['world', 'activitypub'].includes(binding.conversion));
      bindings.push({name: binding.name, types: await checkNativeTypes(binding.target, binding.types, plan.newStore)});
    }
  }
  return {currentStateUsable: true, historicalTransferProven: false, bindings};
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, 'usage: check-current-state.mjs PLAN_JSON');
    console.log(JSON.stringify(await checkCurrentState(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))));
  } catch (error) { console.error(JSON.stringify({currentStateUsable: false, error: error.message})); process.exitCode = 1; }
}
