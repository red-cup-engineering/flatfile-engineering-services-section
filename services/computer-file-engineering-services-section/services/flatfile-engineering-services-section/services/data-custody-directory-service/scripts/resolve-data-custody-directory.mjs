#!/usr/bin/env node
import { mkdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { dataCustodyDirectory } from "../src/data-custody-directory.mjs";

/**
 * @param {string} metaUrl
 * @returns {boolean} whether this module was invoked directly (a bin symlink resolves through realpath)
 */
function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

/**
 * Resolve one of a section's three lawful `data/` custody directories,
 * optionally creating it on disk.
 *
 * @param {string} root - the owning section's absolute root directory
 * @param {"logs"|"records"|"state"} kind - which custody trio member
 * @param {readonly string[]} segments - further plain path components beneath the kind directory
 * @param {Readonly<{create?: boolean}>} [options]
 * @returns {string} the resolved absolute path
 * @throws {TypeError} when root, kind, or any segment is invalid
 */
export function resolveDataCustodyDirectory(root, kind, segments = [], { create = false } = {}) {
  const directory = dataCustodyDirectory(root, kind, ...segments);
  if (create) {
    mkdirSync(directory, { recursive: true });
  }
  return directory;
}

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      root: { type: "string" },
      kind: { type: "string" },
      create: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });
  if (!values.root || !values.kind) {
    console.error("usage: resolve-data-custody-directory.mjs --root <dir> --kind <logs|records|state> [segments...] [--create]");
    process.exit(1);
  }
  const directory = resolveDataCustodyDirectory(values.root, values.kind, positionals, { create: values.create });
  console.log(directory);
}

if (isEntrypoint(import.meta.url)) {
  main(process.argv.slice(2));
}
