// Focused source-path tests runnable without the package's Science dependencies:
// node --test test/svg-profile-gating-source.test.mjs
// Exact XML/SVG slices are executed after removing only TS/export syntax.
// These tests do not cover Science semantics, the full package, or RFC conformance.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as module from "node:module";
import test from "node:test";

const supported = typeof module.stripTypeScriptTypes === "function";
let api;
if (supported) {
  const xml = await readFile(new URL("../src/xml/core.mts", import.meta.url), "utf8");
  const svg = await readFile(new URL("../src/xml/svg/index.mts", import.meta.url), "utf8");
  function between(source, start, end) {
    const a = source.indexOf(start);
    const b = source.indexOf(end, a + start.length);
    assert.ok(a >= 0 && b > a, `source-slice markers: ${start} -> ${end}`);
    return source.slice(a, b);
  }
  const pureSource = [
    between(xml, "/* ── escape", "/* ── projector"),
    between(svg, "/* ── morphism", "/* ── normalize"),
    between(svg, "/* ── profiles", "/* ── project ─"),
    between(svg, "/* ── project ─", "export { serialize };"),
  ].join("\n");
  const javascript = module.stripTypeScriptTypes(pureSource, { mode: "strip" }).replace(/^export /gm, "");
  api = new Function(`"use strict";\n${javascript}\nreturn { projectSvg, rfc7996Profile, svgInteractiveProfile, nodeDataAttributes };`)();
}

function fixture() {
  const fromBox = { cx: 100, cy: 40, w: 160, h: 40 };
  const toBox = { cx: 100, cy: 140, w: 160, h: 40 };
  const unavailableCharge = () => { throw new Error("No-data projection must not read a Science charge"); };
  return {
    width: 200, height: 200, title: "Source <&> receiver", desc: "Profile-gating fixture",
    nodes: [
      { e: "urn:source", a: "states", v: "claim", group: "source", label: "Source <&> receiver", title: "Source title", href: "https://example.invalid/source", focus: true, data: { source: "urn:original", revision: "1" }, box: fromBox, get charge() { return unavailableCharge(); } },
      { e: "urn:receiver", group: "receiver", label: "Receiver", box: toBox, get charge() { return unavailableCharge(); } },
    ],
    edges: [{ from: "urn:source", to: "urn:receiver", kind: "states", href: "https://example.invalid/relation", fromBox, toBox, get charge() { return unavailableCharge(); } }],
  };
}
const options = supported ? {} : { skip: "Requires Node's built-in stripTypeScriptTypes" };
const noData = /\sdata-[A-Za-z0-9_.:-]+=/;
const staticSvg = () => api.projectSvg(fixture(), { profile: api.rfc7996Profile });

test("no-data static projection emits no node, edge, focus, extension, or charge metadata", options, () => {
  assert.doesNotMatch(staticSvg(), noData);
});

test("static projection retains escaped visible content and edge geometry", options, () => {
  const svg = staticSvg();
  assert.ok(svg.includes('class="source"'));
  assert.ok(svg.includes("Source &lt;&amp;&gt; receiver"));
  assert.ok(svg.includes("Source title"));
  assert.match(svg, /<path[^>]+marker-end=/);
  assert.doesNotMatch(svg, /<a[\s>]/);
});

test("static node attribute helper returns only class", options, () => {
  assert.deepEqual(api.nodeDataAttributes(fixture().nodes[0], api.rfc7996Profile), { class: "source" });
});

test("no-data permission is independent of profile name and anchor permission", options, () => {
  const profile = { ...api.svgInteractiveProfile, name: "linked-no-data", permitsDataAttributes: false };
  const svg = api.projectSvg(fixture(), { profile });
  assert.doesNotMatch(svg, noData);
  assert.ok(svg.includes('href="https://example.invalid/source"'));
  assert.ok(svg.includes('href="https://example.invalid/relation"'));
});

test("static output remains byte deterministic", options, () => {
  assert.equal(staticSvg(), staticSvg());
});

test("edge without kind retains geometry without metadata", options, () => {
  const data = fixture();
  delete data.edges[0].kind;
  const svg = api.projectSvg(data, { profile: api.rfc7996Profile });
  assert.doesNotMatch(svg, noData);
  assert.match(svg, /<path[^>]+marker-end=/);
});

test("empty projection needs no Science semantics and is unaffected by profile gates", options, () => {
  const data = { width: 10, height: 10, nodes: [], edges: [] };
  assert.equal(api.projectSvg(data), api.projectSvg(data, { profile: api.rfc7996Profile }));
});
