#!/usr/bin/env node
import { readFileSync } from "node:fs"; import { projectCheckpointReplay } from "../src/checkpoint-snapshot.mjs"; export { projectCheckpointReplay };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(projectCheckpointReplay(input.snapshot, input.current, input.params, { generatedAt: input.generatedAt }))}\n`); }
