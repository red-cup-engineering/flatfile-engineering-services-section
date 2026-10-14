import assert from "node:assert/strict";
import test from "node:test";
import { parseBody, renderBody, safeHref } from "../src/relational-markdown.mjs";

test("relational href admission classifies browser URL preprocessing", () => {
  for (const scheme of ["javascript:", "data:", "vbscript:", "file:", "ftp:"]) {
    for (let code = 0; code <= 0x20; code += 1) {
      assert.equal(safeHref(String.fromCharCode(code) + scheme + "payload"), null);
    }
    for (const control of ["\t", "\r", "\n"]) {
      for (let index = 1; index < scheme.length; index += 1) {
        assert.equal(safeHref(scheme.slice(0, index) + control + scheme.slice(index) + "payload"), null);
      }
    }
  }
});

test("relational href admission retains its own tel policy and exact authored spelling", () => {
  for (const href of [
    " http://example.test ", "\thttps://example.test\r", "mailto:reader@example.test",
    "tel:+15555550123", "t\tel:+15555550123", "/relative", "#fragment", "//example.test",
    "javaſcript:relative", "Kustom:relative", "javascript&#58;payload", "java&#x09;script:payload",
  ]) assert.equal(safeHref(href), href);
  assert.equal(safeHref(""), null);
  assert.equal(safeHref(null), null);
});

const render = (text) => renderBody(parseBody(text), { resolve: () => null });

test("relational renderer marks control-obscured links and embeds as potential", () => {
  for (const target of ["java\tscript:payload", " javascript:payload", "\u0001data:payload"]) {
    assert.match(render("[visible](" + target + ")"), /class="potential-link"/);
    assert.doesNotMatch(render("[visible](" + target + ")"), /<a\b/);
    assert.match(render("![visible](" + target + ")"), /class="potential-image"/);
    assert.doesNotMatch(render("![visible](" + target + ")"), /<(?:a|img|video|audio)\b/);
  }
  assert.equal(render("[phone](tel:+15555550123)"), '<p><a href="tel:+15555550123">phone</a></p>');
  assert.match(render("[relative](javaſcript:relative.md)"), /class="potential-link"/);
  assert.match(render("[relative](Kustom:relative.md)"), /class="potential-link"/);
  assert.equal(render("[literal](javascript&#58;payload)"), '<p><a href="javascript&amp;#58;payload">literal</a></p>');
});
