#!/usr/bin/env node
// supersede-eavt-rows — the effect: the per-predicate functional read-lens over an in-hand rows
// array — keep, for each functional predicate, only the max-t row; non-functional rows all accrue.
// A READ-time latest-t projection: mutates nothing. Thin: the law lives in src/eavt.mjs.
import { supersede } from "../src/eavt.mjs";

export default function supersedeEavtRowsScript(rows, functional) {
  return supersede(rows, Array.isArray(functional) ? new Set(functional) : functional);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowsJson, functionalJson] = process.argv.slice(2);
  if (!rowsJson) {
    console.error("usage: supersede-eavt-rows.mjs <rows-json> [functional-predicates-json]");
    process.exit(1);
  }
  const functional = functionalJson ? JSON.parse(functionalJson) : undefined;
  console.log(JSON.stringify(supersedeEavtRowsScript(JSON.parse(rowsJson), functional), null, 2));
}
