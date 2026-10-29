#!/usr/bin/env node
// read-eavt-entity-rows — the effect: read one entity's rows off an EAVT log via the on-disk
// entity index (built lazily, reused while the trace's content digest matches), instead of
// decoding every row. Thin: the law lives in src/eavt.mjs.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { readEavtEntityRows } from "../src/eavt.mjs";

export default function readEavtEntityRowsScript(path, entity) {
  return readEavtEntityRows({ path, entity });
}

if (fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [path, entity] = process.argv.slice(2);
  if (!path || !entity) {
    console.error("usage: read-eavt-entity-rows.mjs <path> <entity>");
    process.exit(1);
  }
  console.log(JSON.stringify(readEavtEntityRowsScript(path, entity), null, 2));
}
