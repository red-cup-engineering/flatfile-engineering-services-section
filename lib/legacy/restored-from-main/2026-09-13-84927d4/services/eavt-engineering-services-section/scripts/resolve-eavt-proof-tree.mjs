#!/usr/bin/env node
// resolve-eavt-proof-tree — the effect: read an EAVT log off disk and resolve the citation DAG
// (Articulating.pair/floor/depth) rooted at one identity. Thin: the law lives in src/eavt.mjs.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { readEavtFile, resolveProofTree } from "../src/eavt.mjs";

export default function resolveEavtProofTreeScript(path, root) {
  const rows = readEavtFile(path);
  return resolveProofTree({ rows, root });
}

if (fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [path, root] = process.argv.slice(2);
  if (!path || !root) {
    console.error("usage: resolve-eavt-proof-tree.mjs <path> <root>");
    process.exit(1);
  }
  console.log(JSON.stringify(resolveEavtProofTreeScript(path, root), null, 2));
}
