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
/** Iterate a file snapshot with one carrier line resident at a time. Byte offsets
 * belong to the carrier, so split UTF-8 and torn final writes retain their meaning. */
function* carrierLines(fd, from, size, includePartial) {
  const buffer = Buffer.alloc(64 * 1024);
  let position = from;
  let parts = [];
  while (position < size) {
    const bytes = readSync(fd, buffer, 0, Math.min(buffer.length, size - position), position);
    if (bytes === 0) break;
    let start = 0;
    for (;;) {
      const newline = buffer.indexOf(0x0a, start);
      if (newline < 0 || newline >= bytes) break;
      parts.push(Buffer.from(buffer.subarray(start, newline)));
      yield { line: Buffer.concat(parts).toString("utf8"), offset: position + newline + 1 };
      parts = [];
      start = newline + 1;
    }
    if (start < bytes) parts.push(Buffer.from(buffer.subarray(start, bytes)));
    position += bytes;
  }
  if (includePartial && parts.length > 0) yield { line: Buffer.concat(parts).toString("utf8"), offset: position };
}

/** Admit historical rows in order without retaining the unrequested file. */
export function* iterateEavtEntries({ path } = {}, { select } = {}) {
  if (typeof path !== "string" || path === "") throw new TypeError("path must be a nonempty string");
  let fd;
  try { fd = openSync(path, "r"); }
  catch (error) {
    if (["ENOENT", "EACCES", "ENOTDIR"].includes(error?.code)) return;
    throw error;
  }
  try {
    for (const { line } of carrierLines(fd, 0, fstatSync(fd).size, true)) {
      if (line.trim() === "") continue;
      let row;
      try {
        const value = JSON.parse(line);
        if (select !== undefined && !select(value)) continue;
        row = normalizeEavtRow(value);
      } catch { continue; /* retain the same historical recovery rule */ }
      yield row;
    }
  } finally { closeSync(fd); }
}

export function readEavtEntries(input, options) {
  return Object.freeze([...iterateEavtEntries(input, options)]);
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
    let complete = from;
    const rows = [];
    for (const { line, offset } of carrierLines(fd, from, stat.size, false)) {
      complete = offset;
      if (line.trim() === "") continue;
      try {
        const value = JSON.parse(line);
        if (select !== undefined && !select(value)) continue;
        rows.push(normalizeEavtRow(value));
      } catch { /* historical recovery retains the valid witnesses */ }
    }
    return Object.freeze({ rows: Object.freeze(rows), reset,
      reading: Object.freeze({ offset: complete, ino: stat.ino, dev: stat.dev }) });
  } finally {
    closeSync(fd);
  }
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(readEavtEntries(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
