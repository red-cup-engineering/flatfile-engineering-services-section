#!/usr/bin/env node
import { admitOperationWitness } from "../src/operation-witness.mjs";
import { runJavascriptNodeOperation } from "../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

export function recordOperation(document) {
  return admitOperationWitness(document, { at: document.at });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "record-operation", description: "recordOperation — the record-operation operation.", operation: recordOperation }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
