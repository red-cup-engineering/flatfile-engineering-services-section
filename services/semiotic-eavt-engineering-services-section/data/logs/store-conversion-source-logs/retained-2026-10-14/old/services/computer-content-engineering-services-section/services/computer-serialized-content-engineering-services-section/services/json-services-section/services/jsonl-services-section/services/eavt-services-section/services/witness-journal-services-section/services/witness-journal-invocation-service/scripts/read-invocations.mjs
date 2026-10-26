#!/usr/bin/env node
// read-invocations — CLI entrypoint for readInvocations: reading one
// namespace's traced invocation journal for the day named by --at.
//
// One thing: read --data-root, --namespace and --at, print the traced
// journal rows as JSON, terminate. No logic duplicated here — this wraps
// the single exported function that src/index.mjs already owns.

import { parseArgs } from "node:util";

import { readInvocations } from "../src/index.mjs";

const { values } = parseArgs({
  options: {
    "data-root": { type: "string" },
    namespace: { type: "string" },
    at: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || values["data-root"] === undefined || values.namespace === undefined || values.at === undefined) {
  process.stdout.write(
    "Usage: read-invocations --data-root <path> --namespace <namespace> --at <time>\n\n" +
      "Reads one namespace's traced invocation journal for the day named by\n" +
      "--at and prints it (each row { entry, trace }) as JSON. Never throws: a\n" +
      "missing or unreadable journal reads as an empty array.\n",
  );
  process.exit(values.help ? 0 : 1);
}

process.stdout.write(`${JSON.stringify(readInvocations(values["data-root"], values.namespace, values.at))}\n`);
