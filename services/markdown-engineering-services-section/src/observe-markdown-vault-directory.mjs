import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { confineExistingPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { enumerateMarkdownPaths } from "./observe-markdown-vaults.mjs";

export const DEFAULT_MARKDOWN_VAULT_EXCLUDES = Object.freeze([".git", "node_modules"]);

/** Inventory Markdown candidates through the same supplier as text search.
 * maxScan bounds candidate eligibility observations, not unrelated physical files.
 * Symlinks are excluded by the supplier; eligibility checks also reject paths changed into links.
 * excluded counts rejected candidates, not directories hidden by the declared policy.
 */
export async function observeMarkdownVaultDirectory({
  root, region = "", excludes = DEFAULT_MARKDOWN_VAULT_EXCLUDES,
  limit = 200, maxScan = 20_000, admitPath = () => true,
} = {}) {
  if (!Number.isInteger(limit) || limit < 0) throw new TypeError("limit must be a nonnegative integer");
  if (!Number.isInteger(maxScan) || maxScan < 0) throw new TypeError("maxScan must be a nonnegative integer");
  const address = await confineExistingPath({ root, path: region });
  const relativeRegion = address.relativePath === "." ? "" : address.relativePath;
  const enumeration = await enumerateMarkdownPaths({ root: address.path, policy: {
    schemaVersion: 1, extensions: ["md", "markdown"], excludedDirectoryNames: excludes,
    vaults: [{ id: "source", region: ".", fallback: true }],
  } });
  const eligible=enumeration.paths.filter(path=>admitPath(relativeRegion ? `${relativeRegion}/${path}` : path));
  const candidates = eligible.slice(0, maxScan);
  const admitted = [], diagnostics = [];
  let excluded = 0;
  for (let offset = 0; offset < candidates.length; offset += 64) {
    const observations = await Promise.all(candidates.slice(offset, offset + 64).map(async (path) => {
      const relative = relativeRegion ? `${relativeRegion}/${path}` : path;
      try { return { path: relative, stat: await lstat(join(address.path, path)) }; }
      catch (error) {
        if (!["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code)) throw error;
        return { path: relative, diagnostic: { path: relative, code: error.code, message: error.message } };
      }
    }));
    for (const observation of observations) {
      const { path, stat, diagnostic } = observation;
      if (diagnostic) { diagnostics.push(Object.freeze(diagnostic)); excluded += 1; }
      else if (stat.isSymbolicLink()) excluded += 1;
      else if (stat.isFile()) admitted.push(path);
      else excluded += 1;
    }
  }
  return Object.freeze({
    type: "MarkdownVaultDirectoryObservation", root: address.root, region: relativeRegion,
    excludes: Object.freeze([...excludes]), paths: Object.freeze(admitted.slice(0, limit)),
    symlinkPolicy: "exclude", diagnostics: Object.freeze(diagnostics),
    enumerated: enumeration.paths.length, scanned: candidates.length, excluded,
    available: admitted.length, truncated: eligible.length > maxScan || admitted.length > limit,
  });
}

function parseObserveMarkdownVaultDirectoryArguments(argv) {
  const options = { excludes: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--region") options.region = argv[++index];
    else if (argument === "--exclude") options.excludes.push(argv[++index]);
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--max-scan") options.maxScan = Number(argv[++index]);
    else throw new TypeError(`unrecognized argument: ${argument}`);
  }
  if (!options.root) throw new TypeError("--root is required");
  if (options.excludes.length === 0) delete options.excludes;
  return options;
}

export async function runObserveMarkdownVaultDirectory(argv, io) {
  const observation = await observeMarkdownVaultDirectory(parseObserveMarkdownVaultDirectoryArguments(argv));
  io.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runObserveMarkdownVaultDirectory(argv, { stdin, stdout, stderr }),
  formatError: (error) => `observe-markdown-vault-directory: ${error.message}\n`,
  exitCode: 64,
});
