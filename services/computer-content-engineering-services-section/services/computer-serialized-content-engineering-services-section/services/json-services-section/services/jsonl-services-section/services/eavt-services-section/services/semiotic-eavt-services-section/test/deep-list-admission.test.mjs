import assert from 'node:assert/strict';
import test from 'node:test';
import { seavtRow } from '../src/admit-seavt-row.mjs';
import { jsonToTerm, termToJson } from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec';
import { isAdmittedRow } from '@red-cup-engineering/eavt-services-section/admit-row';

for (const count of [8132, 20000]) test(`SEAVT admits and preserves ${count} native witness identities`, () => {
  const originalWitnessEvents = Array.from({length: count}, (_, index) => `ni:///sha-256;${String(index).padStart(43, '0')}`);
  const payload = {type: 'ActivityPubNativeCustodyInstallationPrepared', originalWitnessEvents};
  const source = {e: jsonToTerm('fixture'), a: jsonToTerm('installation'), v: jsonToTerm(payload), t: '2026-10-11T00:00:00Z'};
  const admitted = seavtRow(source);
  assert.ok(isAdmittedRow(admitted)); assert.notEqual(admitted.v, source.v);
  assert.deepEqual(termToJson(admitted.v), payload);
  const pending = [admitted];
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    assert.ok(Object.isFrozen(value)); pending.push(...Object.values(value));
  }
});
