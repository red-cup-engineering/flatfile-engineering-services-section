import assert from "node:assert/strict";
import test from "node:test";
import { admitNoteDescription } from "../scripts/note-description.mjs";

test("admits a one-sentence note description grounded in note content", () => {
  const text = "Maps each active description reader to its engineering owner so duplicated rules can be replaced by one domain-specific admission operation.";
  assert.equal(admitNoteDescription(text).text, text);
});

test("rejects generic framing and descriptions outside the note word budget", () => {
  assert.throws(() => admitNoteDescription("This note explains the description system and its engineering ownership across the repository for future maintainers and readers."), /directly/u);
  assert.throws(() => admitNoteDescription("Explains descriptions."), /15 to 30/u);
});
