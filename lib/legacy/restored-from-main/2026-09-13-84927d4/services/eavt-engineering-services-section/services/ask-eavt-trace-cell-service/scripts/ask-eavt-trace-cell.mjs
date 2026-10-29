#!/usr/bin/env node
import { askEavtCell } from "@red-cup-engineering/ask-eavt-cell-service";
import { readEavtEntityRows } from "@red-cup-engineering/eavt";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Reads one eavt trace file and answers a cell question over its rows, or reports the trace absent.
 * @param {object} request A record with the trace file path, an entity, and an optional attribute.
 * @returns {object} An EavtTraceCellAnswer record, or an EavtTraceAbsent datum when the file does not exist.
 * @throws {TypeError} When trace or entity is not a non-empty string.
 */
export function askEavtTraceCell(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0 || typeof request?.entity !== "string" || request.entity.length === 0) {
    throw new TypeError("a non-empty trace and entity are required");
  }
  let rows;
  try {
    rows = readEavtEntityRows({ path: request.trace, entity: request.entity });
  } catch (error) {
    if (error?.code === "ENOENT") return { type: "EavtTraceAbsent", trace: request.trace };
    throw error;
  }
  const answer = askEavtCell({ rows, entity: request.entity, attribute: request.attribute });
  return { type: "EavtTraceCellAnswer", trace: request.trace, rows: rows.length, answer };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "ask-eavt-trace-cell", description: "Reads one eavt trace file and answers a cell question over its rows, or reports the trace absent.", operation: askEavtTraceCell }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
