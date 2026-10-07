import assert from "node:assert/strict";
import test from "node:test";
import { statPath, operation } from "../scripts/stat-path.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "stat-path example",
    "input": {
      "path": "/nonexistent/561-group-stat-path-example"
    },
    "output": {
      "type": "PathStat",
      "path": "/nonexistent/561-group-stat-path-example",
      "exists": false,
      "kind": "absent",
      "size": null,
      "mtimeMs": null
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await statPath(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
