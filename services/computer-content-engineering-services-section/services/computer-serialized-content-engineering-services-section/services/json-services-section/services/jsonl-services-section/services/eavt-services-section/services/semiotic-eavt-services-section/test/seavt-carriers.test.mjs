import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { jsonToTerm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";
import { bindJsonTemplate } from "@red-cup-engineering/semiotic-eavt-services-section/bind-json-template";

test("SEAVT commands execute their declared JSON carriers and preserve recorded content", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "seavt-carriers-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceRoot = join(root, "source"),
    targetRoot = join(root, "target");
  mkdirSync(sourceRoot);
  const at = "2026-09-20T00:00:00Z",
    row = { e: jsonToTerm("s"), a: jsonToTerm("p"), v: jsonToTerm(3), t: at };
  const request = {
    root,
    objectKind: "test.record",
    category: "test",
    record: { value: "retained" },
    recordedAt: at,
    told: { for: true, against: false },
  };
  const examples = [
    ["admit-seavt-row", row],
    ["normalize-seavt-row", [row.e, row.a, row.v, row.t]],
    [
      "bind-json-template",
      { template: { v: { $pointer: "/a~1b" } }, parameters: { "a/b": 3 } },
    ],
    ["append-seavt-entries", { root, feed: "test", entries: [row], at }],
    ["read-seavt-entries", { root, feed: "test", at }],
    [
      "read-seavt-entries-at-path",
      { path: join(root, "data/logs/2026/09/20/test.jsonl") },
    ],
    ["record-semantic-record", request],
    [
      "query-semantic-records",
      { root, objectKind: "test.record", category: "test" },
    ],
    [
      "admit-semantic-record",
      {
        ...request,
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          required: ["value"],
        },
      },
    ],
    [
      "record-configured-semantic-record",
      {
        configuration: {
          ...request,
          record: { $pointer: "/record" },
          schema: { type: "object" },
        },
        parameters: { record: { value: "configured" } },
      },
    ],
    [
      "check-semantic-record-references",
      {
        sourceRoot,
        journalRoot: root,
        objectKind: "test.record",
        category: "test",
        referencePointer: "/reference",
      },
    ],
    [
      "check-semantic-record-responses",
      {
        issuesRoot: sourceRoot,
        journalRoot: root,
        repositoryRoot: root,
        objectKind: "test.record",
        category: "test",
        responseIssuePathPointer: "/issue",
        responseHorizonPointer: "/horizon",
        defaultHorizonDays: 7,
        now: at,
      },
    ],
    ["inventory-semantic-record-retirement", { sourceRoot }],
    ["replay-semantic-record-retirement", { sourceRoot, targetRoot }],
  ];
  for (const [slug, input] of examples) {
    const url = new URL(
        `../src/${slug}.mjs`,
        import.meta.url,
      ),
      module = await import(url);
    const admission = validateSchemaInstance({
      instance: input,
      schema: module.inputSchema,
    });
    assert.equal(
      admission.ok,
      true,
      slug + " input: " + JSON.stringify(admission.errors),
    );
    const result = spawnSync(process.execPath, [fileURLToPath(url)], {
      input: JSON.stringify(input) + "\n",
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 0, slug + ": " + result.stderr);
    const output = JSON.parse(result.stdout);
    const outcome = validateSchemaInstance({
      instance: output,
      schema: module.outputSchema,
    });
    assert.equal(
      outcome.ok,
      true,
      slug + " output: " + JSON.stringify(outcome.errors),
    );
    if (slug === "bind-json-template") assert.deepEqual(output, { v: 3 });
    if (slug === "query-semantic-records")
      assert.deepEqual(
        output.map((x) => x.record),
        [{ value: "retained" }],
      );
    if (slug === "read-seavt-entries")
      assert.deepEqual(output, [{ entry: row, trace: 1 }]);
  }
});

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
