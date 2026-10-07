import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { inspectSchemaPool } from "../scripts/inspect-schema-pool.mjs";
import { writeSchema } from "../scripts/write-schema.mjs";

test("pool writers use dialect validity, preserve prior data on refusal and respect dry runs", () => {
  const pool = mkdtempSync(join(tmpdir(), "schema-pool-"));
  try {
    const schema = { $id: "https://example.test/open", type: "object" };
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
    const peer = {
      $id: "https://example.test/peer",
      $ref: "https://example.test/open",
    };
    writeSchema({ pool, schema: peer });
    assert.equal(inspectSchemaPool({ pool }).checked, 2);
  } finally {
    rmSync(pool, { recursive: true, force: true });
  }
});

test("public read and write imports neither inspect a pool nor exit the importing process", () => {
  const modules = [
    new URL("../scripts/read-schema.mjs", import.meta.url).href,
    new URL("../scripts/write-schema.mjs", import.meta.url).href,
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
