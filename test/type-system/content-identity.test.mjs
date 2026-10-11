import assert from 'node:assert/strict';
import test from 'node:test';
import { defineType, specializeType, collectTypeSystem, isSubtypeOf, typeIdentity, sameType, admit } from '../../src/type-system/type-system.mjs';
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';

const value = (result) => { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; };
const base = (schema = { type: 'string' }) => value(defineType({ id: 'urn:test:portable', name: 'Portable', description: 'Portable declaration', parents: [], schema }));

test('content identity ignores object insertion order and preserves ordered values', () => {
  assert.equal(semanticId({ b: 2, a: 1 }), semanticId({ a: 1, b: 2 }));
  assert.notEqual(semanticId([1, 2]), semanticId([2, 1]));
});

test('independently reconstructed declarations compose by content identity', () => {
  const first = base(), second = base();
  const child = value(specializeType([first], { id: 'urn:test:child', name: 'Child', description: 'Child', schema: { minLength: 1 } }));
  assert.notEqual(first, second);
  assert.equal(typeIdentity(first), typeIdentity(second));
  assert.equal(sameType(first, second), true);
  assert.equal(isSubtypeOf(child, second), true);
  assert.equal(value(collectTypeSystem([second, child])).types.length, 2);
});

test('equal names do not conceal conflicting type content or forged declarations', () => {
  const first = base(), second = base({ type: 'number' });
  assert.notEqual(typeIdentity(first), typeIdentity(second));
  assert.equal(collectTypeSystem([first, second]).ok, false);
  assert.equal(sameType(first, { ...first }), false);
  assert.throws(() => typeIdentity({ ...first }), /defineType/);
});

test('separate loaded engines validate each other without sharing a private object registry', async () => {
  const remote = await import('../../src/type-system/type-system.mjs?independent-engine');
  const first = base();
  const second = value(remote.defineType({ id: first.id, name: first.name, description: first.description, schema: first.schema, parents: [] }));
  assert.equal(sameType(first, second), true);
  assert.equal(admit(second, 'portable').ok, true);
  assert.equal(admit(second, 42).ok, false);
  assert.equal(remote.admit(first, 'portable').ok, true);
  const child = value(specializeType([second], { id: 'urn:test:remote-child', name: 'Child', description: 'Child', schema: { minLength: 2 } }));
  assert.equal(isSubtypeOf(child, first), true);
  assert.equal(value(collectTypeSystem([first, child])).types.length, 2);
  const invalid = Object.freeze({ ...second, schema: Object.freeze({ type: 'invalid' }) });
  assert.equal(admit(invalid, 'portable').ok, false);
  const changing = Object.freeze({ ...second, get schema() { return { type: 'string' }; } });
  assert.equal(sameType(first, changing), false);
});
