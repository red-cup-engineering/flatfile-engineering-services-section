import test from "node:test";
import assert from "node:assert/strict";
import { expandUriTemplate, inspectUriTemplate } from "../src/uri-template.mjs";

test("reserved escapes, Unicode prefixes and verified literal erratum survive", () => {
  const expand = (template, variables) => expandUriTemplate({ template, variables }).uri;
  assert.equal(expand("{+x:1}/{y:1}", { x: "%C3%A9next", y: "𝄞stave" }), "%C3%A9/%F0%9D%84%9E");
  assert.equal(expand("{x:1}", { x: "%F0%9D%84%9Enext" }), "%25F0%259D%2584%259E");
  assert.equal(expand("'{x}'", { x: "!'()*" }), "'%21%27%28%29%2A'");
  assert.equal(expand("{+x}", { x: "%C3%A9/%FF/%bad" }), "%C3%A9/%FF/%bad");
});

test("own variables, map/list distinction and undefined/empty values retain information", () => {
  assert.deepEqual(expandUriTemplate({ template: "{constructor}{toString}{?x*,y*}", variables: { x: ["", null, "a b"], y: { absent: null, empty: "", "a/b": "c" } } }), { uri: "?x=&x=a%20b&empty=&a%2Fb=c", byteLength: 26 });
  const variables = JSON.parse('{"__proto__":"owned","map":{"__proto__":"value","hasOwnProperty":"literal"}}');
  assert.equal(expandUriTemplate({ template: "{__proto__}{?map*}", variables }).uri, "owned?__proto__=value&hasOwnProperty=literal");
  assert.equal({}.polluted, undefined);
  assert.deepEqual(inspectUriTemplate({ template: "/{x}{?x,list*}{+Some%20Thing:2}" }).variables, ["x", "list", "Some%20Thing"]);
});

test("bounded representation refuses malformed input and amplified output", () => {
  for (const template of ["{x", "{{x}}", "{x..y}", "{%xx}", "{x:0}", "{x:10000}", "{=x}", "bad%xx", "bad space", "\ud800"]) assert.throws(() => inspectUriTemplate({ template }));
  for (const variables of [{ x: [["nested"]] }, { x: { k: {} } }, { x: Infinity }, { x: "\ud800" }, { x: Array(1025).fill("a") }]) assert.throws(() => expandUriTemplate({ template: "{x}", variables }));
  assert.throws(() => expandUriTemplate({ template: "{x:1}", variables: { x: ["a"] } }));
  assert.throws(() => expandUriTemplate({ template: "{x}{x}", variables: { x: "a".repeat(32769) } }));
  assert.equal(expandUriTemplate({ template: "/{x}", variables: { x: "a".repeat(65535) } }).byteLength, 65536);
});
