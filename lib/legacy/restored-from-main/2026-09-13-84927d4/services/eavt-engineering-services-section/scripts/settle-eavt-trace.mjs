#!/usr/bin/env node
// settle-eavt-trace — the effect: read an EAVT log off disk and settle one subject's trace (dedupe
// then fold, tombstones applied). Thin: the law lives in src/eavt.mjs.
import { readEavtFile, settle } from "../src/eavt.mjs";

export default function settleEavtTraceScript(path, subject, opts = {}) {
  const rows = readEavtFile(path);
  return settle(subject, rows, opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, subject] = process.argv.slice(2);
  if (!path || !subject) {
    console.error("usage: settle-eavt-trace.mjs <path> <subject>");
    process.exit(1);
  }
  console.log(JSON.stringify(settleEavtTraceScript(path, subject), null, 2));
}
