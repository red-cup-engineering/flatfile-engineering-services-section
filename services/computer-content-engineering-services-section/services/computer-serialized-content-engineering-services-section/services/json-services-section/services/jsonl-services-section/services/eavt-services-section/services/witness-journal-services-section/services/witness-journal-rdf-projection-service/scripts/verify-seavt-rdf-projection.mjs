// verify-seavt-rdf-projection — CLI entrypoint for verifySeavtRdfProjection.
// Reads one RDF projection (as produced by project-seavt-rdf, bytes
// base64-encoded) as JSON from stdin, prints { valid: boolean } JSON
// (../src/witness-journal-rdf.mjs holds the logic). Usage:
// verify-seavt-rdf-projection < projection.json

import { parseArgs } from "node:util";


import { verifySeavtRdfProjection } from "../src/witness-journal-rdf.mjs";

export { verifySeavtRdfProjection };

function usage() {
  return "usage: verify-seavt-rdf-projection < projection.json\n\n"
    + "Reads one RDF projection (as produced by project-seavt-rdf, with bytes\n"
    + "base64-encoded) as JSON from stdin and prints { valid: boolean } as JSON.\n";
}

async function readText(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main({ argv, stdin, stdout }) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    stdout.write(usage());
    return;
  }

  const input = JSON.parse(await readText(stdin));
  const projection = { ...input, bytes: Buffer.from(input.bytes, "base64") };
  const valid = await verifySeavtRdfProjection(projection);
  stdout.write(`${JSON.stringify({ valid })}\n`);
}

export const command = Object.freeze({
  run: main,
  formatError: (error) => `${error.message}\n`,
  exitCode: 1,
});
