#!/usr/bin/env node
import { projectJsonRecordKeys } from "@red-cup-engineering/json-record-key-projection-service";
import { runJavascriptNodeOperation } from "../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

/**
 * Projects a JSON record onto an explicit finite set of top-level keys, composing @red-cup-engineering/json-record-key-projection-service's own `projectJsonRecordKeys`; never reimplements key projection.
 * @param {object} request A record with `record` (the JSON object to project) and `keys` (a nonempty array of nonempty key strings to keep).
 * @returns {object} The projected JSON object: an ordinary object carrying only the requested keys present on `record`, with their values from `record`.
 * @throws {TypeError} When record is not a JSON object, or keys is not a nonempty array of nonempty strings.
 */
export function projectJsonRecordKey(request) {
  return projectJsonRecordKeys({ record: request?.record, keys: request?.keys });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "project-json-record-key", description: "Projects a JSON record onto an explicit finite set of top-level keys, composing", operation: projectJsonRecordKey }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
