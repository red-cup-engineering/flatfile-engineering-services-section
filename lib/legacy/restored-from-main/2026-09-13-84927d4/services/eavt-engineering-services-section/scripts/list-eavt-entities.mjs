#!/usr/bin/env node
// list-eavt-entities — the effect: read an EAVT log off disk and list its distinct subjects, in
// first-occurrence order. Thin: the law (dedupe, listing) lives in src/eavt.mjs.
import { readEavtFile, listEntities } from "../src/eavt.mjs";

export default function listEavtEntitiesScript(path) {
  const rows = readEavtFile(path);
  return listEntities(rows);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: list-eavt-entities.mjs <path>");
    process.exit(1);
  }
  console.log(JSON.stringify(listEavtEntitiesScript(path), null, 2));
}
