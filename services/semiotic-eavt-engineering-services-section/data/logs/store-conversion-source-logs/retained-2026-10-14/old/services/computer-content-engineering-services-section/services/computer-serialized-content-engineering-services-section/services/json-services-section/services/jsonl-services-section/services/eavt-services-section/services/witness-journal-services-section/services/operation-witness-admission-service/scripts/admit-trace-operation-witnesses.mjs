#!/usr/bin/env node
import { readFileSync } from "node:fs"; import { admitTraceOperationWitnesses } from "../src/trace-operation-witnesses.mjs"; export { admitTraceOperationWitnesses };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(admitTraceOperationWitnesses(input.projection, input.options))}\n`); }
