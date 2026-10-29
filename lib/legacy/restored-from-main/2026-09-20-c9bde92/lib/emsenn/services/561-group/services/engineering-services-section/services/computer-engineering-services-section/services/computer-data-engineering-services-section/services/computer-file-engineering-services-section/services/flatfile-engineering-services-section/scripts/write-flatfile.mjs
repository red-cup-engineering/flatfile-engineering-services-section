#!/usr/bin/env node
// write-flatfile -- the effect: write one whole-file atomic text projection. Thin: all the law
// lives in src/flatfile.mjs.
import { writeFlatfile } from "../src/flatfile.mjs";

export default function writeFlatfileScript(path, content) {
  return writeFlatfile(path, content);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path, content] = process.argv.slice(2);
  if (!path || content === undefined) {
    console.error("usage: write-flatfile.mjs <path> <content>");
    process.exit(1);
  }
  console.log(writeFlatfileScript(path, content));
}
