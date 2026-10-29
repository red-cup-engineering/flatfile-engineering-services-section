#!/usr/bin/env node
// read-eavt-row — the transform: decode one on-disk line (base64-of-canonical-CBOR) back to its
// {e,a,v,t} row. Throws on a torn/non-conformant line — callers that must tolerate torn lines use
// read-eavt-file.mjs instead, which catches per-line. Thin: the law lives in src/eavt.mjs.
import { decodeRow } from "../src/eavt.mjs";

export default function readEavtRowScript(line) {
  return decodeRow(line);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [line] = process.argv.slice(2);
  if (!line) {
    console.error("usage: read-eavt-row.mjs <base64-line>");
    process.exit(1);
  }
  console.log(JSON.stringify(readEavtRowScript(line)));
}
