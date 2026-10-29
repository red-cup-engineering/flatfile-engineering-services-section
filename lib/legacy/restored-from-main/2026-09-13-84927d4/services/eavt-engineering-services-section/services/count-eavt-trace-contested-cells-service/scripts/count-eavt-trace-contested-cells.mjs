#!/usr/bin/env node
import { countEavtContestedCells } from "@red-cup-engineering/count-eavt-contested-cells-service";
import { readEavtFile } from "@red-cup-engineering/eavt";

/**
 * Reads one eavt trace file and counts the cells it settles as contradicted, or reports the trace absent.
 * @param {object} request A record with the trace file path.
 * @returns {object} An EavtTraceContestedCellsCount record, or an EavtTraceAbsent datum when the file does not exist.
 * @throws {TypeError} When trace is not a non-empty string.
 */
export function countEavtTraceContestedCells(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0) throw new TypeError("a non-empty trace is required");
  let rows;
  try {
    rows = readEavtFile(request.trace);
  } catch (error) {
    if (error?.code === "ENOENT") return { type: "EavtTraceAbsent", trace: request.trace };
    throw error;
  }
  return { type: "EavtTraceContestedCellsCount", trace: request.trace, rows: rows.length, count: countEavtContestedCells({ rows }) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("countEavtTraceContestedCells — Reads one eavt trace file and counts the cells it settles as contradicted, or reports the trace absent.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(countEavtTraceContestedCells(JSON.parse(line)))}\n`);
    }
  }
}
