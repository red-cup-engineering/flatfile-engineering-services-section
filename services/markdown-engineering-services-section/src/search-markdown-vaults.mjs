/** Search Markdown carriers with bounded streaming line or document evidence. */
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { confineExistingPath, confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { readFlagValue, readRepeatedFlagValues } from "@red-cup-engineering/computer-text-content-engineering-services-section/read-flag-token-values";
import {
  admitVaultPolicy,
  generationForPath,
  readVaultPolicy,
  vaultForPath,
} from "./observe-markdown-vaults.mjs";

function searchArguments({ policy, patterns, caseSensitive, regularExpression, regions, matchMode }) {
  const args = ["--json", "--line-buffered", "--line-number", "--column", "--with-filename", "--hidden", "--no-ignore"];
  if (!caseSensitive) args.push("--ignore-case");
  if (!regularExpression) args.push("--fixed-strings");
  for (const extension of policy.extensions) args.push("--glob", `*.${extension.replace(/[a-z]/gu, letter => `[${letter}${letter.toUpperCase()}]`)}`);
  for (const name of policy.excludedDirectoryNames) args.push("--glob", `!**/${name}/**`);
  if (matchMode === "document") args.push("--max-count", "1");
  for (const pattern of patterns) args.push("--regexp", pattern);
  args.push("--", ...regions);
  return args;
}

function eventPath(data) {
  return data.path?.text ?? (data.path?.bytes ? Buffer.from(data.path.bytes, "base64").toString("utf8") : null);
}

function eventLine(data) {
  return data.lines?.text ?? (data.lines?.bytes ? Buffer.from(data.lines.bytes, "base64").toString("utf8") : "");
}

function admitNarrowedPaths(root, paths) {
  return [...new Set(paths.map((path) => {
    if (typeof path !== "string" || path.length === 0 || path.includes("\\")) throw new TypeError("each narrowed path must be a nonempty POSIX path");
    try {
      return confinePath({ root, path }).relativePath;
    } catch {
      throw new TypeError(`narrowed path escapes root: ${path}`);
    }
  }))];
}

function traversalRoots(root, paths) {
  const unique = [...new Set(paths.map((path) => confinePath({ root, path }).relativePath))];
  const selected = new Set(unique);
  if (selected.has(".")) return ["."];
  return unique.filter((path) => {
    for (let separator = path.lastIndexOf("/"); separator >= 0; separator = path.lastIndexOf("/", separator - 1)) {
      if (selected.has(path.slice(0, separator))) return false;
    }
    return true;
  });
}

// The callback admits evidence before the bound is counted. A rejected vault or
// generation cannot exhaust the caller's result budget or imply truncation.
function streamSearch({ command, args, root, admit }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stopped = false;
    let failure;
    let stderr = "";
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const stop = () => {
      stopped = true;
      lines.close();
      child.stdout.destroy();
      child.kill();
    };
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8192) stderr += chunk.toString("utf8").slice(0, 8192 - stderr.length);
    });
    child.on("error", (error) => { failure = error; });
    lines.on("line", (line) => {
      if (stopped || !line) return;
      try {
        const event = JSON.parse(line);
        if (event.type === "match" && admit(event.data) === false) stop();
      } catch (error) {
        failure = new Error(`invalid ${command} JSON event: ${error.message}`);
        stop();
      }
    });
    child.on("close", (status, signal) => {
      lines.close();
      if (failure) reject(failure);
      else if (!stopped && status !== 0 && status !== 1) reject(new Error(`${command} search failed (${status ?? signal}): ${stderr.trim()}`));
      else resolve();
    });
  });
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string | readonly string[]} options.query
 * @param {import("../types/search-markdown-vaults.d.mjs").MarkdownVaultPolicy} [options.policy]
 * @param {string} [options.policyPath] - read and admitted when `policy` is not supplied; no bundled default
 */
export async function searchMarkdownVaults({
  root,
  query,
  policy,
  policyPath,
  vaultIds,
  paths,
  generation = "all",
  caseSensitive = false,
  regularExpression = false,
  matchMode = "line",
  limit = 50,
  command = "rg",
} = {}) {
  if (typeof root !== "string" || root.length === 0) throw new TypeError("root is required");
  const patterns = typeof query === "string" ? [query] : query;
  if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some((pattern) => typeof pattern !== "string" || pattern.length === 0)) {
    throw new TypeError("query must be a nonempty string or nonempty string array");
  }
  if (matchMode !== "line" && matchMode !== "document") throw new TypeError("matchMode must be line or document");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  if (!["all", "current", "legacy", "reference", "triage"].includes(generation)) throw new TypeError("generation must be all, current, legacy, reference, or triage");
  const admittedPolicy = policy ? admitVaultPolicy(policy) : await readVaultPolicy(policyPath);
  const selected = vaultIds === undefined ? admittedPolicy.vaults.map(({ id }) => id) : vaultIds;
  if (!Array.isArray(selected) || selected.length === 0) throw new TypeError("vaultIds must be a nonempty array when supplied");
  const known = new Set(admittedPolicy.vaults.map(({ id }) => id));
  for (const id of selected) if (!known.has(id)) throw new TypeError(`unknown vault id ${id}`);
  const selectedSet = new Set(selected);
  const selectedVaults = admittedPolicy.vaults.filter(({ id }) => selectedSet.has(id));
  const admittedPaths = paths === undefined ? undefined : (() => {
    if (!Array.isArray(paths) || paths.length === 0) throw new TypeError("paths must be a nonempty array when supplied");
    return admitNarrowedPaths(root, paths);
  })();
  const broadSearch = selectedVaults.some(({ fallback }) => fallback);
  const regions = traversalRoots(root, admittedPaths ?? (broadSearch ? ["."] : selectedVaults.map(({ region }) => region)));
  const admittedRoot = (await confineExistingPath({ root })).root;
  const excludedNames = new Set(admittedPolicy.excludedDirectoryNames);
  const excludedPath = (path) => path.split("/").some((segment) => excludedNames.has(segment));
  const markdownPath = (path) => admittedPolicy.extensions.some((extension) => path.toLowerCase().endsWith(`.${extension}`));
  const matches = [];
  const documents = new Set();
  let truncated = false;
  const admit = (data) => {
    const offeredPath = eventPath(data)?.replace(/^\.\//u, "");
    if (!offeredPath) return;
    const path = confinePath({ root: admittedRoot, path: offeredPath }).relativePath;
    if (excludedPath(path) || !markdownPath(path)) return;
    const vault = vaultForPath(path, admittedPolicy);
    const pathGeneration = generationForPath(path);
    if (!selectedSet.has(vault.id) || (generation !== "all" && generation !== pathGeneration)) return;
    if (matchMode === "document" && documents.has(path)) return;
    if (matches.length === limit) {
      truncated = true;
      return false;
    }
    documents.add(path);
    matches.push(Object.freeze({
      vaultId: vault.id,
      generation: pathGeneration,
      path,
      line: data.line_number,
      column: (data.submatches?.[0]?.start ?? 0) + 1,
      text: eventLine(data).replace(/\r?\n$/u, ""),
      submatches: Object.freeze((data.submatches ?? []).map((match) => Object.freeze({
        start: match.start,
        end: match.end,
        text: match.match?.text ?? (match.match?.bytes ? Buffer.from(match.match.bytes, "base64").toString("utf8") : ""),
      }))),
    }));
  };
  // Explicit carrier lists can exceed the OS argument limit. Batching is owned
  // by the same reader, with one shared result budget and no stdout receipts.
  for (let offset = 0; offset < regions.length && !truncated; offset += 256) {
    const offered = regions.slice(offset, offset + 256);
    const admitted = await Promise.all(offered.map(async (path) => {
      if (excludedPath(path)) return null;
      const confined = await confineExistingPath({ root: admittedRoot, path });
      const entry = await stat(confined.path);
      // ripgrep treats explicitly supplied files as overriding its glob filters.
      return entry.isDirectory() || (entry.isFile() && markdownPath(path)) ? path : null;
    }));
    const batch = admitted.filter((path) => path !== null);
    if (batch.length === 0) continue;
    const args = searchArguments({ policy: admittedPolicy, patterns, caseSensitive, regularExpression, regions: batch, matchMode });
    await streamSearch({ command, args, root: admittedRoot, admit });
  }
  return Object.freeze({
    type: "MarkdownVaultSearchResult",
    root: admittedRoot,
    query: typeof query === "string" ? query : Object.freeze([...query]),
    options: Object.freeze({
      vaultIds: Object.freeze([...selected]),
      generation,
      caseSensitive,
      regularExpression,
      ...(matchMode === "document" ? { matchMode } : {}),
      limit,
      narrowedPaths: admittedPaths ? admittedPaths.length : null,
    }),
    matches: Object.freeze(matches),
    matchedDocuments: documents.size,
    truncated,
    supplier: Object.freeze({ command, mode: "--json --hidden --no-ignore" }),
  });
}

const SEARCH_KNOWN_FLAGS = ["--root", "--query", "--policy", "--vault", "--generation", "--limit", "--case-sensitive", "--regex"];

export function parseSearchArguments(argv) {
  for (const token of argv) if (token.startsWith("--") && !SEARCH_KNOWN_FLAGS.includes(token)) throw new TypeError(`unrecognized argument: ${token}`);
  const limitText = readFlagValue("--limit", argv);
  const options = {
    root: readFlagValue("--root", argv) ?? process.cwd(),
    query: readFlagValue("--query", argv),
    policyPath: readFlagValue("--policy", argv),
    vaultIds: readRepeatedFlagValues("--vault", argv),
    generation: readFlagValue("--generation", argv),
    ...(limitText === undefined ? {} : { limit: Number(limitText) }),
    caseSensitive: argv.includes("--case-sensitive"),
    regularExpression: argv.includes("--regex"),
  };
  if (options.vaultIds.length === 0) delete options.vaultIds;
  return options;
}

export async function runSearchMarkdownVaults(argv, io) {
  const options = parseSearchArguments(argv);
  options.policyPath ??= process.env.MARKDOWN_VAULT_POLICY_PATH;
  const result = await searchMarkdownVaults(options);
  io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdout, stderr }) => runSearchMarkdownVaults(argv, { stdout, stderr }),
  formatError: (error) => `search-markdown-vaults: ${error.message}\n`,
  exitCode: 64,
});
