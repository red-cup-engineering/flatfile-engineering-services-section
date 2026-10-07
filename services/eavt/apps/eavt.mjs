#!/usr/bin/env node
import { createInterface } from "node:readline";
import { execute } from "./execute-eavt.mjs";
/** Process each complete request without retaining the entire input stream. */
export async function main(input, output) {
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    try {
      output.write(
        JSON.stringify({ ok: true, value: execute(JSON.parse(line)) }) + "\n",
      );
    } catch (error) {
      output.write(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }) + "\n",
      );
    }
  }
}
if (import.meta.main) await main(process.stdin, process.stdout);
