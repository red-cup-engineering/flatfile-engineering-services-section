#!/usr/bin/env node
// witness-invocation — CLI entrypoint for witnessInvocation: the package's
// primary operation, witnessing one scripted invocation into a namespace's
// dated journal, best-effort and never throwing.
//
// One thing: read --data-root and --namespace, read a JSON invocation
// object from stdin, print the append outcome as JSON, terminate. No logic
// duplicated here — this wraps the single exported function that
// src/index.mjs already owns.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { witnessInvocation } from "../src/index.mjs";

const { values } = parseArgs({
  options: {
    "data-root": { type: "string" },
    namespace: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || values["data-root"] === undefined || values.namespace === undefined) {
  process.stdout.write(
    "Usage: witness-invocation --data-root <path> --namespace <namespace> < invocation.json\n\n" +
      "Reads a JSON invocation object ({ caller, verb, args, action?, value, at })\n" +
      "from stdin and witnesses it into the namespace's dated journal under\n" +
      "--data-root. Never throws: a witness failure prints { appended: 0 }.\n" +
      "Prints the append outcome as JSON.\n",
  );
  process.exit(values.help ? 0 : 1);
}

const input = readFileSync(0, "utf8").trim();
if (input === "") {
  process.stderr.write("witness-invocation: an invocation JSON object is required on stdin\n");
  process.exit(1);
}

process.stdout.write(`${JSON.stringify(witnessInvocation(values["data-root"], values.namespace, JSON.parse(input)))}\n`);
