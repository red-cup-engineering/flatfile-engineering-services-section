/**
 * observe-markdown-vaults — enumerates a repository's Markdown carriers
 * through a declared, policy-explicit set of named vault regions (plus one
 * catch-all fallback region), classifies each carrier's generation from its
 * path, and reports per-vault and repository-wide counts. Enumeration is
 * supplied by ripgrep's `--files` mode so hidden and `.gitignore`d paths are
 * still admitted; only the policy's own `excludedDirectoryNames` are cut.
 *
 * The vault policy (which regions exist, which extensions count as Markdown,
 * which directory names are always excluded) is never hardcoded here: it is
 * read from a policy JSON supplied by the caller — a CLI flag, an env var, or
 * a config path argument. A deployment names its own regions in that file.
 *
 */
import { confineExistingPath, confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { spawnSync } from "node:child_process";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { resolve } from "node:path";
import { readFlagValue } from "@red-cup-engineering/computer-text-content-engineering-services-section/read-flag-token-values";

function posixPath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function assertString(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a nonempty string`);
}

export function admitVaultPolicy(policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) throw new TypeError("policy must be an object");
  if (policy.schemaVersion !== 1) throw new TypeError("policy schemaVersion must be 1");
  if (!Array.isArray(policy.extensions) || policy.extensions.length === 0) throw new TypeError("policy extensions must be nonempty");
  if (!Array.isArray(policy.excludedDirectoryNames)) throw new TypeError("policy excludedDirectoryNames must be an array");
  if (!Array.isArray(policy.vaults) || policy.vaults.length === 0) throw new TypeError("policy vaults must be nonempty");
  const ids = new Set();
  let fallback = null;
  const vaults = policy.vaults.map((vault) => {
    assertString(vault?.id, "vault id");
    assertString(vault?.region, `region for ${vault.id}`);
    if (ids.has(vault.id)) throw new TypeError(`duplicate vault id ${vault.id}`);
    ids.add(vault.id);
    const admitted = Object.freeze({
      id: vault.id,
      region: posixPath(vault.region) || ".",
      description: typeof vault.description === "string" ? vault.description : "",
      fallback: vault.fallback === true,
    });
    if (admitted.fallback) {
      if (fallback) throw new TypeError("policy may have only one fallback vault");
      fallback = admitted;
    }
    return admitted;
  });
  if (!fallback) throw new TypeError("policy must declare one fallback vault");
  return Object.freeze({
    schemaVersion: 1,
    supplier: policy.supplier ?? "ripgrep",
    extensions: Object.freeze(policy.extensions.map((extension) => String(extension).toLowerCase())),
    excludedDirectoryNames: Object.freeze(policy.excludedDirectoryNames.map(String)),
    vaults: Object.freeze(vaults),
  });
}

/**
 * Reads and admits a vault policy JSON file. There is no bundled default
 * path: the caller (a CLI flag, an env var, or a config path argument) names
 * the policy file for its own deployment.
 * @param {string} policyPath
 */
export async function readVaultPolicy(policyPath) {
  assertString(policyPath, "policyPath");
  return admitVaultPolicy(JSON.parse(await readFileText(policyPath)));
}

export function vaultForPath(path, policy) {
  const normalized = posixPath(path);
  const candidates = policy.vaults
    .filter((vault) => !vault.fallback && (normalized === vault.region || normalized.startsWith(`${vault.region}/`)))
    .sort((left, right) => right.region.length - left.region.length);
  return candidates[0] ?? policy.vaults.find((vault) => vault.fallback);
}

export function generationForPath(path) {
  const segments = posixPath(path).split("/");
  if (segments.includes("legacy")) return "legacy";
  if (segments.includes("outside-projects")) return "reference";
  if (segments.includes("triage")) return "triage";
  return "current";
}

function ripgrepFileArguments(policy) {
  const args = ["--files", "--hidden", "--no-ignore", "--null"];
  for (const extension of policy.extensions) args.push("--glob", `*.${extension.replace(/[a-z]/gu, (letter) => `[${letter}${letter.toUpperCase()}]`)}`);
  for (const name of policy.excludedDirectoryNames) args.push("--glob", `!**/${name}/**`);
  return args;
}

export async function enumerateMarkdownPaths({ root, policy, command = "rg" } = {}) {
  assertString(root, "root");
  const admittedPolicy = admitVaultPolicy(policy);
  const admittedRoot = (await confineExistingPath({ root })).root;
  const { status, stdout, stderr, error } = spawnSync(command, ripgrepFileArguments(admittedPolicy), {
    cwd: admittedRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  if (error) throw error;
  // ripgrep reports no matching files with status 1; that is an empty inventory.
  if (status === 1 && stdout === "" && stderr === "") return Object.freeze({ root: admittedRoot, paths: Object.freeze([]), command });
  if (status !== 0) throw new Error(`${command} file enumeration failed (${status}): ${stderr.trim()}`);
  const paths = stdout.split("\0").filter(Boolean).map(posixPath);
  return Object.freeze({ root: admittedRoot, paths: Object.freeze(paths.sort()), command });
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {import("../types/observe-markdown-vaults.d.mjs").MarkdownVaultPolicy} [options.policy] - an already-admitted (or plain) policy object
 * @param {string} [options.policyPath] - read and admitted when `policy` is not supplied; no bundled default
 * @param {number} [options.sampleLimit]
 * @param {boolean} [options.includePaths]
 * @param {string} [options.command]
 */
export async function observeMarkdownVaults({
  root,
  policy,
  policyPath,
  sampleLimit = 5,
  includePaths = false,
  command = "rg",
} = {}) {
  if (!Number.isInteger(sampleLimit) || sampleLimit < 0) throw new TypeError("sampleLimit must be a nonnegative integer");
  const admittedPolicy = policy ? admitVaultPolicy(policy) : await readVaultPolicy(policyPath);
  const enumeration = await enumerateMarkdownPaths({ root, policy: admittedPolicy, command });
  const records = new Map(admittedPolicy.vaults.map((vault) => [vault.id, {
    id: vault.id,
    region: vault.region,
    description: vault.description,
    fallback: vault.fallback,
    documents: 0,
    generations: { current: 0, legacy: 0, reference: 0, triage: 0 },
    extensions: {},
    samples: [],
    paths: includePaths ? [] : undefined,
  }]));
  const totals = { documents: 0, generations: { current: 0, legacy: 0, reference: 0, triage: 0 }, extensions: {} };
  for (const path of enumeration.paths) {
    const vault = vaultForPath(path, admittedPolicy);
    const record = records.get(vault.id);
    const generation = generationForPath(path);
    const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    record.documents += 1;
    record.generations[generation] += 1;
    record.extensions[extension] = (record.extensions[extension] ?? 0) + 1;
    if (record.samples.length < sampleLimit) record.samples.push(path);
    if (includePaths) record.paths.push(path);
    totals.documents += 1;
    totals.generations[generation] += 1;
    totals.extensions[extension] = (totals.extensions[extension] ?? 0) + 1;
  }
  const vaults = [...records.values()].map((record) => Object.freeze({
    ...record,
    generations: Object.freeze(record.generations),
    extensions: Object.freeze(record.extensions),
    samples: Object.freeze(record.samples),
    ...(includePaths ? { paths: Object.freeze(record.paths) } : {}),
  }));
  const fallback = vaults.find((vault) => vault.fallback);
  return Object.freeze({
    type: "MarkdownVaultObservation",
    root: enumeration.root,
    policy: Object.freeze({ schemaVersion: admittedPolicy.schemaVersion, path: policy ? null : resolve(policyPath) }),
    supplier: Object.freeze({ command: enumeration.command, mode: "--files --hidden --no-ignore" }),
    totals: Object.freeze({ ...totals, generations: Object.freeze(totals.generations), extensions: Object.freeze(totals.extensions) }),
    vaults: Object.freeze(vaults),
    diagnostics: Object.freeze({
      allDocumentsAssigned: totals.documents === vaults.reduce((sum, vault) => sum + vault.documents, 0),
      fallbackDocuments: fallback?.documents ?? 0,
    }),
  });
}

export function repositoryRelativePath(root, path) {
  try {
    return confinePath({ root, path }).relativePath;
  } catch {
    throw new TypeError("path escapes repository root");
  }
}

const OBSERVE_KNOWN_FLAGS = ["--root", "--policy", "--sample-limit", "--include-paths"];

export function parseObserveArguments(argv) {
  for (const token of argv) if (token.startsWith("--") && !OBSERVE_KNOWN_FLAGS.includes(token)) throw new TypeError(`unrecognized argument: ${token}`);
  const sampleLimitText = readFlagValue("--sample-limit", argv);
  return {
    root: readFlagValue("--root", argv) ?? process.cwd(),
    policyPath: readFlagValue("--policy", argv),
    ...(sampleLimitText === undefined ? {} : { sampleLimit: Number(sampleLimitText) }),
    includePaths: argv.includes("--include-paths"),
  };
}

export async function runObserveMarkdownVaults(argv, io) {
  const options = parseObserveArguments(argv);
  options.policyPath ??= process.env.MARKDOWN_VAULT_POLICY_PATH;
  const observation = await observeMarkdownVaults(options);
  io.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

export const command = Object.freeze({
  run: ({ argv, stdout, stderr }) => runObserveMarkdownVaults(argv, { stdout, stderr }),
  formatError: (error) => `observe-markdown-vaults: ${error.message}\n`,
  exitCode: 64,
});
