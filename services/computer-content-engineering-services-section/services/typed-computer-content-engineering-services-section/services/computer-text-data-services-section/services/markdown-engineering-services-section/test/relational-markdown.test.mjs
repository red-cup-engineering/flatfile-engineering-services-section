import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBody } from '../src/relational-markdown.mjs';

test('a fence with an info string is a code block, and the parser terminates on it', () => {
  const parsed = parseBody('Intro.\n\n```python title="x.py" linenums\nprint(1)\n```\n\nAfter.\n');
  const code = parsed.blocks.find((block) => block.kind === 'code');
  assert.ok(code, 'the fence is a code block');
  assert.equal(code.lang, 'python');
  assert.equal(code.text, 'print(1)');
  assert.equal(parsed.blocks.filter((block) => block.kind === 'paragraph').length, 2);
});

test('every block-loop iteration consumes a line: a structural-looking line no branch owns is prose', () => {
  // A lone info-string fence opener is the historical trigger; the guarantee is general.
  const parsed = parseBody('``` mermaid\n');
  assert.ok(parsed.blocks.length <= 2, `parser produced ${parsed.blocks.length} blocks for one line`);
  const sixHashes = parseBody('###### not a heading\nnext line\n');
  assert.equal(sixHashes.blocks.length, 1);
  assert.equal(sixHashes.blocks[0].kind, 'paragraph');
});

test('inline tokenization is a single left-to-right scan', () => {
  const links = Array.from({ length: 4000 }, (_, i) => `see [[room-${i}]] and [t${i}](/x${i}/) and *em${i}*`).join(' ');
  const started = performance.now();
  const parsed = parseBody(links);
  const elapsed = performance.now() - started;
  const inlines = parsed.blocks[0].inlines;
  assert.equal(inlines.filter((token) => token.kind === 'wikilink').length, 4000);
  assert.equal(inlines.filter((token) => token.kind === 'link').length, 4000);
  assert.equal(inlines.filter((token) => token.kind === 'em').length, 4000);
  assert.equal(inlines[0].kind, 'text');
  assert.equal(inlines.at(-1).kind, 'em');
  assert.ok(elapsed < 2000, `tokenizing 12,000 tokens took ${elapsed.toFixed(0)}ms`);
});

test('text before, between, and after tokens is preserved exactly', () => {
  const inlines = parseBody('a `c` b **s** c *e* d').blocks[0].inlines;
  assert.deepEqual(inlines.map((token) => token.kind), ['text', 'code', 'text', 'strong', 'text', 'em', 'text']);
  assert.deepEqual(inlines.filter((token) => token.kind === 'text').map((token) => token.text), ['a ', ' b ', ' c ', ' d']);
});

test('heading ids are unique within a page and the table of contents agrees with the body', async () => {
  const { renderBody, tocOf, headingIds } = await import('../src/relational-markdown.mjs');
  const parsed = parseBody('## Role: assistant\n\ntext\n\n## Role: assistant\n\ntext\n\n## !!!\n\ntext\n');
  assert.deepEqual(headingIds(parsed), ['role-assistant', 'role-assistant-2', 'section-5']);
  assert.deepEqual(tocOf(parsed).map((h) => h.id), ['role-assistant', 'role-assistant-2', 'section-5']);
  const html = renderBody(parsed, { resolve: () => null });
  assert.match(html, /id="role-assistant"/);
  assert.match(html, /id="role-assistant-2"/);
  assert.match(html, /id="section-5"/);
});

test('a document link no catalog rewrote, and an unsafe scheme, render as authored text rather than as broken anchors', async () => {
  const { renderBody } = await import('../src/relational-markdown.mjs');
  const html = renderBody(parseBody('[dangling](../missing.md) [routed](/rooms/x/) [remote](https://a.example/doc.md) [odd](buf:thing) [mail](mailto:a@b.example) ![pic](javascript:alert(1)) ![ok](/img.png)'), { resolve: () => null });
  assert.match(html, /<span class="potential-link">dangling<sup/);
  assert.match(html, /<a href="\/rooms\/x\/">routed<\/a>/);
  assert.match(html, /<a href="https:\/\/a.example\/doc.md">remote<\/a>/);
  assert.match(html, /<span class="potential-link">odd<sup/);
  assert.match(html, /<a href="mailto:a@b.example">mail<\/a>/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /<span class="potential-image">pic<\/span>/);
  assert.match(html, /<img src="\/img.png" alt="ok" loading="lazy" \/>/);
});

test('rendered heading levels never skip, the table of contents reports the rendered levels, and reserved ids are honored', async () => {
  const { renderBody, tocOf, headingLevels } = await import('../src/relational-markdown.mjs');
  // One hash authors h2 in this dialect, so the authored levels here are 5, 3, 6, 4.
  const parsed = parseBody('#### First\n\ntext\n\n## Second\n\n##### Third\n\n### Contents\n');
  assert.deepEqual(parsed.blocks.filter((b) => b.kind === 'heading').map((b) => b.level), [5, 3, 6, 4], 'the AST keeps the authored levels');
  assert.deepEqual(headingLevels(parsed), [2, 3, 4, 4], 'each rendered level is at most one below the one before it');
  const toc = tocOf(parsed, { reservedIds: ['contents'] });
  assert.deepEqual(toc.map((h) => [h.level, h.id]), [[2, 'first'], [3, 'second'], [4, 'third'], [4, 'contents-2']]);
  const html = renderBody(parsed, { resolve: () => null, reservedIds: ['contents'] });
  assert.match(html, /<h2 id="first">First<\/h2>/);
  assert.match(html, /<h4 id="third">Third<\/h4>/);
  assert.match(html, /<h4 id="contents-2">Contents<\/h4>/);
});
