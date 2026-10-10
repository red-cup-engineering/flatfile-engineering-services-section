import assert from "node:assert/strict";
import test from "node:test";

import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
import {
  classifyAt,
  cornerOf,
  entails,
  readIsDecidable,
  restrict,
  rungOf,
} from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";

test("the actual string projector is a universal bottom strict root", () => {
  assert.equal(stringProjector.type, "string");
  assert.equal(stringProjector.parent, null);
  assert.equal(cornerOf(stringProjector), "bottom");
  assert.equal(rungOf(stringProjector), "strict");
  assert.equal(readIsDecidable(stringProjector), true);
  assert.deepEqual(entails(stringProjector), [stringProjector]);

  for (const resource of [
    { path: "opaque.bin", content: "not a structured document" },
    { path: "empty.txt", content: "" },
    { path: "entry.json", content: '{"kind":"still opaque here"}' },
  ]) {
    assert.equal(stringProjector.recognize(resource), true);
  }
});

test("the actual string projector reads one opaque value and round-trips strings verbatim", () => {
  const values = [
    "",
    "plain text",
    "first\r\nsecond\n",
    "e\u0301 and é",
    "\u0000\t🌿",
    '{"not":"decoded"}',
  ];
  for (const content of values) {
    const resource = { path: "opaque.txt", content };
    const items = stringProjector.read(resource);
    assert.deepEqual(items, [content]);
    assert.equal(stringProjector.write(items), content);
    assert.deepEqual(resource, { path: "opaque.txt", content });
  }
});

test("the actual string writer emits empty text for no items and uses the first string item", () => {
  assert.equal(stringProjector.write([]), "");
  assert.equal(stringProjector.write([""]), "");
  assert.equal(stringProjector.write(["first", "second"]), "first");
  assert.equal(stringProjector.write(["", "second"]), "");
});

test("a restriction of the actual string projector inherits its codec and refines recognition", () => {
  const textFile = restrict(stringProjector, {
    type: "text-file",
    corner: "prose",
    recognize: (resource) => resource.path.endsWith(".txt"),
  });
  const matching = { path: "entry.txt", content: "opaque\ncontent" };
  const other = { path: "entry.bin", content: matching.content };

  assert.equal(textFile.parent, stringProjector);
  assert.equal(textFile.read, stringProjector.read);
  assert.equal(textFile.write, stringProjector.write);
  assert.equal(cornerOf(textFile), "prose");
  assert.equal(rungOf(textFile), "strict");
  assert.deepEqual(entails(textFile), [textFile, stringProjector]);
  assert.equal(textFile.recognize(matching), true);
  assert.equal(textFile.recognize(other), false);
  assert.deepEqual(textFile.read(matching), [matching.content]);
  assert.equal(textFile.write(textFile.read(matching)), matching.content);
  assert.equal(classifyAt(matching, [stringProjector, textFile]), textFile);
  assert.equal(classifyAt(other, [stringProjector, textFile]), stringProjector);
  assert.equal(classifyAt(matching, [stringProjector, textFile], "bottom"), stringProjector);
  assert.equal(classifyAt(matching, [stringProjector, textFile], "prose"), textFile);
});
