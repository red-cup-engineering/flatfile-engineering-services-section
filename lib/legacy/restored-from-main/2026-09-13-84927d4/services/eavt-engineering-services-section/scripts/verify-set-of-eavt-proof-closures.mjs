#!/usr/bin/env node
// verify-set-of-eavt-proof-closures — collection lift over verify-eavt-proof-closure: verify
// proof closure across one or more EAVT traces and/or arbitrary house JSONL logs
// (--rows-from-jsonl), for one or more roots (default: every row whose v carries a citation).
// Thin: the law lives in src/eavt.mjs.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { readEavtFile, readJsonlRows, citationsOf, verifyProofClosure } from "../src/eavt.mjs";

const USAGE =
  "usage: verify-set-of-eavt-proof-closures.mjs --trace <path> [--trace <path> ...] " +
  "[--rows-from-jsonl <path> ...] [--root <id> ...]";

export function parseVerifySetOfEavtProofClosuresArgs(argv) {
  const traces = [];
  const rowsFromJsonl = [];
  const roots = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--trace") traces.push(argv[(i += 1)]);
    else if (arg === "--rows-from-jsonl") rowsFromJsonl.push(argv[(i += 1)]);
    else if (arg === "--root") roots.push(argv[(i += 1)]);
    else throw new Error(`unknown argument "${arg}"`);
  }
  return { traces, rowsFromJsonl, roots };
}

export default function verifySetOfEavtProofClosuresScript({ traces = [], rowsFromJsonl = [], roots = [] }) {
  const rows = [
    ...traces.flatMap((path) => readEavtFile(path)),
    ...rowsFromJsonl.flatMap((path) => readJsonlRows(path)),
  ];
  const effectiveRoots = roots.length > 0 ? roots : rows.filter((row) => citationsOf(row).size > 0).map((row) => row.e);
  return verifyProofClosure({ rows, roots: effectiveRoots });
}

if (fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  let args;
  try {
    args = parseVerifySetOfEavtProofClosuresArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error(USAGE);
    process.exit(1);
  }
  if (args.traces.length === 0 && args.rowsFromJsonl.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }
  const result = verifySetOfEavtProofClosuresScript(args);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.summary.open > 0 ? 1 : 0);
}
