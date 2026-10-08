import { readdir } from "node:fs/promises";
import { confineExistingPath } from "../lib/filepath.mjs";

function kindOf(entry) {
  if (entry.isSymbolicLink()) return "symlink";
  if (entry.isDirectory()) return "directory";
  if (entry.isFile()) return "file";
  return "other";
}

/** Observe one level of an existing directory with caller-owned exclusions. */
export async function listDirectoryEntries({ root, path = "", excludes = [] } = {}) {
  if (!Array.isArray(excludes) || excludes.some((name) => typeof name !== "string")) {
    throw new TypeError("excludes must be an array of names");
  }
  const address = await confineExistingPath({ root, path });
  const entries = await readdir(address.path, { withFileTypes: true });
  const excluded = new Set(excludes);
  const observed = entries
    .filter((entry) => !excluded.has(entry.name))
    .map((entry) => Object.freeze({ name: entry.name, kind: kindOf(entry) }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Object.freeze({
    type: "DirectoryEntryList",
    root: address.root,
    path: address.relativePath === "." ? "" : address.relativePath,
    entries: Object.freeze(observed),
    excluded: entries.length - observed.length,
  });
}
