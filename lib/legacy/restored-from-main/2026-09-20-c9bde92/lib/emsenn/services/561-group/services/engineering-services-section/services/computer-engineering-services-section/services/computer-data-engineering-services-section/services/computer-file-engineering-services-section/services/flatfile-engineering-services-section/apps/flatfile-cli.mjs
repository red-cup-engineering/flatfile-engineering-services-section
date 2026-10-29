#!/usr/bin/env node
// flatfile-cli -- the composed face over the flatfile scripts: one subcommand per effect.
//
// Usage:
//   flatfile-cli.mjs write <path> <content>     # whole-file atomic text write (OP1 fsync / OP2 rename)
//   flatfile-cli.mjs read <path>                # UTF-8 whole-file text read
//   flatfile-cli.mjs sniff <path>                # binarity sniff: "flat" | "binary"
//   flatfile-cli.mjs classify <path>             # file -> regular-file -> flatfile spine classification
import writeFlatfileScript from "../scripts/write-flatfile.mjs";
import readFlatfileTextScript from "../scripts/read-flatfile-text.mjs";
import sniffFileBinarityScript from "../scripts/sniff-file-binarity.mjs";
import classifyFlatfileScript from "../scripts/classify-flatfile.mjs";

function usage() {
  console.error("usage: flatfile-cli.mjs <write|read|sniff|classify> ...");
  process.exit(1);
}

function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case "write": {
      const [path, content] = rest;
      if (!path || content === undefined) usage();
      return writeFlatfileScript(path, content);
    }
    case "read": {
      const [path] = rest;
      if (!path) usage();
      return readFlatfileTextScript(path);
    }
    case "sniff": {
      const [path] = rest;
      if (!path) usage();
      return sniffFileBinarityScript(path);
    }
    case "classify": {
      const [path] = rest;
      if (!path) usage();
      return classifyFlatfileScript(path);
    }
    default:
      return usage();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = main(process.argv.slice(2));
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
}

export default main;
