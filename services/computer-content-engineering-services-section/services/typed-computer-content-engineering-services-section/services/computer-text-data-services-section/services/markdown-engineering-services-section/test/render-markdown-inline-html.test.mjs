import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownInlineHtml as render } from '../src/render-markdown-inline-html.mjs';

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


test("restricted output carriers retain unsupported syntax as escaped literal source", () => {
  const options = { allowedFeatures: ["markdown-link", "strong", "em", "strong-em"] };
  assert.equal(render("**yes** [safe](ok.md) `*code*` ![asset](x.png) [[term]]", options), '<strong>yes</strong> <a href="ok.md">safe</a> `*code*` ![asset](x.png) [[term]]');
  assert.equal(render("[unsafe](javascript:alert) <script>", options), "unsafe &lt;script&gt;");
});
