// Characterization tests for the existing package exports.
// No scientific, codec, or dependency stub is used. Requires a real build.
import assert from "node:assert/strict";
import test from "node:test";
import { escapeXmlAttr, escapeXmlText } from "@red-cup-engineering/xml-file-codec-service";
import {
  affirmedCharge,
  chargeAttributes,
  projectSvg,
  rfc7996Profile,
  svgInteractiveProfile,
  svgProjector,
} from "@red-cup-engineering/xml-file-codec-service/svg";
import {
  projectRadial,
  radialProjector,
} from "@red-cup-engineering/xml-file-codec-service/svg/radial";

function fixture() {
  const charge = affirmedCharge();
  const fromBox = { cx: 100, cy: 40, w: 160, h: 40 };
  const toBox = { cx: 100, cy: 140, w: 160, h: 40 };
  return {
    width: 200,
    height: 200,
    title: "Source <value> & receiver",
    desc: "An unpublished characterization fixture",
    nodes: [
      {
        e: 'urn:test:source:&"', a: "states", v: "Pheží <&> Ocháǧe",
        group: "source", label: "Source <value> & receiver", title: "Source <title>",
        href: "https://example.invalid/source?revision=1&view=svg",
        data: { "source-revision": "test-revision-1", "source-url": "urn:test:source" },
        charge, box: fromBox,
      },
      {
        e: "urn:test:receiver", group: "receiver", label: "Receiver", charge, box: toBox,
      },
    ],
    edges: [{ from: 'urn:test:source:&"', to: "urn:test:receiver", kind: "states", charge, fromBox, toBox }],
  };
}

test("identical inputs and options produce identical SVG bytes without changing inputs", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const options = { profile: svgInteractiveProfile, declaration: true };
  assert.equal(projectSvg(input, options), projectSvg(input, options));
  assert.equal(JSON.stringify(input), before);
});

test("interactive projection preserves escaped semantic coordinates and source references", () => {
  const input = fixture();
  const svg = projectSvg(input, { profile: svgInteractiveProfile });
  for (const [key, value] of Object.entries({ e: input.nodes[0].e, a: input.nodes[0].a, v: input.nodes[0].v })) {
    assert.ok(svg.includes(`data-${key}="${escapeXmlAttr(value)}"`));
  }
  assert.ok(svg.includes(`data-from="${escapeXmlAttr(input.edges[0].from)}"`));
  assert.ok(svg.includes('data-to="urn:test:receiver"'));
  assert.ok(svg.includes('data-kind="states"'));
  assert.ok(svg.includes('data-source-revision="test-revision-1"'));
  assert.ok(svg.includes('data-source-url="urn:test:source"'));
  assert.ok(svg.includes(escapeXmlText(input.nodes[0].label)));
  assert.ok(svg.includes(`href="${escapeXmlAttr(input.nodes[0].href)}"`));
});

test("interactive projection emits the codec's charge attributes without remapping Science terms", () => {
  const input = fixture();
  const svg = projectSvg(input);
  for (const [key, value] of Object.entries(chargeAttributes(input.nodes[0].charge))) {
    assert.ok(svg.includes(`${key}="${escapeXmlAttr(value)}"`));
  }
});

test("current static profile suppresses links and extension fields but retains core coordinates", () => {
  // This characterizes v0.1.2, not RFC 7996 conformance or complete semantic preservation.
  const input = fixture();
  const svg = projectSvg(input, { profile: rfc7996Profile });
  assert.doesNotMatch(svg, /<a[\s>]/);
  assert.doesNotMatch(svg, /data-source-revision=/);
  assert.doesNotMatch(svg, /data-positive=/);
  assert.ok(svg.includes(`data-e="${escapeXmlAttr(input.nodes[0].e)}"`));
  assert.ok(svg.includes('data-to="urn:test:receiver"'));
});

test("SVG and radial projectors expose writing and recognition, not a lossless decoder", () => {
  const content = projectSvg(fixture());
  assert.equal(svgProjector.recognize({ path: "communication.svg", content }), true);
  assert.equal(typeof svgProjector.write, "function");
  assert.equal(svgProjector.read, undefined);
  assert.equal(radialProjector.read, undefined);
});

test("documented radial package subpath produces deterministic recognizable output", () => {
  const input = {
    rings: [{ ordinal: 0, segments: [{ e: "source", a: "states", v: "claim", orbit: "diagonal", charge: affirmedCharge() }] }],
  };
  const content = projectRadial(input);
  assert.equal(content, projectRadial(input));
  assert.equal(radialProjector.recognize({ path: "radial.svg", content }), true);
  assert.ok(content.includes('data-codec="radial"'));
});
