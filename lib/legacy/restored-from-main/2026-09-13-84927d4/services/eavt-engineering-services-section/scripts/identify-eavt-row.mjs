#!/usr/bin/env node
// identify-eavt-row — the effect: a row's content identity, the RFC 6920 `ni:` URI of its RFC 8949
// canonical CBOR encoding. Thin: the law lives in src/eavt.mjs.
import { rowId } from "../src/eavt.mjs";

export default function identifyEavtRowScript(row) {
  return rowId(row);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowJson] = process.argv.slice(2);
  if (!rowJson) {
    console.error("usage: identify-eavt-row.mjs <row-json>");
    process.exit(1);
  }
  console.log(identifyEavtRowScript(JSON.parse(rowJson)));
}
