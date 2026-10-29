#!/usr/bin/env node
// verify-eavt-proof-closure — the effect: read an EAVT log off disk and verify proof closure for
// one or more roots. Thin: the law lives in src/eavt.mjs. Exits 1 when any root is open.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { readEavtFile, verifyProofClosure } from "../src/eavt.mjs";

export default function verifyEavtProofClosureScript(path, roots) {
  const rows = readEavtFile(path);
  return verifyProofClosure({ rows, roots });
}

if (fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [path, ...roots] = process.argv.slice(2);
  if (!path || roots.length === 0) {
    console.error("usage: verify-eavt-proof-closure.mjs <path> <root...>");
    process.exit(1);
  }
  const result = verifyEavtProofClosureScript(path, roots);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.summary.open > 0 ? 1 : 0);
}
