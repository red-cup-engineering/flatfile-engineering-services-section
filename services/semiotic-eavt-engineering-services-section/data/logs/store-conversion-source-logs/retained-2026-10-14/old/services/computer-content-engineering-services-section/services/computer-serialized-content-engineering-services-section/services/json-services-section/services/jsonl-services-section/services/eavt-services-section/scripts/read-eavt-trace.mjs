import { existsSync, readFileSync } from "node:fs";
import { decode } from "./decode-row.mjs";
import { readFileSync as readJsonCarrier } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["path"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["rows"],
});

/** Read canonical JSONL or historical base64-CBOR rows, skipping torn or corrupt lines. */
export function readEavtTrace({ path } = {}) {
  if (typeof path !== "string" || path.length === 0)
    throw new TypeError("path must be a non-empty string");
  if (!existsSync(path)) return { rows: [] };
  const rows = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(decode(line));
    } catch {
      /* recovery reads retain intact rows */
    }
  }
  return { rows };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(readEavtTrace(JSON.parse(readJsonCarrier(0, "utf8"))))}\n`,
  );
