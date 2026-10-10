#!/usr/bin/env node
// Reading a schema from a pool, with one implementation and two faces.
//
//   import { readSchema } from ".../read-a-schema"      { pool, name } -> { path, schema }
//   read-a-schema < request.json                        the same request on stdin, JSON on stdout
//   read-a-schema NAME [--pool DIR | --from DIR] [--show]   NAME is a filename stem or an $id;
//                                                       reads an instance on stdin and judges it
//   read-a-schema --list [--pool DIR | --from DIR]      names every schema the pool holds
//
// Pool discovery walks up from --from (default: the working directory) to the nearest lib/schemas,
// and only where that finds nothing walks up from this script's own location. The pool itself is
// read by readSchemaPool; the instance judgment is the one validator of src/index.mts.
import { readFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSchemaPool, readSchemaPool } from "./read-schema-pool.mjs";

export const inputSchema = {
  type: "object",
  required: ["pool", "name"],
  properties: { pool: { type: "string" }, name: { type: "string" } },
};
export const outputSchema = { type: "object", required: ["path", "schema"] };

export function readSchema({ pool, name }) {
  if (typeof name !== "string" || !name)
    throw new TypeError("name must be nonempty text");
  const matches = readSchemaPool({ pool }).records.filter(
    (record) =>
      record.name.replace(/\.schema\.json$/u, "") === name ||
      record.schema.$id === name,
  );
  if (matches.length !== 1)
    throw new TypeError(
      matches.length ? `ambiguous schema ${name}` : `no schema ${name} in pool`,
    );
  return { path: matches[0].path, schema: matches[0].schema };
}

async function main(args) {
  const emit = (value, code = 0) => {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    process.exit(code);
  };
  const refuse = (message) => emit({ ok: false, error: message }, 1);
  const argument = (flag) => {
    const index = args.indexOf(flag);
    return index < 0 ? undefined : args[index + 1];
  };

  if (args.length === 0) {
    let result;
    try { result = readSchema(JSON.parse(readFileSync(0, "utf8"))); }
    catch (error) { refuse(error instanceof Error ? error.message : String(error)); }
    emit(result);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const from = argument("--from") ?? process.cwd();
  const poolPath = argument("--pool") ?? discoverSchemaPool({ from, near: here });
  if (!poolPath) refuse(`⊥ no schema pool at or above ${from}; pass --pool or --from`);

  let records;
  try { ({ records } = readSchemaPool({ pool: poolPath })); }
  catch (error) { refuse(error instanceof Error ? error.message : String(error)); }
  const byName = new Map();
  for (const record of records) {
    const name = record.name.replace(/\.schema\.json$/u, "");
    if (byName.has(name) || byName.has(record.schema.$id)) refuse(`duplicate schema address in pool: ${name}`);
    byName.set(name, record);
    byName.set(record.schema.$id, record);
  }

  if (args.includes("--list"))
    emit({
      ok: true,
      schemas: records.map(({ name, path, schema }) => ({ name: name.replace(/\.schema\.json$/u, ""), $id: schema.$id, path: relative(from, path) })),
    });

  const named = args[0];
  if (!named || named.startsWith("--")) refuse("name a schema by filename stem or $id");
  const found = byName.get(named);
  if (!found) refuse(`no schema ${JSON.stringify(named)} in pool`);
  if (args.includes("--show")) emit({ ok: true, $id: found.schema.$id, schema: found.schema });

  const input = readFileSync(0, "utf8").trim();
  if (!input) refuse("no JSON instance on stdin");
  let instance;
  try { instance = JSON.parse(input); }
  catch (error) { refuse(`stdin is not JSON: ${error instanceof Error ? error.message : String(error)}`); }
  const { schemaCorpus, validateInstance } = await import("../dist/index.mjs");
  const result = validateInstance(instance, found.schema, schemaCorpus(records.map((record) => record.schema)));
  emit({ ok: result.ok, schema: found.schema.$id, errors: result.errors }, result.ok ? 0 : 1);
}

if (import.meta.main) await main(process.argv.slice(2));
