#!/usr/bin/env node
/** Read current state with this package's actual record/head laws.
 * No historical provider, conversion journal, service operation or write.
 * Usability is not proof of a historical transfer: the first-cutover caller
 * must separately establish that transition from the actual old binding.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as store from '../src/store.mjs';
import {checkRoot} from '../src/layout.mjs';
import {semanticAddress} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';

function directory(root) {
  assert.ok(typeof root === 'string' && path.isAbsolute(root) && path.normalize(root) === root, 'absolute state root required');
  for (let file = root;; file = path.dirname(file)) {
    assert.ok(!fs.lstatSync(file).isSymbolicLink(), 'linked state root refused');
    if (file === path.dirname(file)) break;
  }
  const stat = fs.lstatSync(root);
  assert.ok(stat.isDirectory() && stat.uid === process.getuid(), 'current state root is absent or not owned');
}
/** Native strict discovery must be fully exhausted; a good prefix is insufficient. */
export function checkNativeTypes(root, types) {
  directory(root); checkRoot(root);
  assert.ok(Array.isArray(types) && types.length > 0 && types.length <= 32);
  const counts = {};
  for (const type of types) {
    let records = 0, heads = 0;
    for (const {address, record} of store.each(root, type, {strict: true})) {
      assert.equal(semanticAddress(record).id, address); assert.ok(store.get(root, type, address)); records++;
    }
    for (const {head} of store.heads(root, type, {strict: true})) {
      heads++;
      for (const step of store.walk(root, type, head.frontier, {limit: 100000})) assert.ok(!step.missing && !step.truncated, 'current causal state is incomplete');
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
    directory(binding.target); checkRoot(binding.target);
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
      bindings.push({name: binding.name, types: checkNativeTypes(binding.target, binding.types)});
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
