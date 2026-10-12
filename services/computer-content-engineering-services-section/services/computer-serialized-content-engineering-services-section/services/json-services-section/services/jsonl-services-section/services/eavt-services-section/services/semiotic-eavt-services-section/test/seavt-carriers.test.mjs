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
import { seavtOfJson, seavtRow } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";
import { normalizeSeavtRow } from "@red-cup-engineering/semiotic-eavt-services-section/normalize-seavt-row";
import { eavtId } from "@red-cup-engineering/eavt-services-section/row";

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

test("SEAVT preserves typed SEN coordinate syntax while normalizing only EAVT carrier shape", () => {
  const t1 = "2026-10-12T12:00:00Z", t2 = "2026-10-12T12:00:01Z";
  const witnessed = seavtOfJson("subject", "relation", { observation: true }, t1);

  assert.deepEqual(witnessed.e, jsonToTerm("subject"));
  assert.deepEqual(witnessed.a, jsonToTerm("relation"));
  assert.deepEqual(witnessed.v, jsonToTerm({ observation: true }));
  assert.deepEqual(normalizeSeavtRow([witnessed.e, witnessed.a, witnessed.v, witnessed.t]), witnessed);
  assert.deepEqual(normalizeSeavtRow(witnessed), witnessed);
  assert.equal(eavtId(normalizeSeavtRow(witnessed)), eavtId(witnessed), "representation is not a new witness");
  assert.notEqual(eavtId(seavtRow({ ...witnessed, t: t2 })), eavtId(witnessed), "new observation time is a new witness");
  assert.throws(
    () => seavtRow({ ...witnessed, e: ["var", 0] }),
    /closed, inferable SEN term/u,
    "unbound variables cannot enter the witnessed coordinates",
  );
});
