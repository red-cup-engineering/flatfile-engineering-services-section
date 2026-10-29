import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { askEavtCell } from "../scripts/ask-eavt-cell.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "answers one affirmed cell",
    "input": {
      "rows": [
        {
          "e": "x",
          "a": "is",
          "v": "y",
          "t": 1
        }
      ],
      "entity": "x",
      "attribute": "is"
    },
    "output": {
      "type": "EavtCellAnswer",
      "entity": "x",
      "attribute": "is",
      "asserted": 1,
      "saturated": 1,
      "settled": {
        "affirmed": [
          {
            "predicate": "is",
            "object": "y"
          }
        ],
        "denied": [],
        "contradicted": []
      },
      "contested": false,
      "proofTree": {
        "root": "x",
        "nodes": {
          "x": {
            "e": "x",
            "a": "is",
            "v": "y",
            "t": 1
          }
        },
        "edges": [],
        "missing": [],
        "cycles": [],
        "depth": 0
      },
      "closure": {
        "saturation": 1,
        "transfer": 1,
        "kappa": 1,
        "regime": "strict"
      },
      "regime": "strict"
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await askEavtCell(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/ask-eavt-cell.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
