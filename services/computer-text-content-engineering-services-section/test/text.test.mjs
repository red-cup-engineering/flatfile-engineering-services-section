import assert from "node:assert/strict";
import test from "node:test";
import { tokenizeWords, isNumericWord } from "../src/text.mjs";

test("word segmentation preserves Unicode, joiners, numeric amounts and offsets", () => {
  const text = "Café e\u0301lan don't mother-in-law ʼalone 世界 €5 1,195 3.2% $40.5bn.";
  const spans = tokenizeWords(text, 7);
  assert.deepEqual(spans.map(({ text }) => text), ["Café", "e\u0301lan", "don't", "mother-in-law", "ʼalone", "世界", "€5", "1,195", "3.2%", "$40.5bn"]);
  for (const span of spans) {
    assert.equal(text.slice(span.start - 7, span.end - 7), span.text);
    assert.equal(Boolean(span.numeric), isNumericWord(span.text));
    assert.ok(Object.isFrozen(span));
  }
  assert.deepEqual(tokenizeWords("… , -- !"), []);
});
