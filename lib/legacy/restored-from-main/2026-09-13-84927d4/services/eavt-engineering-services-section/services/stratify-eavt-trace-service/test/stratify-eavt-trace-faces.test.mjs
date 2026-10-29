import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { stratifyEavtTrace } from "../scripts/stratify-eavt-trace.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "stratifies a subject whose earlier assertion was retracted",
    "input": {
      "subject": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "rows": [
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "named",
          "v": "pebble",
          "t": 1
        },
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "named",
          "v": null,
          "t": 2
        },
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "located-in",
          "v": "riverbed",
          "t": 3
        }
      ]
    },
    "output": {
      "entity": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "asserted": [
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "named",
          "v": "pebble",
          "t": 1
        },
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "named",
          "v": null,
          "t": 2
        },
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "located-in",
          "v": "riverbed",
          "t": 3
        }
      ],
      "saturated": [
        {
          "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
          "a": "located-in",
          "v": "riverbed",
          "t": 3
        }
      ],
      "settled": {
        "entity": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
        "fiber": [
          {
            "predicate": "located-in",
            "object": "riverbed",
            "value": {
              "pos": 1,
              "neg": 0,
              "evidence": [
                [
                  "ni:///sha-256;kWcuNZTy0UUoePLp0sLrYzk13OCIIeu90NFN997w5js"
                ],
                []
              ]
            }
          }
        ]
      },
      "closure": {
        "saturation": 1,
        "transfer": 1,
        "kappa": 1,
        "regime": "strict"
      }
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await stratifyEavtTrace(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/stratify-eavt-trace.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
