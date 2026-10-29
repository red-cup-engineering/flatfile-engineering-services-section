#!/usr/bin/env node
// sniff-file-binarity -- the effect: sniff a regular file's leading bytes for a NUL. Thin: all the
// law lives in src/flatfile.mjs.
import { sniffFileBinarity } from "../src/flatfile.mjs";

export default function sniffFileBinarityScript(path) {
  return sniffFileBinarity(path);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: sniff-file-binarity.mjs <path>");
    process.exit(1);
  }
  console.log(sniffFileBinarityScript(path));
}
