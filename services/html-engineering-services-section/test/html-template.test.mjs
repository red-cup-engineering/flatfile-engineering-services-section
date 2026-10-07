import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeHtml, html, isRaw, raw } from '../src/html-template.mjs';

test('the HTML template escapes interpolations and admits only explicit raw fragments', () => {
  const hostile = '<script data-x="one">alert(\'two\') & more</script>';
  assert.equal(
    escapeHtml(hostile),
    '&lt;script data-x=&quot;one&quot;&gt;alert(&#39;two&#39;) &amp; more&lt;/script&gt;',
  );
  const rendered = html`<p>${hostile}${[raw('<strong>trusted</strong>'), false, null]}</p>`;
  assert.equal(
    String(rendered),
    '<p>&lt;script data-x=&quot;one&quot;&gt;alert(&#39;two&#39;) &amp; more&lt;/script&gt;<strong>trusted</strong></p>',
  );
  assert.equal(isRaw(rendered), true);
});
