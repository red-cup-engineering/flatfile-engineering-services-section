// project-seavt-rdf — CLI entrypoint for projectSeavtRdf. Reads one SEAVT
// row (e, a, v, t) as JSON from stdin, projects it under --graph into
// canonical RDFC-1.0 bytes (../src/witness-journal-rdf.mjs), prints the
// projection as JSON (bytes base64). Usage: project-seavt-rdf --graph
// <ni-uri> < row.json

import { parseArgs } from "node:util";


import { projectSeavtRdf } from "../src/witness-journal-rdf.mjs";

export { projectSeavtRdf };

function usage() {
  return "usage: project-seavt-rdf --graph <ni-uri> < row.json\n\n"
    + "Reads one SEAVT source row (fields e, a, v, t) as JSON from stdin and\n"
    + "prints the RDF projection under --graph as JSON, with bytes base64-encoded.\n";
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
      graph: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    stdout.write(usage());
    return;
  }
  if (!values.graph) {
    throw Object.assign(new TypeError(usage()), { code: "usage" });
  }

  const row = JSON.parse(await readText(stdin));
  const projection = await projectSeavtRdf(row, { graph: values.graph });
  stdout.write(`${JSON.stringify({
    ...projection,
    bytes: Buffer.from(projection.bytes).toString("base64"),
  })}\n`);
}

export const command = Object.freeze({
  run: main,
  formatError: (error) => (error.code === "usage" ? error.message : `${error.message}\n`),
  exitCode: (error) => (error.code === "usage" ? 2 : 1),
});
