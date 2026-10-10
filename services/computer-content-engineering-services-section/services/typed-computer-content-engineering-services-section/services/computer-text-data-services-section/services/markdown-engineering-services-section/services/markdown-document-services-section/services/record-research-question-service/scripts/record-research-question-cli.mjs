#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { recordResearchQuestion } from "./record-research-question.mjs";

try {
  const request = JSON.parse(readFileSync(0, "utf8"));
  const result = await recordResearchQuestion(request);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  console.error(`record-research-question: ${error.message}`);
  process.exitCode = 1;
}
