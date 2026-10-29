#!/usr/bin/env node
// verify-seavt-rdf-projection — CLI entrypoint for verifySeavtRdfProjection.
// Reads one RDF projection (as produced by project-seavt-rdf, bytes
// base64-encoded) as JSON from stdin, prints { valid: boolean } JSON
// (../src/witness-journal-rdf.mjs holds the logic). Usage:
// verify-seavt-rdf-projection < projection.json

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";

import { verifySeavtRdfProjection } from "../src/witness-journal-rdf.mjs";

export { verifySeavtRdfProjection };

function usage() {
  return "usage: verify-seavt-rdf-projection < projection.json\n\n"
    + "Reads one RDF projection (as produced by project-seavt-rdf, with bytes\n"
    + "base64-encoded) as JSON from stdin and prints { valid: boolean } as JSON.\n";
}

async function main({ argv }) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(usage());
    return;
  }

  const input = JSON.parse(readFileSync(0, "utf8"));
  const projection = { ...input, bytes: Buffer.from(input.bytes, "base64") };
  const valid = await verifySeavtRdfProjection(projection);
  process.stdout.write(`${JSON.stringify({ valid })}\n`);
}

runMain(main, {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) => resolve(fileURLToPath(url)) === resolve(entry ?? ""),
  formatError: (error) => `${error.message}\n`,
  exitCode: 1,
});
