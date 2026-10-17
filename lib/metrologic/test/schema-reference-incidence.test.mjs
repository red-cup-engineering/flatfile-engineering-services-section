import test from "node:test";
import assert from "node:assert/strict";
import { schemaReferenceIncidence } from "../src/articulation/predicating/positing/settling/site.mjs";

const contract = (id, schema, references = []) => ({ id, schema: { $id: id, ...schema }, references });

test("a schema that names its own $id, or a document it declares below its root, composes nothing external", () => {
  const recursive = contract("t/closure", {
    type: "object",
    properties: { next: { $ref: "t/closure" }, nested: { $id: "t/inner", type: "object", properties: { back: { $ref: "t/inner" } } } },
  });
  assert.deepEqual(schemaReferenceIncidence([recursive]).unresolved, []);
});

test("an external arrow still resolves only through explicit composition", () => {
  const target = contract("t/target", { type: "string" });
  const composed = contract("t/composed", { properties: { a: { $ref: "t/target" } } }, [target]);
  const bare = contract("t/bare", { properties: { a: { $ref: "t/target" } } });
  assert.deepEqual(schemaReferenceIncidence([composed, target]).unresolved, []);
  assert.deepEqual(schemaReferenceIncidence([bare, target]).unresolved.map(({ from, ref }) => ({ from, ref })),
    [{ from: "t/bare", ref: "t/target" }]);
});
