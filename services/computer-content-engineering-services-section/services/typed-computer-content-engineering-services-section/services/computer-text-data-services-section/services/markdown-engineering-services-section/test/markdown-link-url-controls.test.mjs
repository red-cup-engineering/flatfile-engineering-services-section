import assert from "node:assert/strict";
import test from "node:test";
import { admitMarkdownLinkTarget as admit } from "../src/admit-markdown-link-target.mjs";
import { renderMarkdownInlineHtml as inline } from "../src/render-markdown-inline-html.mjs";
import { renderMarkdownBlockHtml as block } from "../src/render-markdown-block-html.mjs";

test("link admission classifies schemes after URL control preprocessing", () => {
  for (const scheme of ["javascript:", "data:", "vbscript:", "file:", "ftp:", "tel:"]) {
    const destination = scheme + "payload";
    assert.equal(admit(destination), null);
    assert.equal(admit(destination.toUpperCase()), null);
    for (let code = 0; code <= 0x20; code += 1) {
      assert.equal(admit(String.fromCharCode(code) + destination), null, JSON.stringify([code, destination]));
    }
    for (const control of ["\t", "\n", "\r"]) {
      for (let index = 1; index < scheme.length; index += 1) {
        assert.equal(admit(scheme.slice(0, index) + control + scheme.slice(index) + "payload"), null);
      }
    }
  }
});

test("link admission retains the owner's web-scheme allowlist and admitted spelling", () => {
  for (const destination of [
    "http://example.test", "HTTPS://example.test/a?b=c#d", "mailto:reader@example.test",
    "/docs/example", "../relative.md", "#section", "//example.test/path",
    "javaſcript:relative", "Kustom:relative", "relative?next=javascript:example",
    "ht\ttp://example.test", "ma\tilto:reader@example.test",
  ]) {
    assert.equal(admit("  " + destination + "  "), destination);
  }
  assert.equal(admit(""), null);
  assert.equal(admit(" \t\r\n "), null);
  assert.throws(() => admit(null), TypeError);
  assert.throws(() => admit({}), TypeError);
});

test("actual inline and block HTML renderers refuse control-obscured destinations", () => {
  for (const target of [
    "java\tscript:payload", "\u0001javascript:payload", "da\tta:text/html,payload",
    "vb\tscript:payload", "f\tile:payload", "\u001fftp:payload",
  ]) {
    const link = "[**visible**](" + target + ")";
    assert.equal(inline(link), "<strong>visible</strong>");
    assert.equal(block(link), "<p><strong>visible</strong></p>");
    const image = "![visible](" + target + ")";
    assert.equal(inline(image), "visible");
    assert.equal(block(image), "<p>visible</p>");
  }
  assert.equal(inline('[safe](https://example.test "title")'), '<a href="https://example.test" title="title">safe</a>');
  assert.equal(inline("[relative](javaſcript:relative)"), '<a href="javaſcript:relative">relative</a>');
  assert.equal(inline("[hidden](java\tscript:payload)", { allowedFeatures: [] }), "[hidden](java\tscript:payload)");
});

