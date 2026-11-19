#!/usr/bin/env node
// read-flatfile-text -- the effect: read a file's bytes back as a UTF-8 string. Thin: all the law
// lives in src/flatfile.mjs.
import { readFlatfileText } from "../src/flatfile.mjs";

export default function readFlatfileTextScript(path) {
  return readFlatfileText(path);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: read-flatfile-text.mjs <path>");
    process.exit(1);
  }
  console.log(readFlatfileTextScript(path));
}
