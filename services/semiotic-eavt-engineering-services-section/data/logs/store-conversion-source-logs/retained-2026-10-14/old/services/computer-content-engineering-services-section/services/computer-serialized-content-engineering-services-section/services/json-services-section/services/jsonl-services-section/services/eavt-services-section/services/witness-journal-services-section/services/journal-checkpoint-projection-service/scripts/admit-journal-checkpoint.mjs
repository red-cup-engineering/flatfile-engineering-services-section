#!/usr/bin/env node
import { readFileSync } from "node:fs"; import { admitJournalCheckpoint } from "../src/checkpoint-events.mjs"; export { admitJournalCheckpoint };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(admitJournalCheckpoint(input.params ?? input, input.carriers, { at: input.at ?? input.params?.at }))}\n`); }
