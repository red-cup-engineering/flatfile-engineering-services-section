#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitHookEventWitness } from "../src/hook-event-witness.mjs";
export { admitHookEventWitness };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(admitHookEventWitness(input, { at: input.at }))}\n`); }
