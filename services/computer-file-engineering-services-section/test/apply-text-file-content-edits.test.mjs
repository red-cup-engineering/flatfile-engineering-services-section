import assert from "node:assert/strict";
import test from "node:test";
import { applyTextFileContentEdits } from "../scripts/apply-text-file-content-edits.mjs";

test("applies ordered source-span edits and retains the filepath", () => {
  const reading = { type: "TextFileRead", path: "/workspace/index.mjs", text: "import './a.mjs';\nimport './b.mjs';\n" };
  const edits = [
    { type: "TextFileContentEdit", path: reading.path, start: 8, end: 15, before: "./a.mjs", after: "@x/a" },
    { type: "TextFileContentEdit", path: reading.path, start: 26, end: 33, before: "./b.mjs", after: "@x/b" },
  ];
  const result = applyTextFileContentEdits({ reading, edits });
  assert.equal(result.text, "import '@x/a';\nimport '@x/b';\n");
  assert.equal(result.path, reading.path);
});

test("refuses an edit whose precondition does not match the carried text", () => {
  const reading = { type: "TextFileRead", path: "/workspace/index.mjs", text: "import './a.mjs';\n" };
  const edit = { type: "TextFileContentEdit", path: reading.path, start: 8, end: 15, before: "./b.mjs", after: "@x/b" };
  assert.throws(() => applyTextFileContentEdits({ reading, edits: [edit] }), /precondition failed/);
});
