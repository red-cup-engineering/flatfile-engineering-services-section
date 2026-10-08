import { lstat, opendir, readFile, stat } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { readFlagValue, readRepeatedFlagValues } from "@red-cup-engineering/computer-text-content-engineering-services-section/read-flag-token-values";

function requireNonemptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a nonempty string`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function segmentMatcher(pattern) {
  requireNonemptyString(pattern, "exclude");
  const source = pattern.split("*").map(escapeRegExp).join(".*");
  const expression = new RegExp(`^${source}$`, "u");
  return (name) => expression.test(name);
}

function posix(path) {
  return path.split(sep).join("/");
}

function compiledExcludes(excludes) {
  if (!Array.isArray(excludes)) throw new TypeError("excludes must be an array");
  return excludes.map(segmentMatcher);
}

async function* listFilesystemEntries(root, excluded) {
  const absoluteRoot = resolve(root);
  const rootStatus = await lstat(absoluteRoot);
  if (rootStatus.isFile()) {
    yield Object.freeze({ absolutePath: absoluteRoot, path: basename(absoluteRoot), kind: "file" });
    return;
  }
  if (rootStatus.isSymbolicLink()) {
    yield Object.freeze({ absolutePath: absoluteRoot, path: basename(absoluteRoot), kind: "symlink" });
    return;
  }
  if (!rootStatus.isDirectory()) throw new TypeError("root must be a regular file or directory");

  async function* walk(directory) {
    const entries = [];
    const stream = await opendir(directory);
    for await (const entry of stream) entries.push(entry);
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (excluded.some((matches) => matches(entry.name))) continue;
      const absolutePath = resolve(directory, entry.name);
      const path = posix(relative(absoluteRoot, absolutePath));
      if (entry.isSymbolicLink()) {
        yield Object.freeze({ absolutePath, path, kind: "symlink" });
      } else if (entry.isDirectory()) yield* walk(absolutePath);
      else if (entry.isFile()) {
        yield Object.freeze({ absolutePath, path, kind: "file" });
      }
    }
  }

  yield* walk(absoluteRoot);
}

function basenameStem(path) {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

function separatorStripped(value) {
  return value.replace(/[-_]/gu, "");
}

function humpFolded(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, (_, before, hump) => `${before}${hump.toLowerCase()}`);
}

function folded(value, caseSensitive) {
  return caseSensitive ? value : value.toLowerCase();
}

function separatorTolerantSource(value) {
  return separatorStripped(humpFolded(value)).split("").map(escapeRegExp).join("[-_]?");
}

function filepathMatch(path, string, { caseSensitive, wordBoundary }) {
  const source = separatorTolerantSource(folded(string, caseSensitive));
  const boundary = "[^A-Za-z0-9]";
  const expression = new RegExp(
    wordBoundary ? `(?:^|${boundary})(${source})(?=${boundary}|$)` : `(${source})`,
    caseSensitive ? "u" : "iu",
  );
  return expression.exec(path)?.[1] ?? null;
}

/**
 * List file and symlink paths whose full root-relative spelling contains
 * `string`. Camel-case, hyphen, and underscore separators are equivalent.
 * Exact basename or basename-stem matches rank before other path matches.
 */
export async function listFilepathsMatchingString({
  root,
  string,
  caseSensitive = false,
  wordBoundary = false,
  excludes = [],
} = {}) {
  requireNonemptyString(root, "root");
  requireNonemptyString(string, "string");
  if (string.trim() === "") throw new TypeError("string must contain a non-whitespace character");

  const matches = [];
  const needle = separatorStripped(humpFolded(folded(string, caseSensitive)));
  for await (const entry of listFilesystemEntries(root, compiledExcludes(excludes))) {
    const matchedText = filepathMatch(entry.path, string, { caseSensitive, wordBoundary });
    if (matchedText === null) continue;
    const exact = [basename(entry.path), basenameStem(entry.path)].some((candidate) => (
      separatorStripped(humpFolded(folded(candidate, caseSensitive))) === needle
    ));
    matches.push({
      path: entry.path,
      matchKind: "filepath",
      matchedText,
      score: exact ? 1 : 0.8,
      rank: exact ? 0 : 1,
    });
  }
  matches.sort((left, right) => left.rank - right.rank || left.path.localeCompare(right.path));
  return Object.freeze(matches.map(({ rank: _rank, ...match }) => Object.freeze(match)));
}

function mentionsInText({ content, string, caseSensitive }) {
  const expression = new RegExp(escapeRegExp(string), caseSensitive ? "gu" : "giu");
  const mentions = [];
  let line = 1;
  let lineStart = 0;
  let nextNewline = content.indexOf("\n");

  for (const match of content.matchAll(expression)) {
    while (nextNewline !== -1 && nextNewline < match.index) {
      line += 1;
      lineStart = nextNewline + 1;
      nextNewline = content.indexOf("\n", lineStart);
    }
    mentions.push(Object.freeze({
      line,
      column: match.index - lineStart + 1,
      match: match[0],
    }));
  }
  return mentions;
}

/**
 * List every literal mention of `string` in regular text files at or beneath
 * `root`. Hidden and ignored paths are searched by default; exclusions are
 * explicit segment names or `*` patterns. Symlinks and binary files are not
 * read, and `maxBytes` can place an explicit upper bound on each file.
 */
export async function listMentionsOfStringUnderFilepath({
  root,
  string,
  caseSensitive = true,
  excludes = [],
  maxBytes = Infinity,
} = {}) {
  requireNonemptyString(root, "root");
  requireNonemptyString(string, "string");
  if (maxBytes !== Infinity && (!Number.isSafeInteger(maxBytes) || maxBytes < 1)) {
    throw new TypeError("maxBytes must be a positive safe integer or Infinity");
  }

  const matches = [];
  for await (const file of listFilesystemEntries(root, compiledExcludes(excludes))) {
    if (file.kind !== "file") continue;
    const metadata = await stat(file.absolutePath);
    if (metadata.size === 0 || metadata.size > maxBytes) continue;
    const bytes = await readFile(file.absolutePath);
    if (bytes.includes(0)) continue;
    const content = bytes.toString("utf8");
    for (const mention of mentionsInText({ content, string, caseSensitive })) {
      matches.push(Object.freeze({ path: file.path, ...mention }));
    }
  }
  return Object.freeze(matches);
}

function usage() {
  return [
    "usage: search-filepath --root <filepath> --string <literal>",
    "       [--scope <content|filepath>] [--ignore-case|--case-sensitive]",
    "       [--word-boundary] [--exclude <name-or-*>]... [--max-bytes <bytes>]",
  ].join("\n");
}

const SEARCH_FILEPATH_KNOWN_FLAGS = ["--root", "--string", "--scope", "--exclude", "--ignore-case", "--case-sensitive", "--word-boundary", "--max-bytes", "--help"];

function parseArguments(argv) {
  for (const token of argv) if (token.startsWith("--") && !SEARCH_FILEPATH_KNOWN_FLAGS.includes(token)) throw new TypeError(`unrecognized argument: ${token}\n${usage()}`);
  const need = (name) => {
    const value = readFlagValue(name, argv);
    if (value === undefined) throw new TypeError(`${name} requires a value\n${usage()}`);
    return value;
  };
  const options = {
    scope: argv.includes("--scope") ? need("--scope") : "content",
    excludes: readRepeatedFlagValues("--exclude", argv),
    ...(argv.includes("--root") ? { root: need("--root") } : {}),
    ...(argv.includes("--string") ? { string: need("--string") } : {}),
    ...(argv.includes("--ignore-case") ? { caseSensitive: false } : {}),
    ...(argv.includes("--case-sensitive") ? { caseSensitive: true } : {}),
    ...(argv.includes("--word-boundary") ? { wordBoundary: true } : {}),
    ...(argv.includes("--max-bytes") ? { maxBytes: Number(need("--max-bytes")) } : {}),
    ...(argv.includes("--help") ? { help: true } : {}),
  };
  return options;
}

async function writeLine(stream, line) {
  if (!stream.write(line)) await new Promise((resolveDrain) => stream.once("drain", resolveDrain));
}

export async function runSearchFilepath(argv, io) {
  const options = parseArguments(argv);
  if (options.help) {
    await writeLine(io.stdout, `${usage()}\n`);
    return Object.freeze([]);
  }
  if (options.scope !== "content" && options.scope !== "filepath") {
    throw new TypeError(`scope must be content or filepath\n${usage()}`);
  }
  if (options.scope === "content" && options.wordBoundary) {
    throw new TypeError("--word-boundary requires --scope filepath");
  }
  if (options.scope === "filepath" && options.maxBytes !== undefined) {
    throw new TypeError("--max-bytes requires --scope content");
  }
  const matches = options.scope === "content"
    ? await listMentionsOfStringUnderFilepath({ ...options, caseSensitive: options.caseSensitive ?? true })
    : await listFilepathsMatchingString({ ...options, caseSensitive: options.caseSensitive ?? false });
  for (const match of matches) await writeLine(io.stdout, `${JSON.stringify(match)}\n`);
  return matches;
}

export const command = Object.freeze({
  run: ({ argv, stdout, stderr }) => runSearchFilepath(argv, { stdout, stderr }),
  formatError: (error) => `search-filepath: ${error.message}\n`,
  exitCode: (error) => (error instanceof TypeError ? 64 : 1),
});
