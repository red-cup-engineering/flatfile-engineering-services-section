import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as trace from "../src/schema-assertion-trace.mjs";
import * as core from "../dist/index.mjs";
import { censusSchemaPath } from "../scripts/json-schema-census.mjs";
import { censusSchemaArtifacts } from "../scripts/census-schema-artifacts.mjs";
import { census } from "../dist/census.mjs";
import { identifySchemaAssertion } from "../scripts/identify-schema-assertion.mjs";
import { mergeSchemaAssertions } from "../scripts/merge-schema-assertions.mjs";
import { parseSchemaAssertions } from "../scripts/parse-schema-assertions.mjs";
import { projectSchemaAssertions } from "../scripts/project-schema-assertions.mjs";
import { schemaAssertionEavt } from "../scripts/schema-assertion-eavt.mjs";
import { schemaAssertionTriple } from "../scripts/schema-assertion-triple.mjs";
import { serializeSchemaAssertions } from "../scripts/serialize-schema-assertions.mjs";
import { unfoldSchema } from "../scripts/unfold-schema.mjs";

const script = (path) => fileURLToPath(new URL(path, import.meta.url));

test("the positional API and the request operations are one schema-assertion implementation", () => {
  for (const name of ["unfoldSchema", "foldSchema", "cohereSchemaAssertions", "projectSchemaAssertions", "mergeSchemaAssertions", "parseSchemaAssertions", "serializeSchemaAssertions", "schemaAssertionId", "schemaAssertionTriple", "schemaAssertionEavt", "schemaAssertionEavtId", "assertSchemaAssertion"])
    assert.equal(core[name], trace[name], name);
  const rows = unfoldSchema({ schema: { $id: "example/x", type: "object", properties: { a: { type: "string" } } }, base: "example/x", time: "t1" }).assertions;
  assert.equal(rows[0].e, "example/x#");
  const { content } = serializeSchemaAssertions({ assertions: rows });
  assert.deepEqual(parseSchemaAssertions({ content }).assertions, rows);
  assert.deepEqual(mergeSchemaAssertions({ traces: [rows, rows] }).assertions, trace.mergeSchemaAssertions(rows));
  assert.equal(identifySchemaAssertion({ assertion: rows[0] }).id, trace.schemaAssertionId(rows[0]));
  assert.deepEqual(schemaAssertionTriple({ assertion: rows[0] }), { s: rows[0].e, p: rows[0].a, o: rows[0].v });
  assert.deepEqual(schemaAssertionEavt({ assertion: rows[0] }).value, [rows[0].e, rows[0].a, rows[0].v, "t1"]);
  assert.equal(projectSchemaAssertions({ id: "example/x", assertions: rows }).schema.$id, "example/x");
  assert.throws(() => projectSchemaAssertions({ id: "example/y", assertions: rows }), /does not match|disagrees/);
  assert.throws(() => unfoldSchema({ schema: {}, time: "" }), /time is required/);
});

test("own special keys fold as data, never as prototype assignment", () => {
  const rows = [{ e: "#", a: "__proto__", v: {}, t: "1" }, { e: "#/__proto__", a: "kept", v: true, t: "1" }];
  const schema = trace.foldSchema(rows);
  assert.equal(Object.getPrototypeOf(schema), Object.prototype);
  assert.deepEqual(Object.keys(schema), ["__proto__"]);
  assert.equal(schema.__proto__.kept, true);
});

test("census has one classifier: the request faces answer exactly what src/census.mts classifies", () => {
  const entries = [{ path: "live/a.schema.json", content: "{}" }, { path: "legacy/read-a-schema.js", content: "function validate(value, schema) {}" }];
  assert.deepEqual(censusSchemaArtifacts({ entries }), census(entries));
  const root = mkdtempSync(join(tmpdir(), "schema-census-"));
  try {
    mkdirSync(join(root, "node_modules"));
    writeFileSync(join(root, "node_modules", "ignored.schema.json"), "{}");
    writeFileSync(join(root, "a.schema.json"), '{"$schema":"x"}');
    writeFileSync(join(root, "notes.md"), "JSON Schema notes");
    const result = censusSchemaPath({ root });
    assert.deepEqual(result.entries.map((entry) => entry.path), ["a.schema.json", "notes.md"]);
    assert.equal(result.counts["schema-document"], 1);
    assert.throws(() => censusSchemaPath({ root, maxFiles: 1 }), RangeError);
    assert.throws(() => censusSchemaPath({ root: "relative" }), /absolute/);
    const stdin = spawnSync(process.execPath, [script("../scripts/json-schema-census.mjs")], { input: JSON.stringify({ root }), encoding: "utf8" });
    assert.equal(stdin.status, 0, stdin.stderr);
    assert.deepEqual(JSON.parse(stdin.stdout).counts, result.counts);
    const out = join(root, "census.json");
    const written = spawnSync(process.execPath, [script("../scripts/json-schema-census.mjs"), "--root", root, "--out", out], { encoding: "utf8" });
    assert.equal(written.status, 0, written.stderr);
    assert.equal(spawnSync(process.execPath, [script("../scripts/json-schema-census.mjs"), "--root", root, "--out", out, "--verify"], { encoding: "utf8" }).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("search-path-for-schema takes its path as an argument or as a JSON string on stdin", () => {
  const root = mkdtempSync(join(tmpdir(), "search-schema-"));
  try {
    writeFileSync(join(root, "example.schema.json"), JSON.stringify({ $id: "urn:test:example", type: "object" }));
    const cli = script("../services/search-path-for-schema/scripts/search-path-for-schema.mjs");
    const byArgument = spawnSync(process.execPath, [cli, root], { encoding: "utf8" });
    const byStdin = spawnSync(process.execPath, [cli], { input: JSON.stringify(root), encoding: "utf8" });
    assert.equal(byArgument.status, 0, byArgument.stderr);
    assert.equal(byArgument.stdout, byStdin.stdout);
    assert.equal(JSON.parse(byArgument.stdout).schemas[0].schema, "urn:test:example");
    assert.equal(spawnSync(process.execPath, [cli, "a", "b"], { encoding: "utf8" }).status, 64);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
