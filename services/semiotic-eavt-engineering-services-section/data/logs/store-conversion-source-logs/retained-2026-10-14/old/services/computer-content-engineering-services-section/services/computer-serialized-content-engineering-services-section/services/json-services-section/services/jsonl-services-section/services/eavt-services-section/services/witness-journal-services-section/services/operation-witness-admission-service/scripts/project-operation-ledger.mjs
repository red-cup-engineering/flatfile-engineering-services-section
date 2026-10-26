#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { foldOperationWitnessEvents, projectOperationLedger } from "../src/operation-ledger.mjs";

export { foldOperationWitnessEvents, projectOperationLedger };

if (import.meta.main) {
  const input = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(projectOperationLedger(foldOperationWitnessEvents(input.events, input), input))}\n`);
}
