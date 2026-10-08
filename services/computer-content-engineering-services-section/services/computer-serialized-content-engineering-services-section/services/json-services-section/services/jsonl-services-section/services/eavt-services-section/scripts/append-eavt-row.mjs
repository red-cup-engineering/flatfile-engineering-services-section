import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { encode } from "./encode-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["path", "row"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["path", "line"],
});

/** Append one strictly admitted canonical JSON row and fsync it before reporting success. */
export function appendEavtRow({ path, row } = {}) {
  if (typeof path !== "string" || path.length === 0)
    throw new TypeError("path must be a non-empty string");
  const line = encode(row);
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(path, "a");
  try {
    writeSync(descriptor, `${line}\n`);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  return { path, line };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(appendEavtRow(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
