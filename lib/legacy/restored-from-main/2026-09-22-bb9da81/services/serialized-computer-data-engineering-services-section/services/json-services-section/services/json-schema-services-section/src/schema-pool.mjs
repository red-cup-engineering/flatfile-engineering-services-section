import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync, linkSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { compileJsonSchema } from "@red-cup-engineering/computer-data-engine/validation";
import { createSchema } from "../dist/index.mjs";

/** Find the nearest schema pool from the explicit asking directory. */
export function resolveSchemaPool({ pool, from = process.cwd() } = {}) {
  if (pool) return resolve(pool);
  let directory = resolve(from);
  for (;;) {
    const candidate = join(directory, "lib/schemas");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) throw new TypeError("no schema pool at or above " + from + "; pass --pool or --from");
    directory = parent;
  }
}

/** Read each pool document once and admit its schema through the shared engine. */
export function readSchemaPool(pool) {
  const records = readdirSync(pool).filter(name => name.endsWith(".schema.json")).sort().map(file => {
    const path = join(pool, file);
    const { schema } = createSchema(JSON.parse(readFileSync(path, "utf8")));
    return Object.freeze({ path, name: file.slice(0, -12), schema });
  });
  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.schema.$id)) throw new TypeError("duplicate schema $id " + record.schema.$id);
    ids.add(record.schema.$id);
  }
  return Object.freeze(records);
}

/** Check complete schema graphs without guessing an instance or fetching a reference. */
export function inspectSchemaPool(records) {
  const errors = records.flatMap(record => {
    const references = records.filter(other => other !== record).map(other => other.schema);
    return compileJsonSchema(record.schema, { references }).validate(undefined).issues
      .filter(issue => issue.kind === "schema")
      .map(issue => Object.freeze({ file: record.path, ...issue }));
  });
  return Object.freeze({ ok: errors.length === 0, checked: records.length, errors: Object.freeze(errors) });
}

/** Admit a replacement graph before atomically writing its changed document. */
export function writeSchemaToPool(pool, input, { amend = false, dryRun = false } = {}) {
  const { schema } = createSchema(input);
  const stem = schema.$id.split("/").at(-1).replace(/\.schema\.json$|\.json$/u, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(stem)) throw new TypeError("schema $id needs a filename-safe final segment");
  const path = join(pool, stem + ".schema.json");
  const records = readSchemaPool(pool);
  const existing = records.find(record => record.path === path);
  if (Boolean(existing) !== amend) throw new TypeError(existing ? "schema already exists; use --amend" : "--amend requires an existing schema");
  if (records.some(record => record.path !== path && record.schema.$id === schema.$id)) throw new TypeError("schema $id already belongs to another file");
  const next = [...records.filter(record => record.path !== path), { path, name: stem, schema }];
  const report = inspectSchemaPool(next);
  if (!report.ok) throw new TypeError(JSON.stringify(report.errors));
  if (!dryRun) {
    const temporary = path + "." + randomUUID() + ".tmp";
    try {
      writeFileSync(temporary, JSON.stringify(schema, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      if (amend) renameSync(temporary, path);
      else linkSync(temporary, path);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
  return Object.freeze({ ok: true, dryRun, path, schema: schema.$id });
}
