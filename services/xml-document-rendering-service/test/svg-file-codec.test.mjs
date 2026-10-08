import assert from "node:assert/strict";
import test from "node:test";
import { projectSvg, svgProjector } from "../src/xml/svg/index.mjs";

test("projects and recognizes an SVG flatfile", () => {
  const content = projectSvg({ width: 10, height: 10, nodes: [], edges: [] });
  assert.match(content, /<svg/);
  assert.equal(svgProjector.recognize({ path: "proof.svg", content }), true);
});

import { comment, document, element, escapeXmlAttr, escapeXmlText, serialize } from '../src/xml/index.mjs';
import { rfc7996Profile } from '../src/xml/svg/index.mjs';
import { createHash } from 'node:crypto';
const placed = {
  "width": 100,
  "height": 80,
  "nodes": [
    {
      "e": "n<&",
      "a": "kind",
      "v": "value",
      "group": "entity",
      "label": "One\n<&",
      "focus": true,
      "href": "/x",
      "data": {
        "custom": "a&b"
      },
      "charge": {
        "kind": "bilattice-charge.carrier",
        "value": [
          {
            "kind": "bilattice-charge.side",
            "name": "present"
          },
          {
            "kind": "bilattice-charge.side",
            "name": "absent"
          }
        ],
        "evidence": [
          [],
          []
        ]
      },
      "box": {
        "cx": 20,
        "cy": 20,
        "w": 20,
        "h": 10
      }
    }
  ],
  "edges": [
    {
      "from": "n<&",
      "to": "n2",
      "kind": "extends",
      "href": "/edge",
      "charge": {
        "kind": "bilattice-charge.carrier",
        "value": [
          {
            "kind": "bilattice-charge.side",
            "name": "present"
          },
          {
            "kind": "bilattice-charge.side",
            "name": "absent"
          }
        ],
        "evidence": [
          [],
          []
        ]
      },
      "fromBox": {
        "cx": 20,
        "cy": 20,
        "w": 20,
        "h": 10
      },
      "toBox": {
        "cx": 20,
        "cy": 60,
        "w": 20,
        "h": 10
      }
    }
  ]
};

test('XML construction escapes text and attributes and refuses malformed names and comments', () => {
  assert.equal(escapeXmlText('<&>'), '&lt;&amp;&gt;');
  assert.equal(escapeXmlAttr('"<&>\''), '&quot;&lt;&amp;&gt;&#39;');
  assert.equal(serialize(element('a', { omitted: null, n: 0 }, ['<&>', false, null, comment('a-b')])), '<a n="0">&lt;&amp;&gt;<!--a-b--></a>');
  assert.equal(document(element('a'), { declaration: true }).startsWith('<?xml version="1.0" encoding="UTF-8"?>'), true);
  assert.throws(() => element('bad name'), TypeError);
  assert.throws(() => serialize(element('a', { 'bad name': 1 })), TypeError);
  for (const value of ['--', 'x--y', '-', 'x-']) assert.throws(() => comment(value), TypeError);
  assert.equal(serialize(comment('')), '<!---->');
});

test('interactive SVG preserves published bytes and RFC7996 omits every data attribute and anchor', () => {
  assert.equal(createHash('sha256').update(projectSvg(placed)).digest('hex'), 'b563347d7d7f17d415eb36f80475c69cee1b35f0f134cc5504cf2c6daea5cd8e');
  const svg = projectSvg(placed, { profile: rfc7996Profile });
  assert.doesNotMatch(svg, /\sdata-|<a[\s>]/);
  assert.deepEqual(rfc7996Profile.lint(svg), { ok: true, violations: [] });
  assert.equal(rfc7996Profile.lint('<svg><text> data-label="x"</text></svg>').ok, true);
  assert.equal(rfc7996Profile.lint('<svg title=" data-label=hello"/>').ok, true);
  for (const svg of ['<svg data-e="e"/>', "<svg data-extra = 'x'/>"]) {
    assert.equal(rfc7996Profile.lint(svg).ok, false);
    assert.equal(rfc7996Profile.lint(svg).violations[0].rule, 'no-data-attribute');
  }
});

test('custom charge policy supplies node and edge attributes and is not invoked in static profiles', () => {
  const custom = { ...placed, nodes: placed.nodes.map(node => ({ ...node, charge: 'held' })), edges: placed.edges.map(edge => ({ ...edge, charge: 'denied' })) };
  const calls = [];
  const chargeAttributes = charge => { calls.push(charge); return { 'data-value': charge }; };
  const svg = projectSvg(custom, { chargeAttributes });
  assert.deepEqual(calls, ['denied', 'held']);
  assert.match(svg, /data-value="held"/);
  assert.match(svg, /data-value="denied"/);
  calls.length = 0;
  assert.doesNotMatch(projectSvg(custom, { chargeAttributes, profile: rfc7996Profile }), /\sdata-/);
  assert.deepEqual(calls, []);
});
