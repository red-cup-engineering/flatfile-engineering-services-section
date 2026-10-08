import assert from 'node:assert/strict';
import test from 'node:test';
import { address, admitCell, cell, cellBytes, evidence, evidenceOf, merge, triple, witnessFor } from '../src/cell.mjs';

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
