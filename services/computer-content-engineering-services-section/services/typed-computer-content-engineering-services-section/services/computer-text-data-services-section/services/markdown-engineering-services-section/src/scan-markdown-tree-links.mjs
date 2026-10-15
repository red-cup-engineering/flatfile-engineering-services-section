#!/usr/bin/env node
import { observeMarkdownVaultDirectory } from "./observe-markdown-vault-directory.mjs";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { projectMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";
import { deriveMarkdownVaultGraph } from "./derive-markdown-vault-graph.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Read every admitted Markdown document beneath a root and derive its link graph.
 *
 * Scope note: only Markdown-link/Markdown-image syntax and wikilink/transclusion
 * targets are extracted (frontmatter is not read here, so frontmatter-reference
 * edges are absent from the returned graph).
 *
 * @param {object} options
 * @param {string} options.root - Real directory confining the scan.
 * @param {string} [options.region] - Sub-path of root to scan; default the whole root.
 * @param {number} [options.limit] - Maximum documents to read; default 20000.
 * @param {number} [options.maxScan] - Maximum Markdown candidates to admit; default 200000.
 * @returns {Promise<{documents: object[], graph: object, truncated: boolean, observation: object, limits: {limit: number, maxScan: number}}>}
 */
export async function scanMarkdownTreeLinks({ root, region = "", limit = 20_000, maxScan = 200_000 } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root must be a nonempty string");
  const observation = await observeMarkdownVaultDirectory({ root, region, limit, maxScan });
  const documents = [];
  for (const path of observation.paths) {
    const text = await readMarkdownFile({ root, path });
    documents.push({ path, features: projectMarkdownFeatures(readMarkdownSource(text)), frontmatter: null });
  }
  const graph = deriveMarkdownVaultGraph({ documents });
  return Object.freeze({ documents: Object.freeze(documents), graph, complete: !observation.truncated && observation.diagnostics.length === 0, truncated: observation.truncated, observation, limits: Object.freeze({ limit, maxScan }) });
}

/** Every dangling/ambiguous edge in a scanned graph, with no relocation-boundary filter. */
export function reportBrokenMarkdownLinks(graph) {
  return graph.edges.filter((edge) => edge.status === "dangling" || edge.status === "ambiguous");
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [root, region = ""] = process.argv.slice(2);
  if (!root) {
    process.stderr.write("usage: scan-markdown-tree-links.mjs <root> [region]\n");
    process.exit(2);
  }
  const { graph, truncated } = await scanMarkdownTreeLinks({ root, region });
  const broken = reportBrokenMarkdownLinks(graph);
  process.stdout.write(`${JSON.stringify({ edges: graph.edges.length, broken: broken.length, truncated, brokenEdges: broken }, null, 2)}\n`);
  process.exit(broken.length > 0 ? 1 : 0);
}
