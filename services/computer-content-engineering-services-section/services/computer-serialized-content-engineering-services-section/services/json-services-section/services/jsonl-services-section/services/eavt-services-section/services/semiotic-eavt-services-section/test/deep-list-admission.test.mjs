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

// Admission is only one stage. Exercise the real native journal independently,
// with full NI identities and causal witnesses, while keeping its artifact bound.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSemanticRecordJournal } from '../src/record-semantic-record.mjs';

test('8132 full native witness identities survive journal record and independent reopen', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'native-witness-admission-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const objectKind = 'activitypub.historical-custody', journal = createSemanticRecordJournal({root, objectKind});
  for (const source of ['source-a', 'source-b']) journal.record({category: 'receiving-commitments',
    recordedAt: '2026-10-11T00:00:00Z', told: {for: true, against: false}, record: {source}});
  const causes = journal.query({category: 'receiving-commitments'}).map(row => row.event);
  const originalWitnessEvents = Array.from({length: 8132}, (_, index) => `ni:///sha-256;${String(index).padStart(43, '0')}`);
  const record = {type: 'ActivityPubNativeCustodyInstallationPrepared', originalWitnessEvents, runtimeActivated: false};
  const written = journal.record({category: 'installation', recordedAt: '2026-10-11T00:00:02Z',
    told: {for: true, against: false}, causes, record});
  const rows = createSemanticRecordJournal({root, objectKind}).query({category: 'installation'});
  assert.equal(rows.length, 1); assert.equal(rows[0].id, written.id);
  assert.deepEqual(rows[0].record, record);
});

test('a 20000-witness inline journal artifact still refuses at the unchanged one-MiB envelope', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'native-witness-envelope-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const journal = createSemanticRecordJournal({root, objectKind: 'activitypub.historical-custody'});
  const originalWitnessEvents = Array.from({length: 20000}, (_, index) => `ni:///sha-256;${String(index).padStart(43, '0')}`);
  assert.throws(() => journal.record({category: 'installation', recordedAt: '2026-10-11T00:00:02Z',
    told: {for: true, against: false}, record: {type: 'ActivityPubNativeCustodyInstallationPrepared', originalWitnessEvents, runtimeActivated: false}}),
    error => error.code === 'canonical-limit' && error.message.endsWith('canonical JSON exceeds 1048576 bytes'));
});
