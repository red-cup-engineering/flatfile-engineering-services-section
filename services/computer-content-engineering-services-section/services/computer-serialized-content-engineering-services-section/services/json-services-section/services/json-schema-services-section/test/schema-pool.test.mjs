import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectSchemaPool } from "../scripts/inspect-schema-pool.mjs";
import { checkSchemaPool, writeSchema } from "../services/writing-a-schema/src/write-a-schema.js";
import { readSchema } from "../scripts/read-a-schema.mjs";

test("pool writers use dialect validity, preserve prior data on refusal and respect dry runs", () => {
  const pool = mkdtempSync(join(tmpdir(), "schema-pool-"));
  try {
    // Seated terms must refuse the empty object and declare a root type: the pool's negative control.
    const schema = {
      $id: "example/open",
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };
    const first = writeSchema({ pool, schema });
    const before = readFileSync(first.path, "utf8");
    assert.equal(inspectSchemaPool({ pool }).ok, true);
    assert.throws(() => writeSchema({ pool, schema }), /already exists/);
    assert.throws(() =>
      writeSchema({
        pool,
        schema: { ...schema, $ref: "missing" },
        amend: true,
      }),
    );
    assert.equal(readFileSync(first.path, "utf8"), before);
    writeSchema({
      pool,
      schema: { ...schema, additionalProperties: false },
      amend: true,
      dryRun: true,
    });
    assert.equal(readFileSync(first.path, "utf8"), before);
    // A pool resolves siblings by address; a URL-scheme $ref is external and is refused even when a sibling carries that $id.
    const peer = {
      $id: "example/peer",
      type: "object",
      required: ["open"],
      properties: { open: { $ref: "example/open" } },
    };
    assert.throws(
      () => writeSchema({ pool, schema: { ...peer, properties: { open: { $ref: "https://example.test/open" } } } }),
      /does not resolve/,
    );
    writeSchema({ pool, schema: peer });
    assert.equal(inspectSchemaPool({ pool }).checked, 2);
    assert.equal(readSchema({ pool, name: "peer" }).schema.$id, "example/peer");
    assert.equal(readSchema({ pool, name: "example/open" }).path, first.path);
    assert.throws(() => readSchema({ pool, name: "absent" }), /no schema absent/);
    assert.equal(checkSchemaPool({ pool }).ok, true);
  } finally {
    rmSync(pool, { recursive: true, force: true });
  }
});

test("public read and write imports neither inspect a pool nor exit the importing process", () => {
  const modules = [
    new URL("../scripts/read-a-schema.mjs", import.meta.url).href,
    new URL("../services/writing-a-schema/src/write-a-schema.js", import.meta.url).href,
  ];
  const script =
    modules
      .map((url) => "await import(" + JSON.stringify(url) + ");")
      .join("") + 'process.stdout.write("imported");';
  assert.equal(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: tmpdir(),
      encoding: "utf8",
    }),
    "imported",
  );
});

test("pool inspection checks nested references and impossible object requirements before writing", async () => {
  const { inspectSchemaCorpus } = await import(
    "../scripts/inspect-schema-corpus.mjs"
  );
  const missing = {
    $id: "urn:test:missing",
    type: "object",
    properties: { hidden: { $ref: "urn:absent" } },
  };
  assert.equal(
    inspectSchemaCorpus({ schemas: [missing] }).errors[0].keyword,
    "$ref",
  );
  const impossible = {
    $id: "urn:test:impossible",
    type: "object",
    required: ["missing"],
    properties: {},
    additionalProperties: false,
  };
  assert.equal(
    inspectSchemaCorpus({ schemas: [impossible] }).errors[0].keyword,
    "required",
  );
});

test("a schema that admits the empty object, or declares no root type, is never seated", () => {
  const pool = mkdtempSync(join(tmpdir(), "schema-pool-"));
  try {
    assert.throws(() => writeSchema({ pool, schema: { $id: "example/open", type: "object" } }), /admits the empty object/);
    assert.throws(() => writeSchema({ pool, schema: { $id: "example/open" } }), /not a usable contract/);
    assert.equal(inspectSchemaPool({ pool }).ok, false);
    assert.match(inspectSchemaPool({ pool }).errors[0].message, /no schemas/);
    assert.deepEqual(readdirSync(pool), []);
  } finally {
    rmSync(pool, { recursive: true, force: true });
  }
});

test("the read-a-schema process face names, lists, shows and judges against the pool it discovers", () => {
  const pool = mkdtempSync(join(tmpdir(), "schema-pool-"));
  const reader = fileURLToPath(new URL("../scripts/read-a-schema.mjs", import.meta.url));
  try {
    writeSchema({ pool, schema: { $id: "example/open", type: "object", required: ["name"], properties: { name: { type: "string" } } } });
    const run = (args, input) => spawnSync(process.execPath, [reader, ...args], { input, encoding: "utf8" });
    assert.deepEqual(JSON.parse(run(["--list", "--pool", pool], "").stdout).schemas.map(({ name }) => name), ["open"]);
    assert.equal(JSON.parse(run(["open", "--show", "--pool", pool], "").stdout).$id, "example/open");
    assert.equal(run(["open", "--pool", pool], '{"name":"x"}').status, 0);
    const refused = run(["example/open", "--pool", pool], "{}");
    assert.equal(refused.status, 1);
    assert.equal(JSON.parse(refused.stdout).errors[0].keyword, "required");
    assert.equal(JSON.parse(run([], JSON.stringify({ pool, name: "open" })).stdout).path, join(pool, "open.schema.json"));
    assert.equal(run(["absent", "--pool", pool], "{}").status, 1);
  } finally {
    rmSync(pool, { recursive: true, force: true });
  }
});

test("the writing-a-schema process face seats, amends, dry-runs and checks the pool", () => {
  const pool = mkdtempSync(join(tmpdir(), "schema-pool-"));
  const writer = fileURLToPath(new URL("../services/writing-a-schema/src/write-a-schema.js", import.meta.url));
  try {
    const schema = { $id: "example/open", type: "object", required: ["name"], properties: { name: { type: "string" } } };
    const run = (args, input = "") => spawnSync(process.execPath, [writer, "--pool", pool, ...args], { input, encoding: "utf8" });
    assert.equal(JSON.parse(run(["--dry-run"], JSON.stringify(schema)).stdout).dryRun, true);
    assert.deepEqual(readdirSync(pool), []);
    assert.equal(run([], JSON.stringify(schema)).status, 0);
    assert.equal(run([], JSON.stringify(schema)).status, 1);
    assert.equal(run(["--amend"], JSON.stringify({ ...schema, additionalProperties: false })).status, 0);
    const check = run(["--check"]);
    assert.equal(check.status, 0);
    assert.equal(JSON.parse(check.stdout).checked, 1);
    writeFileSync(join(pool, "broken.schema.json"), "{");
    const broken = JSON.parse(run(["--check"]).stdout);
    assert.equal(broken.ok, false);
    assert.match(broken.broken["broken.schema.json"], /not valid JSON/);
  } finally {
    rmSync(pool, { recursive: true, force: true });
  }
});
