#!/usr/bin/env node
import { planMarkdownTreeRelocation, countBoundaryBrokenLinks } from "./relocate-markdown-tree.mjs";

/** @typedef {{type: string, root: string, region: string, excludes: readonly string[], scanned: number, excluded: number, available: number, returned: number, symlinkPolicy: "exclude", limit: number, maxScan: number, truncated: boolean, complete: boolean, diagnostics: readonly object[]}} MarkdownTreeScanCoverage */
/** @typedef {{type: "MarkdownTreeSourceInventory", root: string, scope: string, paths: readonly string[], count: number, coverage: MarkdownTreeScanCoverage}} MarkdownTreeSourceInventory */
/** @typedef {{type: "MarkdownTreeRelocationSurvey", sourceInventory: MarkdownTreeSourceInventory, relationCoverage: MarkdownTreeScanCoverage, plan: object, beforeBrokenCount: number}} MarkdownTreeRelocationSurvey */
/** @typedef {{type: "MarkdownTreeRelocationRefusal", reason: string, sourceInventory: MarkdownTreeSourceInventory, relationCoverage: MarkdownTreeScanCoverage, writes?: readonly object[]}} MarkdownTreeRelocationRefusal */

function isWithin(region, path) {
  return region === "" || path === region || path.startsWith(`${region}/`);
}

export function summarizeMarkdownDirectoryObservation(observation, { limit, maxScan }) {
  return Object.freeze({
    type: observation.type,
    root: observation.root,
    region: observation.region,
    excludes: observation.excludes,
    scanned: observation.scanned,
    excluded: observation.excluded,
    available: observation.available,
    returned: observation.paths.length,
    symlinkPolicy: observation.symlinkPolicy,
    limit,
    maxScan,
    truncated: observation.truncated,
    complete: !observation.truncated && observation.diagnostics.length === 0,
    diagnostics: observation.diagnostics,
  });
}

function inventoryOf(observation, limits) {
  return Object.freeze({
    type: "MarkdownTreeSourceInventory",
    root: observation.root,
    scope: observation.region,
    paths: observation.paths,
    count: observation.paths.length,
    coverage: summarizeMarkdownDirectoryObservation(observation, limits),
  });
}

function refusal(reason, sourceInventory, relationCoverage) {
  return Object.freeze({ type: "MarkdownTreeRelocationRefusal", reason, sourceInventory, relationCoverage });
}

/**
 * Scan a root and compute the Markdown link rewrites a planned directory move implies.
 *
 * @param {object} options
 * @param {string} options.root - Real directory confining the scan (typically the repository root).
 * @param {string} options.sourceDir - Path (relative to root) of the tree being moved.
 * @param {string} options.destDir - Path (relative to root) the tree is moving to.
 * @param {string} [options.region] - Relation universe under root; default the whole root.
 * @param {number} [options.limit] - Maximum Markdown carriers admitted to each observation.
 * @param {number} [options.maxScan] - Maximum filesystem entries admitted to each observation.
 * @param {Function} options.scan - Reads and derives the relation-universe link graph (e.g. `scanMarkdownTreeLinks`); supplied by the caller at the kernel edge.
 * @param {Function} options.observe - Observes the source directory's Markdown carriers (e.g. `observeMarkdownVaultDirectory`); supplied by the caller at the kernel edge.
 * @returns {Promise<MarkdownTreeRelocationSurvey|MarkdownTreeRelocationRefusal>}
 */
export async function planMarkdownTreeRelocationFromDisk({ root, sourceDir, destDir, region = "", limit, maxScan, scan, observe } = {}) {
  const sourceLimits = Object.freeze({ limit: limit ?? 200, maxScan: maxScan ?? 20_000 });
  const sourceObservation = await observe({ root, region: sourceDir, ...sourceLimits });
  const sourceInventory = inventoryOf(sourceObservation, sourceLimits);
  const relation = await scan({ root, region, limit, maxScan });
  const relationCoverage = summarizeMarkdownDirectoryObservation(relation.observation, relation.limits);
  if (sourceObservation.truncated || sourceObservation.diagnostics.length) return refusal("source-inventory-incomplete", sourceInventory, relationCoverage);
  if (!relation.complete) return refusal("relation-universe-incomplete", sourceInventory, relationCoverage);
  if (!isWithin(relationCoverage.region, sourceDir) || !isWithin(relationCoverage.region, destDir)) {
    return refusal("relation-universe-excludes-relocation-boundary", sourceInventory, relationCoverage);
  }
  const plan = planMarkdownTreeRelocation({ graph: relation.graph, sourceDir, destDir });
  const before = countBoundaryBrokenLinks({ graph: relation.graph, sourceDir, destDir });
  return Object.freeze({
    type: "MarkdownTreeRelocationSurvey",
    sourceInventory,
    relationCoverage,
    plan,
    beforeBrokenCount: before.count,
  });
}
