#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: { path: { type: "string", minLength: 1 } },
  required: ["path"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["e", "a", "v", "t"],
    properties: { e: {}, a: {}, v: {}, t: {} },
    additionalProperties: false,
  },
};
import { closeSync, fstatSync, openSync, readFileSync, readSync } from "node:fs";
import { normalizeEavtRow } from "./normalize-row.mjs";
/** Recover valid EAVT rows from one historical JSONL path, skipping malformed lines.
 * A scoped reader may select parsed carrier rows before admitting their values;
 * every selected row still crosses the normal EAVT admission boundary. */
export function readEavtEntries({ path } = {}, { select } = {}) {
  if (typeof path !== "string" || path === "")
    throw new TypeError("path must be a nonempty string");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (["ENOENT", "EACCES", "ENOTDIR"].includes(error?.code))
      return Object.freeze([]);
    throw error;
  }
  const rows = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value = JSON.parse(line);
      if (select !== undefined && !select(value)) continue;
      rows.push(normalizeEavtRow(value));
    } catch {
      /* historical recovery retains the valid witnesses */
    }
  }
  return Object.freeze(rows);
}
/** Recover the valid EAVT rows appended to one historical JSONL path since a
 * reader's last reading. A JSONL feed is append-only, so a reader that keeps the
 * returned reading parses each line once; a feed that was replaced (another
 * inode) or shortened is read from the start (`reset`). A torn final line is
 * left for the next reading. */
export function readEavtEntriesSince({ path, since } = {}, { select } = {}) {
  if (typeof path !== "string" || path === "")
    throw new TypeError("path must be a nonempty string");
  let fd;
  try {
    fd = openSync(path, "r");
  } catch (error) {
    if (["ENOENT", "EACCES", "ENOTDIR"].includes(error?.code))
      return Object.freeze({ rows: Object.freeze([]), reading: undefined, reset: since !== undefined });
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    const reset = since !== undefined && (stat.ino !== since.ino || stat.dev !== since.dev || stat.size < since.offset);
    const from = since === undefined || reset ? 0 : since.offset;
    const buffer = Buffer.alloc(stat.size - from);
    let read = 0;
    while (read < buffer.length) {
      const bytes = readSync(fd, buffer, read, buffer.length - read, from + read);
      if (bytes === 0) break;
      read += bytes;
    }
    const complete = buffer.subarray(0, read).lastIndexOf(0x0a) + 1;
    const rows = [];
    for (const line of buffer.subarray(0, complete).toString("utf8").split("\n")) {
      if (line.trim() === "") continue;
      try {
        const value = JSON.parse(line);
        if (select !== undefined && !select(value)) continue;
        rows.push(normalizeEavtRow(value));
      } catch {
        /* historical recovery retains the valid witnesses */
      }
    }
    return Object.freeze({ rows: Object.freeze(rows), reset,
      reading: Object.freeze({ offset: from + complete, ino: stat.ino, dev: stat.dev }) });
  } finally {
    closeSync(fd);
  }
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(readEavtEntries(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
