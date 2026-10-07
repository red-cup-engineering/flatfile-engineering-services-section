#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { observeFileContentWitnesses } from "../src/file-content-witness.mjs";
export { observeFileContentWitnesses };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(await observeFileContentWitnesses(input))}\n`); }
