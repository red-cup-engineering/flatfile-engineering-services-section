#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { compareStrings } from "../src/compare-strings.mjs";

const isEntrypoint = () => process.argv[1]
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isEntrypoint()) {
  try {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    process.stdout.write(`${JSON.stringify(compareStrings(JSON.parse(text)))}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
