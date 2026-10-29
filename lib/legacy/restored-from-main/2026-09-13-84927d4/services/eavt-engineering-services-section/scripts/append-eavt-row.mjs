#!/usr/bin/env node
// append-eavt-row — the effect: durably append one {e,a,v,t} row to an EAVT log (OP1/OP2/OP4).
// Thin: the law lives in src/eavt.mjs.
import { appendEavt } from "../src/eavt.mjs";

export default function appendEavtRowScript(path, row) {
  return appendEavt(path, row);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, rowJson] = process.argv.slice(2);
  if (!path || !rowJson) {
    console.error("usage: append-eavt-row.mjs <path> <row-json>");
    process.exit(1);
  }
  console.log(appendEavtRowScript(path, JSON.parse(rowJson)));
}
