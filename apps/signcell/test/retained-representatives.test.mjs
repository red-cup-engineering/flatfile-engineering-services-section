import assert from 'node:assert/strict';
import test from 'node:test';
import { address, admitCell, cell, cellBytes, evidence, evidenceOf, measured, merge, mergeCellSets, presence, recordOf, triple, valueOf, witnessFor } from '../src/cell.mjs';
import { knowledgeJoinReading } from '@red-cup-engineering/computer-data-engineering-services-section/four';

const raw = 'ta\u0302che', normalized = 'tâche';

test('SignCell keeps original terms and witness representatives while canonical identity remains equal', () => {
  const witness = { [raw]: raw };
  const held = cell(raw, raw, raw, { for: [witness], against: [{ source: raw }] });
  const canonical = cell(normalized, normalized, normalized, { for: [{ [normalized]: normalized }], against: [{ source: normalized }] });
  assert.equal(held.subject, raw); assert.equal(held.predicate, raw); assert.equal(held.object, raw);
  assert.deepEqual(held.for, [witness]);
  assert.equal(held.against[0].source, raw);
  assert.equal(triple(held).subject, raw);
  assert.deepEqual(evidenceOf(held).for, [witness]);
  assert.equal(address(held), address(canonical));
  assert.deepEqual(cellBytes(held), cellBytes(canonical));
  witness[raw] = 'changed';
  assert.equal(held.for[0][raw], raw);
});

test('admission and re-evidencing retain byte ownership without rewriting opaque text', () => {
  const bytes = new Uint8Array([1, 2]);
  const held = admitCell({ subject: raw, predicate: 'p', object: { bytes }, for: [{ source: raw, bytes }], against: [] });
  const named = address(held);
  bytes.fill(9); held.object.bytes.fill(8); held.for[0].bytes.fill(7);
  assert.deepEqual([...held.object.bytes], [1, 2]);
  assert.equal(address(held), named);
  const updated = witnessFor(held, { added: raw });
  assert.equal(updated.subject, raw);
  assert.equal(address(updated), named);
  assert.ok(updated.for.some(w => w.added === raw));
});

test('evidence sides still deduplicate by canonical bytes and retain the selected representative', () => {
  const selected = evidence({ for: [normalized, raw] });
  assert.deepEqual(selected.for, [raw]);
  const reversed = evidence({ for: [raw, normalized] });
  assert.deepEqual(reversed.for, [normalized]);
  const left = cell('s', 'p', 'o', { for: [raw] });
  const right = cell('s', 'p', 'o', { for: [normalized] });
  assert.deepEqual(merge(left, right).for, [normalized]);
  assert.deepEqual(merge(right, left).for, [raw]);
  assert.deepEqual(cellBytes(merge(left, right)), cellBytes(merge(right, left)));
});


test('SignCell merge satisfies the FOUR join and G-set laws modulo canonical bytes', () => {
  // The two Unicode spellings have the same SCA identity but distinct retained representatives.
  const seeds = [
    cell('subject', 'relation', 'object'),
    cell('subject', 'relation', 'object', { for: [raw] }),
    cell('subject', 'relation', 'object', { against: ['counter-witness'] }),
    cell('subject', 'relation', 'object', { for: [normalized], against: ['other-counter'] }),
  ];
  const canonical = value => Buffer.from(cellBytes(value)).toString('hex');
  const originalAddress = address(seeds[0]);

  for (const left of seeds) {
    assert.equal(address(left), originalAddress);
    assert.equal(canonical(merge(left, left)), canonical(left), 'idempotence');
    for (const right of seeds) {
      const joined = merge(left, right);
      assert.equal(address(joined), originalAddress, 'more evidence never changes the claim identity');
      assert.equal(canonical(joined), canonical(merge(right, left)), 'commutativity modulo canonical bytes');
      assert.equal(valueOf(joined), knowledgeJoinReading(valueOf(left), valueOf(right)));
      for (const last of seeds) {
        const lhs = merge(merge(left, right), last);
        const rhs = merge(left, merge(right, last));
        assert.equal(canonical(lhs), canonical(rhs), 'associativity modulo canonical bytes');
        assert.equal(valueOf(lhs), knowledgeJoinReading(valueOf(joined), valueOf(last)));
      }
    }
  }

  const conflict = merge(seeds[1], seeds[2]);
  assert.equal(presence(conflict), 'stable');
  assert.equal(valueOf(conflict), 'stable');
  assert.equal(measured(conflict), true);
  assert.deepEqual(recordOf(conflict), { pos: 1, neg: 1 });
  assert.equal(canonical(mergeCellSets([seeds[1]], [seeds[2]])[0]), canonical(conflict));
  assert.equal(canonical(mergeCellSets([seeds[2]], [seeds[1]])[0]), canonical(conflict));
});

test('an explicitly unmeasured charge stays distinct from the evidence presence', () => {
  const withWitnesses = cell('subject', 'relation', 'object', {
    for: ['support'], against: ['counterevidence'], value: 'absurd',
  });
  assert.equal(presence(withWitnesses), 'stable');
  assert.equal(valueOf(withWitnesses), 'absurd');
  assert.equal(measured(withWitnesses), false);
  assert.deepEqual(recordOf(withWitnesses), { pos: 1, neg: 1 });
  // A newly admitted positive witness changes the value by join, not by
  // silently replacing the actual evidence's earlier negative side.
  const advanced = witnessFor(withWitnesses, 'second-support');
  assert.equal(valueOf(advanced), 'potential');
  assert.equal(presence(advanced), 'stable');
  assert.equal(measured(advanced), false);
  assert.deepEqual(recordOf(advanced), { pos: 2, neg: 1 });
});
