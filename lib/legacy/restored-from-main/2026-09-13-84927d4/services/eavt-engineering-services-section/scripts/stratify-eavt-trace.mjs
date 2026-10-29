#!/usr/bin/env node
// stratify-eavt-trace — the effect: read an EAVT log off disk and stratify one subject's trace
// into its three DERIVED levels (Level 0 asserted, Level 1 saturated = Fix σ, Level 2 settled =
// Fix σ ∩ Fix Δ). Thin: the law lives in src/eavt.mjs.
import { readEavtFile, stratify } from "../src/eavt.mjs";

export default function stratifyEavtTraceScript(path, subject, opts = {}) {
  const rows = readEavtFile(path);
  return stratify(subject, rows, opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, subject] = process.argv.slice(2);
  if (!path || !subject) {
    console.error("usage: stratify-eavt-trace.mjs <path> <subject>");
    process.exit(1);
  }
  console.log(JSON.stringify(stratifyEavtTraceScript(path, subject), null, 2));
}
