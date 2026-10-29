#!/usr/bin/env node
// classify-flatfile -- the effect: stat + sniff one path to classify it along the file ->
// regular-file -> flatfile spine. Thin: all the law lives in src/flatfile.mjs.
import { classifyFlatfile } from "../src/flatfile.mjs";

export default function classifyFlatfileScript(path) {
  return classifyFlatfile(path);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: classify-flatfile.mjs <path>");
    process.exit(1);
  }
  console.log(JSON.stringify(classifyFlatfileScript(path), null, 2));
}
