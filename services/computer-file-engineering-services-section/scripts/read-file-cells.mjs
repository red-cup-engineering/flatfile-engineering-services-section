// A file read as the SignCell cells it tells about itself, along the restriction chain
// file -> regular file -> flatfile -> serialization file -> JSON: each step adds cells, each cell
// witnessed by the read that told it (stat, sniff, read, parse).
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { cell, cellSet, mergeCellSets } from "@red-cup-engineering/signcell/cell";

/** A file's POSIX attributes: its type, size, permission bits, whole-millisecond mtime and link count. */
export function fileAttributes(path) {
  const s = statSync(path);
  const type = s.isFile() ? "regular-file" : s.isDirectory() ? "directory"
    : s.isSymbolicLink() ? "symbolic-link" : s.isFIFO() ? "fifo" : s.isSocket() ? "socket"
    : s.isBlockDevice() ? "block-device" : s.isCharacterDevice() ? "character-device" : "unknown";
  return { type, size: s.size, mode: s.mode & 0o7777, mtime: Math.trunc(s.mtimeMs), nlink: s.nlink };
}

/** "binary" when a NUL byte occurs in the first 8 KiB, otherwise "flat". */
export function fileBinarity(path) {
  const descriptor = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const length = readSync(descriptor, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, length).includes(0) ? "binary" : "flat";
  } finally {
    closeSync(descriptor);
  }
}

/** The cells a record of attributes tells about a subject, each witnessed by `witness`. */
export const attributeCells = (subject, attributes, witness) =>
  cellSet(Object.entries(attributes).map(([key, value]) => cell(subject, key, value, { for: [witness] })));

export const fileCells = (path) => attributeCells(path, fileAttributes(path), "stat");
export const regularFileCells = (path) =>
  mergeCellSets(fileCells(path), attributeCells(path, { binarity: fileBinarity(path) }, "sniff"));
export const flatfileCells = (path) =>
  mergeCellSets(regularFileCells(path), attributeCells(path, { text: readFileSync(path, "utf8") }, "read"));
export const serializationFileCells = (path) =>
  mergeCellSets(flatfileCells(path), attributeCells(path, { format: "serialization-file" }, "read"));
/** A JSON file's cells: its text's one JSON value as `json`; JSON lines have no one value. */
export function jsonFileCells(path) {
  let value;
  try { value = JSON.parse(readFileSync(path, "utf8")); } catch { value = undefined; }
  return mergeCellSets(serializationFileCells(path),
    attributeCells(path, value === undefined ? { format: "json" } : { format: "json", json: value }, "parse"));
}

export const command = Object.freeze({
  run: ({ argv, stdout }) => { stdout.write(`${JSON.stringify(jsonFileCells(argv[0]))}\n`); },
  formatError: (error) => `read-file-cells: ${error.message}\n`,
  exitCode: 64,
});
