#!/usr/bin/env node
// dedupe-eavt-rows — the effect: dedupe an in-hand rows array by canonical id, first occurrence
// kept (G-Set semantics), order-preserving. Thin: the law lives in src/eavt.mjs.
import { dedupe } from "../src/eavt.mjs";

export default function dedupeEavtRowsScript(rows) {
  return dedupe(rows);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowsJson] = process.argv.slice(2);
  if (!rowsJson) {
    console.error("usage: dedupe-eavt-rows.mjs <rows-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(dedupeEavtRowsScript(JSON.parse(rowsJson)), null, 2));
}
