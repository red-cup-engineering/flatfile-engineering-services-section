#!/usr/bin/env node
// read-eavt-file — the effect: read an EAVT log off disk into its rows, torn-final-line tolerant
// (OP3). Thin: all the law lives in src/eavt.mjs.
import { readEavtFile } from "../src/eavt.mjs";

export default function readEavtFileScript(path) {
  return readEavtFile(path);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: read-eavt-file.mjs <path>");
    process.exit(1);
  }
  console.log(JSON.stringify(readEavtFileScript(path), null, 2));
}
