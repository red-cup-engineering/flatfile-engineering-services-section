import { resolve } from "node:path";

import { prioritizePosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/prioritize-posix-paths";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { searchFile } from "@red-cup-engineering/computer-file-engineering-services-section/search-file";

function requireNeedle(needle) {
  if (!(needle instanceof Uint8Array)) throw new TypeError("needle must be a Uint8Array or Buffer");
  if (needle.byteLength === 0) throw new TypeError("needle must be nonempty");
}

/**
 * Search each observed regular file under one root, in explicit path-priority
 * order. Traversal, ordering, and one-file byte search remain separate
 * registered operations.
 */
export async function searchFiles({ root, needle, excludes = [], priorityPaths = [], maxEntries = Infinity } = {}) {
  requireNeedle(needle);
  const walk = await walkPosixPaths({ root, excludes, maxEntries });
  const paths = prioritizePosixPaths({
    paths: walk.files.filter(({ kind }) => kind === "file").map(({ path }) => path),
    priorityPaths,
  });
  const evidence = await Promise.all(paths.map((path) => searchFile({
    path: resolve(walk.root, path),
    needle,
  })));
  return Object.freeze({
    type: "FileSearchAggregate",
    walk,
    evidence: Object.freeze(evidence),
  });
}

function decodeNeedle(option, value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${option} value must be nonempty`);
  if (option === "--needle-hex") {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) throw new TypeError("--needle-hex must contain complete hexadecimal bytes");
    return Buffer.from(value, "hex");
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new TypeError("--needle-base64 must be canonical base64");
  return Buffer.from(value, "base64");
}

function parseArgs(argv) {
  const excludes = [];
  const priorityPaths = [];
  let needle;
  let root;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--needle-hex", "--needle-base64", "--exclude", "--priority-path"].includes(argument)) {
      const value = argv[index + 1];
      if (value === undefined) throw new TypeError(`${argument} requires a value`);
      index += 1;
      if (argument.startsWith("--needle-")) {
        if (needle !== undefined) throw new TypeError("exactly one needle option is required");
        needle = decodeNeedle(argument, value);
      } else if (argument === "--exclude") {
        excludes.push(value);
      } else {
        priorityPaths.push(value);
      }
    } else if (argument.startsWith("--")) {
      throw new TypeError(`unknown option: ${argument}`);
    } else if (root === undefined) {
      root = argument;
    } else {
      throw new TypeError("usage: search-files (--needle-hex HEX | --needle-base64 BASE64) ROOT [--exclude PATH] [--priority-path PATH]");
    }
  }
  if (needle === undefined || root === undefined) throw new TypeError("usage: search-files (--needle-hex HEX | --needle-base64 BASE64) ROOT [--exclude PATH] [--priority-path PATH]");
  return { root, needle, excludes, priorityPaths };
}

export async function runSearchFiles(argv, io) {
  const result = await searchFiles(parseArgs(argv));
  io.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runSearchFiles(argv, { stdin, stdout, stderr }),
  formatError: (error) => `search-files: ${error.message}\n`,
  exitCode: 64,
});
