import { readFile } from "node:fs/promises";

/**
 * @param {string} path
 * @param {{fatal?: boolean}} [options] fatal decodes strictly (TextDecoder fatal mode),
 *   throwing on any byte sequence that is not valid UTF-8, in place of the lossy
 *   replacement-character decode node:fs's own "utf8" encoding performs.
 */
export async function readFileText(path, { fatal = false } = {}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (!fatal) return readFile(path, "utf8");
  return new TextDecoder("utf-8", { fatal: true }).decode(await readFile(path));
}

export async function readFileBytes(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  return readFile(path);
}

export async function runReadFile(argv, io) {
  if (argv.length !== 1) throw new TypeError("usage: read-file PATH");
  const text = await readFileText(argv[0]);
  io.stdout.write(text);
  return text;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runReadFile(argv, { stdin, stdout, stderr }),
  formatError: (error) => `read-file: ${error.message}\n`,
  exitCode: 64,
});
