#!/usr/bin/env node
// assert-eavt-row — the effect: validate a value is exactly a conformant {e,a,v,t} row, throwing
// otherwise. Thin: the law lives in src/eavt.mjs.
import { assertRow } from "../src/eavt.mjs";

export default function assertEavtRowScript(row) {
  return assertRow(row);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowJson] = process.argv.slice(2);
  if (!rowJson) {
    console.error("usage: assert-eavt-row.mjs <row-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(assertEavtRowScript(JSON.parse(rowJson))));
}
