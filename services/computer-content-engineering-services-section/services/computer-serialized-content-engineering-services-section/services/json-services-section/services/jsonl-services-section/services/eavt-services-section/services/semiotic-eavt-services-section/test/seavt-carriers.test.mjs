import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { bindJsonTemplate } from "@red-cup-engineering/semiotic-eavt-services-section/bind-json-template";

test("JSON template pointers retain escaped keys, literal percent characters, and root values", () => {
  assert.deepEqual(
    bindJsonTemplate({ template: { $pointer: "" }, parameters: { v: 1 } }),
    { v: 1 },
  );
  assert.equal(
    bindJsonTemplate({
      template: { $pointer: "/a%20b" },
      parameters: { "a%20b": 3, "a b": 4 },
    }),
    3,
  );
  assert.throws(
    () =>
      bindJsonTemplate({ template: { $pointer: "/missing" }, parameters: {} }),
    /does not resolve/,
  );
});
