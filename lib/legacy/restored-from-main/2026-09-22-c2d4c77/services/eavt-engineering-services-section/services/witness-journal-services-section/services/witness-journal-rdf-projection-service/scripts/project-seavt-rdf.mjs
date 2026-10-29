#!/usr/bin/env node
// project-seavt-rdf — CLI entrypoint for projectSeavtRdf. Reads one SEAVT
// row (e, a, v, t) as JSON from stdin, projects it under --graph into
// canonical RDFC-1.0 bytes (../src/witness-journal-rdf.mjs), prints the
// projection as JSON (bytes base64). Usage: project-seavt-rdf --graph
// <ni-uri> < row.json

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";

import { projectSeavtRdf } from "../src/witness-journal-rdf.mjs";

export { projectSeavtRdf };

function usage() {
  return "usage: project-seavt-rdf --graph <ni-uri> < row.json\n\n"
    + "Reads one SEAVT source row (fields e, a, v, t) as JSON from stdin and\n"
    + "prints the RDF projection under --graph as JSON, with bytes base64-encoded.\n";
}

async function main({ argv }) {
  const { values } = parseArgs({
    args: argv,
    options: {
      graph: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(usage());
    return;
  }
  if (!values.graph) {
    process.stderr.write(usage());
    process.exitCode = 2;
    return;
  }

  const row = JSON.parse(readFileSync(0, "utf8"));
  const projection = await projectSeavtRdf(row, { graph: values.graph });
  process.stdout.write(`${JSON.stringify({
    ...projection,
    bytes: Buffer.from(projection.bytes).toString("base64"),
  })}\n`);
}

runMain(main, {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) => resolve(fileURLToPath(url)) === resolve(entry ?? ""),
  formatError: (error) => `${error.message}\n`,
  exitCode: 1,
});
