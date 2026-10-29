#!/usr/bin/env node
// fold-eavt-trace — the effect: read an EAVT log off disk and fold one subject's trace into its
// settled fiber (tombstones applied). Thin: the law lives in src/eavt.mjs.
import { readEavtFile, fold } from "../src/eavt.mjs";

export default function foldEavtTraceScript(path, subject, opts = {}) {
  const rows = readEavtFile(path);
  return fold(subject, rows, opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, subject] = process.argv.slice(2);
  if (!path || !subject) {
    console.error("usage: fold-eavt-trace.mjs <path> <subject>");
    process.exit(1);
  }
  console.log(JSON.stringify(foldEavtTraceScript(path, subject), null, 2));
}
