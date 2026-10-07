import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWikilinkIndex, resolveWikilink } from '../src/vault-dialect/wikilink.mjs';

function room(id, aliases = []) {
  return { id, aliases };
}

test('a unique basename resolves directly', () => {
  const index = buildWikilinkIndex([room('a.md'), room('folder/b.md')]);
  assert.deepEqual(resolveWikilink('a', 'x.md', index), { kind: 'resolved', roomId: 'a.md' });
});

test('shortest-unique-path: a duplicate basename resolves to the shallower path when the minimum depth is unique', () => {
  const index = buildWikilinkIndex([room('Overview.md'), room('projects/Overview.md')]);
  assert.deepEqual(resolveWikilink('Overview', 'x.md', index), { kind: 'resolved', roomId: 'Overview.md' });
});

test('a duplicate basename at EQUAL depth is ambiguous, never guessed', () => {
  const index = buildWikilinkIndex([room('areas/Notes.md'), room('projects/Notes.md')]);
  const res = resolveWikilink('Notes', 'x.md', index);
  assert.equal(res.kind, 'ambiguous');
  assert.deepEqual(res.candidates, ['areas/Notes.md', 'projects/Notes.md']);
});

test('a path-qualified wikilink resolves by exact suffix, ignoring basename-only shorter matches', () => {
  const index = buildWikilinkIndex([room('Overview.md'), room('projects/Overview.md')]);
  assert.deepEqual(resolveWikilink('projects/Overview', 'x.md', index), { kind: 'resolved', roomId: 'projects/Overview.md' });
});

test('an alias resolves the same as a title match', () => {
  const index = buildWikilinkIndex([room('Second Brain.md', ['PKM'])]);
  assert.deepEqual(resolveWikilink('PKM', 'x.md', index), { kind: 'resolved', roomId: 'Second Brain.md' });
});

test('a display-aliased link [[Target|Display]] resolves by Target, ignoring the display text', () => {
  const index = buildWikilinkIndex([room('a.md')]);
  assert.deepEqual(resolveWikilink('a|Some Display Text', 'x.md', index), { kind: 'resolved', roomId: 'a.md' });
});

test('a heading-anchored link [[Target#Heading]] resolves by Target, ignoring the anchor', () => {
  const index = buildWikilinkIndex([room('a.md')]);
  assert.deepEqual(resolveWikilink('a#Some Heading', 'x.md', index), { kind: 'resolved', roomId: 'a.md' });
});

test('a self-link resolves to "self"', () => {
  const index = buildWikilinkIndex([room('a.md')]);
  assert.deepEqual(resolveWikilink('a', 'a.md', index), { kind: 'self' });
});

test('an unresolved target is reported, not silently dropped', () => {
  const index = buildWikilinkIndex([room('a.md')]);
  assert.deepEqual(resolveWikilink('nope', 'a.md', index), { kind: 'unresolved', raw: 'nope' });
});

test('an external URL is never treated as a doc link', () => {
  const index = buildWikilinkIndex([room('a.md')]);
  assert.deepEqual(resolveWikilink('https://example.com', 'a.md', index), { kind: 'external' });
});
