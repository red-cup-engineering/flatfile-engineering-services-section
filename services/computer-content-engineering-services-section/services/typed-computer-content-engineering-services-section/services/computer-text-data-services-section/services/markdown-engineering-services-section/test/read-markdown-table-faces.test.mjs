import assert from "node:assert/strict";
import test from "node:test";
import { operation } from "../scripts/read-markdown-table.mjs";
import { readMarkdownTable } from "../src/read-markdown-table.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "reads the first table under a heading",
    "input": {
      "text": "# One\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n",
      "heading": "One"
    },
    "output": {
      "headers": [
        "A",
        "B"
      ],
      "rows": [
        {
          "A": "1",
          "B": "2"
        }
      ],
      "rowCount": 1,
      "position": {
        "line": 3
      }
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "refuses when no table exists",
    "input": {
      "text": "# Title\n\nJust prose, no table.\n"
    },
    "output": {
      "refused": "NO_TABLE_FOUND",
      "heading": null,
      "tableIndex": 0
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await readMarkdownTable(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
