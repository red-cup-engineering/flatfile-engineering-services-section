import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownInlineHtmlNodes } from '../src/render-markdown-inline-html-nodes.mjs';
import { renderHtmlNode } from '@red-cup-engineering/html-structural-projection-service/document-nodes';
const render = (text) => renderMarkdownInlineHtmlNodes(text).map(renderHtmlNode).join('');

for (const [name, input, expected] of [
  [
    "code delimiters",
    "``[example](hidden.md)`` [visible](ok.md)",
    "<code>[example](hidden.md)</code> <a href=\"ok.md\">visible</a>"
  ],
  [
    "code content and whitespace",
    "`` a `tick`\nb ``",
    "<code>a `tick` b</code>"
  ],
  [
    "code inside a link label",
    "[a `b`](note.md)",
    "<a href=\"note.md\">a <code>b</code></a>"
  ],
  [
    "hashtags",
    "Read #topic [note](note.md)",
    "Read #topic <a href=\"note.md\">note</a>"
  ],
  [
    "formatting around links",
    "**[first](a.md)** [second](b.md)",
    "<strong><a href=\"a.md\">first</a></strong> <a href=\"b.md\">second</a>"
  ],
  [
    "unsafe destination",
    "[unsafe](javascript:alert)",
    "unsafe"
  ],
  [
    "line endings",
    "one\r\n`two` [three](three.md)",
    "one\n<code>two</code> <a href=\"three.md\">three</a>"
  ]
]) {
  test(name, () => assert.equal(render(input), expected));
}
