import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { operations, runSchemaOperation, schemaOperationNames } from "../scripts/run-schema-operation.mjs";

const runner = fileURLToPath(new URL("../scripts/run-schema-operation.mjs", import.meta.url));

test("dispatches schema-children to its own pure function", async () => {
  const result = await runSchemaOperation("schema-children", { properties: { a: { type: "string" } } });
  assert.deepEqual(result, [["properties/a", { type: "string" }]]);
});

test("dispatches resolve-schema-pointer to its own pure function", async () => {
  const result = await runSchemaOperation("resolve-schema-pointer", { document: { a: [1, 2] }, pointer: "/a/1" });
  assert.deepEqual(result, { found: true, value: 2 });
});

test("refuses an unknown operation name", async () => {
  await assert.rejects(() => runSchemaOperation("not-a-real-operation", {}), TypeError);
});

test("the operations table holds exactly the nineteen former run-<name>.mjs tails, one function each", () => {
  assert.deepEqual([...schemaOperationNames].sort(), [
    "admit-schema", "admit-schema-assertion", "assert-schema", "census-schema-artifacts",
    "cohere-schema-assertions", "fold-schema-assertions", "identify-schema-assertion",
    "inspect-schema-corpus", "merge-schema-assertions", "parse-schema-assertions",
    "project-schema-assertions", "resolve-schema-pointer", "resolve-schema-reference",
    "schema-assertion-eavt", "schema-assertion-triple", "schema-children",
    "serialize-schema-assertions", "unfold-schema", "validate-schema-instance",
  ].sort());
  for (const name of schemaOperationNames) assert.equal(typeof operations[name], "function");
});

test("CLI: operation name as an explicit argument reads stdin JSON and writes stdout JSON", () => {
  const result = spawnSync(process.execPath, [runner, "schema-children"], {
    input: `${JSON.stringify({ items: { type: "boolean" } })}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [["items", { type: "boolean" }]]);
});

test("CLI: an unknown operation name refuses instead of silently producing nothing", () => {
  const result = spawnSync(process.execPath, [runner, "not-a-real-operation"], {
    input: "{}\n",
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
});
