import test from "node:test";
import assert from "node:assert/strict";
import { define, restrict, classifyAt } from "../src/typed-resource-classification.mjs";
const resource = { path: "entry.jsonl", content: "{}\n" };

test("classification of sibling views returns their recognizing common ancestor", () => {
  const root = define({ type: "jsonl", corner: "data", recognize: () => true });
  const parent = restrict(root, { type: "journal", recognize: () => true });
  const left = restrict(parent, { type: "claims", recognize: () => true });
  const right = restrict(parent, { type: "continuation", recognize: () => true });
  for (const views of [[left, right], [right, left]]) {
    assert.equal(classifyAt(resource, [root, parent, ...views]), parent);
  }
  assert.equal(classifyAt(resource, [root, parent, left]), left);
});

test("classification separates root families and honors an explicit representation corner", () => {
  const text = define({ type: "text", corner: "prose", recognize: () => true });
  const json = define({ type: "json", corner: "data", recognize: () => true });
  const assertion = restrict(json, { type: "statement", corner: "assertion", recognize: () => true });
  assert.equal(classifyAt(resource, [text, json]), json);
  assert.equal(classifyAt(resource, [text, json, assertion]), assertion);
  assert.equal(classifyAt(resource, [text, json, assertion], "data"), json);
  assert.equal(classifyAt(resource, [text, json, assertion], "prose"), text);
  assert.equal(classifyAt(resource, [text, json, assertion], "bottom"), null);
  assert.equal(classifyAt(resource, []), null);
});
