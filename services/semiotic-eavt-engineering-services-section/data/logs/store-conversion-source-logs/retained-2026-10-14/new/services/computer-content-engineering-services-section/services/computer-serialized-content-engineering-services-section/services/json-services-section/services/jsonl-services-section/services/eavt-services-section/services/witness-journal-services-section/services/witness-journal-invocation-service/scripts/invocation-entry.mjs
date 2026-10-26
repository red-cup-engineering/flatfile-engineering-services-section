#!/usr/bin/env node
// invocation-entry — CLI entrypoint for invocationEntry: cellize one
// invocation to the one witness-journal entry it becomes.
//
// One thing: read a JSON invocation object from stdin, print the EAVT row
// it cellizes to as JSON, terminate. No logic duplicated here — this wraps
// the single exported function that src/index.mjs already owns.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { invocationEntry } from "../src/index.mjs";

const { values } = parseArgs({
  options: {
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  process.stdout.write(
    "Usage: invocation-entry < invocation.json\n\n" +
      "Reads a JSON invocation object ({ caller, verb, args, action?, value, at })\n" +
      "from stdin and prints the one witness-journal entry it cellizes to\n" +
      "(e=caller, a={verb,args,action?}, v=value, t=at) as JSON.\n",
  );
  process.exit(0);
}

const input = readFileSync(0, "utf8").trim();
if (input === "") {
  process.stderr.write("invocation-entry: an invocation JSON object is required on stdin\n");
  process.exit(1);
}

process.stdout.write(`${JSON.stringify(invocationEntry(JSON.parse(input)))}\n`);
