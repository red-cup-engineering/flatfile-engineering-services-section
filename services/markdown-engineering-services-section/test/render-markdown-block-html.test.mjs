import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdownBlockHtml } from "../src/render-markdown-block-html.mjs";

test("block projection preserves tables, nested lists and callouts beneath the document heading", () => {
  const html = renderMarkdownBlockHtml(['# Lesson', '', '| Same | Same |', '| --- | --- |', '| **one** | [two](https://example.test) |', '', '- parent', '  - child', '', '> [!note] Practice', '> Try again.'].join("\n"), { headingOffset: 1 });
  assert.match(html, /<h2>Lesson<\/h2>/u);
  assert.match(html, /<th>Same<\/th><th>Same<\/th>/u);
  assert.match(html, /<td><strong>one<\/strong><\/td><td><a href="https:\/\/example.test">two<\/a><\/td>/u);
  assert.equal((html.match(/<ul>/gu) ?? []).length, 2);
  assert.match(html, /data-callout="note"/u);
});

test("table-shaped fenced code stays code and cannot create table markup", () => {
  const html = renderMarkdownBlockHtml('~~~md\nA | B\n- | -\n1 | 2\n~~~');
  assert.match(html, /<pre><code class="language-md">/u);
  assert.doesNotMatch(html, /<table>/u);
});

test("fence-adjacent annotations stay structured on the code block", () => {
  const html = renderMarkdownBlockHtml('[provenance :: legacy source]\n(kind::example)\n```js\nconst answer = 42;\n```');
  assert.equal(html, '<pre data-ann="{&quot;provenance&quot;:&quot;legacy source&quot;,&quot;kind&quot;:&quot;example&quot;}"><code class="language-js">const answer = 42;</code></pre>');
});
