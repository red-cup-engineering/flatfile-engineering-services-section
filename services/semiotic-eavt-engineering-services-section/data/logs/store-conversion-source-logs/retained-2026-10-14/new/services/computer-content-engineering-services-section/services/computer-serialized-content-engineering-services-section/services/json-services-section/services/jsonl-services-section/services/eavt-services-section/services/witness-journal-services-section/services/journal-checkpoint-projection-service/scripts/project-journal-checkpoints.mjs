#!/usr/bin/env node
import { readFileSync } from "node:fs"; import { foldCheckpointEvents } from "../src/checkpoint-snapshot.mjs"; export { foldCheckpointEvents };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(foldCheckpointEvents(input.events, { generatedAt: input.generatedAt }))}\n`); }
