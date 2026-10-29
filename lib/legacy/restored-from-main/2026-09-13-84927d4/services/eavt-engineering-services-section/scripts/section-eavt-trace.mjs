#!/usr/bin/env node
// section-eavt-trace — the effect: read an EAVT log off disk, fold one subject's trace (tombstones
// applied), and project the fold to its settled section {affirmed,denied,contradicted}. Thin: the
// law lives in src/eavt.mjs.
import { readEavtFile, fold, section } from "../src/eavt.mjs";

export default function sectionEavtTraceScript(path, subject, opts = {}) {
  const rows = readEavtFile(path);
  return section(fold(subject, rows, opts));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, subject] = process.argv.slice(2);
  if (!path || !subject) {
    console.error("usage: section-eavt-trace.mjs <path> <subject>");
    process.exit(1);
  }
  console.log(JSON.stringify(sectionEavtTraceScript(path, subject), null, 2));
}
