import assert from "node:assert/strict";
import test from "node:test";

import { convertHtmlToMarkdown } from "../src/convert-html-to-markdown.mjs";

test("converts newsletter structure, line breaks, emphasis, links, and ordered lists", () => {
  assert.equal(
    convertHtmlToMarkdown("<h2>Heading</h2><p>First<br/>Second <em>line</em> and <a href=\"https://example.com\">link</a>.</p><ol><li>One</li><li>Two</li></ol>"),
    "## Heading\n\nFirst\nSecond *line* and [link](https://example.com).\n\n1. One\n2. Two",
  );
});

test("decodes named, decimal, and hexadecimal HTML entities", () => {
  assert.equal(convertHtmlToMarkdown("<p>A&nbsp;B &amp; C &#8212; &#x2014; &apos;yes&apos;</p>"), "A B & C — — 'yes'");
});

test("converts code and images and drops active embedded content", () => {
  assert.equal(
    convertHtmlToMarkdown("<pre><code>&lt;x&gt;</code></pre><p><code>value</code> <img src=\"image.png\" alt=\"A &amp; B\"></p><script>bad()</script><iframe>also bad</iframe>"),
    "```\n<x>\n```\n\n`value` ![A & B](image.png)",
  );
});

test("keeps unlinked anchor labels and quotes every blockquote line", () => {
  assert.equal(convertHtmlToMarkdown("<blockquote><a>Label</a><br>Second</blockquote>"), "> Label\n> Second");
});

test("refuses non-string input", () => {
  assert.throws(() => convertHtmlToMarkdown(null), TypeError);
});
