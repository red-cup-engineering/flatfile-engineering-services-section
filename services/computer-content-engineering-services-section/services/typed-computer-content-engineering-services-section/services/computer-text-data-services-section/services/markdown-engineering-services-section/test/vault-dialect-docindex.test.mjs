import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDocIndex, resolveDocLink } from '../src/vault-dialect/docindex.mjs';

const MD = /\.md(#.*)?$/i;
const room = (id        ) => ({ id, aliases: []             });
const index = buildDocIndex([
  room('content/_index.md'),
  room('content/notes/_index.md'),
  room('content/notes/alpha.md'),
  room('content/terms/atari.md'),
  room('services/x/content/_index.md'),
  room('services/x/content/terms/atari.md'),
]);

test('a relative link resolves as a path from the linking room, never by basename first', () => {
  assert.deepEqual(resolveDocLink('../_index.md', 'content/notes/alpha.md', index, MD), { kind: 'resolved', roomId: 'content/_index.md' });
  assert.deepEqual(resolveDocLink('./_index.md', 'content/notes/alpha.md', index, MD), { kind: 'resolved', roomId: 'content/notes/_index.md' });
  assert.deepEqual(resolveDocLink('../terms/atari.md#history', 'content/notes/alpha.md', index, MD), { kind: 'resolved', roomId: 'content/terms/atari.md' });
});

test('a vault-root path resolves when no room stands at the relative path', () => {
  assert.deepEqual(resolveDocLink('services/x/content/terms/atari.md', 'content/notes/alpha.md', index, MD), { kind: 'resolved', roomId: 'services/x/content/terms/atari.md' });
});

test('a bare file name resolves to the sibling before any basename search', () => {
  assert.deepEqual(resolveDocLink('_index.md', 'content/notes/alpha.md', index, MD), { kind: 'resolved', roomId: 'content/notes/_index.md' });
});

test('only when no path stands does the basename decide, and a duplicate basename is ambiguous', () => {
  assert.deepEqual(resolveDocLink('../../nowhere/alpha.md', 'content/notes/alpha.md', index, MD), { kind: 'self' });
  const ambiguous = resolveDocLink('../../../elsewhere/_index.md', 'content/notes/alpha.md', index, MD);
  assert.equal(ambiguous.kind, 'ambiguous');
  assert.deepEqual(ambiguous.candidates, ['content/_index.md', 'content/notes/_index.md', 'services/x/content/_index.md']);
  assert.deepEqual(resolveDocLink('missing.md', 'content/notes/alpha.md', index, MD), { kind: 'unresolved', raw: 'missing.md' });
});

test('a path that leaves the vault has no path reading, so only its basename can speak', () => {
  const escaped = resolveDocLink('../../../../content/terms/atari.md', 'content/notes/alpha.md', index, MD);
  assert.equal(escaped.kind, 'ambiguous');
  assert.deepEqual(escaped.candidates, ['content/terms/atari.md', 'services/x/content/terms/atari.md']);
  assert.deepEqual(resolveDocLink('../../../../content/notes/alpha.md', 'content/notes/beta.md', index, MD), { kind: 'resolved', roomId: 'content/notes/alpha.md' }, 'a unique basename still resolves');
});

test('paths compare without regard to letter case; a self link and a non-document link are named as such', () => {
  assert.deepEqual(resolveDocLink('./Alpha.MD', 'content/notes/alpha.md', index, MD), { kind: 'self' });
  assert.deepEqual(resolveDocLink('../notes/alpha.png', 'content/notes/beta.md', index, MD), { kind: 'not-a-doc-link' });
  assert.deepEqual(resolveDocLink('https://example.test/alpha.md', 'content/notes/beta.md', index, MD), { kind: 'external' });
});
