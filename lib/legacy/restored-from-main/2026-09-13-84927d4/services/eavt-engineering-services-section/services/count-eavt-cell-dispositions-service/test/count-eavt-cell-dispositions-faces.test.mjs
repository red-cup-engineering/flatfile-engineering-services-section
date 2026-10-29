import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { countEavtCellDispositions } from "../scripts/count-eavt-cell-dispositions.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "one acknowledged claim",
    "input": {
      "rows": [
        {
          "e": "x",
          "a": "is",
          "v": "y",
          "t": 1
        },
        {
          "e": "ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ",
          "a": "acknowledged-by",
          "v": "actor:c",
          "t": 2
        }
      ],
      "entity": "x",
      "attribute": "is"
    },
    "output": {
      "type": "EavtCellDispositions",
      "entity": "x",
      "attribute": "is",
      "asserted": 1,
      "wit": 1,
      "ack": 1,
      "claims": [
        {
          "id": "ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ",
          "predicate": "is",
          "object": "y",
          "witnesses": [],
          "acknowledgers": [
            "actor:c"
          ]
        }
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await countEavtCellDispositions(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/count-eavt-cell-dispositions.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
