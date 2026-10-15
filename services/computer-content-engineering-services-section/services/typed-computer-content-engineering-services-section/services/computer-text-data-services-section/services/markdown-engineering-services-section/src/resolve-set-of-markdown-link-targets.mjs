import { realpathSync } from "node:fs";
import { relative as relativePath, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { observeMarkdownVaultDirectory } from "./observe-markdown-vault-directory.mjs";
import { projectMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";
import { readMarkdownFile } from "./read-markdown-file.mjs";

import { resolveMarkdownLinkTarget } from "./resolve-markdown-link-target.mjs";

const LINK_FEATURE_TYPES = new Set(["markdown-link", "wikilink", "transclusion"]);
const LEGACY_REGION = /(?:^|\/)lib\/legacy(?:\/|$)/u;
const UNRESOLVED_STATUSES = new Set(["missing", "escaped"]);

/**
 * Resolve every link-shaped Markdown feature (Markdown link, image,
 * wikilink, transclusion) in one carrier's already-read text.
 *
 * @param {string} text - Carrier source text.
 * @param {object} options
 * @param {string} options.carrierPath - Absolute path of the carrier.
 * @param {string} options.root - Absolute path confining resolution.
 * @returns {Promise<ReadonlyArray<Readonly<{
 *   type: string, label: string|null, target: string, image: boolean,
 *   span: object, resolution: object,
 * }>>>}
 */
export async function resolveSetOfMarkdownLinkTargets(text, { carrierPath, root } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const features = projectMarkdownFeatures(readMarkdownSource(text)).filter((feature) => LINK_FEATURE_TYPES.has(feature.type));
  const entries = [];
  for (const feature of features) {
    const resolution = await resolveMarkdownLinkTarget(feature.target, { carrierPath, root });
    entries.push(Object.freeze({
      type: feature.type,
      label: feature.label ?? null,
      target: feature.target,
      image: feature.image ?? false,
      span: feature.span,
      resolution,
    }));
  }
  return Object.freeze(entries);
}

/**
 * Walk a Markdown section subtree and resolve every link feature found in
 * it, ignoring `node_modules` and `lib/legacy`. This is the operation the
 * corpus link-verification check runs.
 *
 * @param {object} options
 * @param {string} options.root - Absolute path of the subtree to walk.
 * @param {string} [options.region] - Sub-path of root to scan; default the whole root.
 * @returns {Promise<{
 *   checked: number,
 *   unresolved: ReadonlyArray<Readonly<{carrierPath: string, label: string|null, target: string, status: string}>>,
 * }>}
 */
export async function walkMarkdownLinkTargets({ root, region = "" } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root must be a nonempty string");
  const observation = await observeMarkdownVaultDirectory({
    root,
    region,
    excludes: ["node_modules"],
    limit: 1_000_000,
    maxScan: 1_000_000,
  });
  if (observation.truncated || observation.diagnostics.length) throw new Error("Markdown link walk requires a complete readable inventory");
  const paths = observation.paths.filter((path) => !LEGACY_REGION.test(path));

  let checked = 0;
  const unresolved = [];
  for (const path of paths) {
    const text = await readMarkdownFile({ root: observation.root, path });
    const carrierPath = resolvePath(observation.root, path);
    const entries = await resolveSetOfMarkdownLinkTargets(text, { carrierPath, root: observation.root });
    checked += entries.length;
    for (const entry of entries) {
      if (UNRESOLVED_STATUSES.has(entry.resolution.status)) {
        unresolved.push(Object.freeze({
          carrierPath, label: entry.label, target: entry.target, status: entry.resolution.status,
        }));
      }
    }
  }
  return Object.freeze({ checked, unresolved: Object.freeze(unresolved) });
}

/**
 * Read newline-separated carrier paths from stdin.
 *
 * @returns {Promise<string[]>}
 */
async function readCarrierPathsFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

/**
 * CLI entrypoint: resolve every link-shaped Markdown feature in the given
 * carrier files (positional arguments, or one path per line on stdin when
 * none are given) and report the ones that fail to resolve. Exits 1 when
 * any link is unresolved, 2 on bad arguments, 0 otherwise.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const { values, positionals } = parseArgs({
    options: { root: { type: "string" } },
    allowPositionals: true,
  });
  const root = resolvePath(values.root ?? process.cwd());

  let carrierArgs = positionals;
  if (carrierArgs.length === 0 && !process.stdin.isTTY) {
    carrierArgs = await readCarrierPathsFromStdin();
  }
  if (carrierArgs.length === 0) {
    process.stdout.write(`${JSON.stringify({ error: "no carrier paths given: pass paths as arguments or pipe them on stdin" })}\n`);
    process.exitCode = 2;
    return;
  }

  let links = 0;
  const unresolved = [];
  for (const carrierArg of carrierArgs) {
    const carrierPath = resolvePath(root, carrierArg);
    let text;
    try {
      text = await readMarkdownFile({ root, path: relativePath(root, carrierPath) });
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ error: `failed to read ${carrierPath}: ${error.message}` })}\n`);
      process.exitCode = 2;
      return;
    }
    const entries = await resolveSetOfMarkdownLinkTargets(text, { carrierPath, root });
    links += entries.length;
    for (const entry of entries) {
      if (UNRESOLVED_STATUSES.has(entry.resolution.status)) {
        unresolved.push({ carrierPath, target: entry.target, status: entry.resolution.status });
      }
    }
  }

  process.stdout.write(`${JSON.stringify({ files: carrierArgs.length, links, unresolved })}\n`);
  process.exitCode = unresolved.length > 0 ? 1 : 0;
}

if (isEntrypoint(import.meta.url)) {
  await main();
}
