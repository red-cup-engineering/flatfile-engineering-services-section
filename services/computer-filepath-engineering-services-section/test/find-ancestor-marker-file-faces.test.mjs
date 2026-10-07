import assert from "node:assert/strict";
import test from "node:test";
import { findAncestorMarkerFile, operation } from "../scripts/find-ancestor-marker-file.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "no ancestor holds the marker",
    "input": {
      "start": "/nonexistent/561-group/a/b",
      "marker": "no-such-marker-file-561"
    },
    "output": {
      "type": "AncestorMarkerFile",
      "start": "/nonexistent/561-group/a/b",
      "marker": "no-such-marker-file-561",
      "path": null
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await findAncestorMarkerFile(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
