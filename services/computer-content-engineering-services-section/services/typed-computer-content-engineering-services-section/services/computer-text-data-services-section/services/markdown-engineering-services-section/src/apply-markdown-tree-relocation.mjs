#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { replaceMarkdownLinkTarget } from "./replace-markdown-link-target.mjs";
import { deriveMarkdownVaultGraph } from "./derive-markdown-vault-graph.mjs";
import { planMarkdownTreeRelocationFromDisk, summarizeMarkdownDirectoryObservation } from "./plan-markdown-tree-relocation.mjs";
import {
  relocateMarkdownVaultDocumentPaths,
  countBoundaryBrokenLinks,
  planMarkdownLinkRepair,
} from "./relocate-markdown-tree.mjs";

/** @typedef {import("./plan-markdown-tree-relocation.mjs").MarkdownTreeRelocationRefusal} MarkdownTreeRelocationRefusal */
/** @typedef {import("./plan-markdown-tree-relocation.mjs").MarkdownTreeSourceInventory} MarkdownTreeSourceInventory */
/** @typedef {import("./plan-markdown-tree-relocation.mjs").MarkdownTreeScanCoverage} MarkdownTreeScanCoverage */
/** @typedef {{type: "MarkdownTreeRelocationApplication", sourceInventory: MarkdownTreeSourceInventory, relationCoverage: MarkdownTreeScanCoverage, plan: object, writes: readonly object[], beforeBrokenCount: number, afterBrokenCount: number, newBrokenCount: number, ok: boolean}} MarkdownTreeRelocationApplication */

/**
 * Write a link plan's edits (a relocation or repair plan: `{ files: [{ filePath, edits }] }`)
 * at each file's current path, preserving every other byte.
 */
export async function applyMarkdownLinkEdits({ root, plan, write } = {}) {
  const writes = [];
  for (const file of plan.files) {
    let text = await readMarkdownFile({ root, path: file.filePath });
    for (const edit of file.edits) {
      text = replaceMarkdownLinkTarget(text, { target: edit.target, replacement: edit.replacement, all: true, required: true }).text;
    }
    const receipt = await write({ root, path: file.filePath, text, mode: "replace", normalization: "preserve" });
    writes.push({ filePath: file.filePath, changed: receipt.changed, edits: file.edits.length });
  }
  return Object.freeze(writes);
}

/**
 * Apply the Markdown link rewrites a planned directory move implies, then verify.
 *
 * Edits are written at each file's CURRENT path (this operation never moves a
 * file); the caller performs the actual directory move (e.g. `git mv`)
 * separately, before or after, since content is correct either way. Verification
 * simulates the post-move document set by relabeling paths under sourceDir to
 * destDir and re-deriving the graph, so success can be proven before the real
 * move ever happens. `ok` means the move introduces no new boundary-broken
 * links; inherited broken links remain visible in the before/after counts and
 * do not make an otherwise safe relocation fail.
 *
 * @param {object} options
 * @param {string} options.root - Real directory confining the scan and writes.
 * @param {string} options.sourceDir - Path (relative to root) of the tree being moved.
 * @param {string} options.destDir - Path (relative to root) the tree is moving to.
 * @param {string} [options.region] - Sub-path of root to scan; default the whole root.
 * @param {Function} options.scan - Reads and derives the relation-universe link graph (e.g. `scanMarkdownTreeLinks`); supplied by the caller at the kernel edge.
 * @param {Function} options.observe - Observes the source directory's Markdown carriers (e.g. `observeMarkdownVaultDirectory`); supplied by the caller at the kernel edge.
 * @param {Function} options.write - Writes a rewritten Markdown file (e.g. `writeMarkdownFile`); supplied by the caller at the kernel edge.
 * @returns {Promise<MarkdownTreeRelocationApplication|MarkdownTreeRelocationRefusal>}
 */
export async function applyMarkdownTreeRelocation({ root, sourceDir, destDir, region = "", limit, maxScan, scan, observe, write } = {}) {
  const survey = await planMarkdownTreeRelocationFromDisk({ root, sourceDir, destDir, region, limit, maxScan, scan, observe });
  if (survey.type === "MarkdownTreeRelocationRefusal") return survey;
  const { plan } = survey;

  const writes = await applyMarkdownLinkEdits({ root, plan, write });

  const after = await scan({ root, region, limit, maxScan });
  if (after.truncated) {
    return Object.freeze({
      type: "MarkdownTreeRelocationRefusal",
      reason: "post-apply-relation-universe-incomplete",
      sourceInventory: survey.sourceInventory,
      relationCoverage: summarizeMarkdownDirectoryObservation(after.observation, after.limits),
      writes: Object.freeze(writes),
    });
  }
  const movedDocuments = relocateMarkdownVaultDocumentPaths({ documents: after.documents, sourceDir, destDir });
  const movedGraph = deriveMarkdownVaultGraph({ documents: movedDocuments });
  const afterBoundary = countBoundaryBrokenLinks({ graph: movedGraph, sourceDir, destDir });

  const newBrokenCount = Math.max(0, afterBoundary.count - survey.beforeBrokenCount);
  return Object.freeze({
    type: "MarkdownTreeRelocationApplication",
    sourceInventory: survey.sourceInventory,
    relationCoverage: summarizeMarkdownDirectoryObservation(after.observation, after.limits),
    plan,
    writes: Object.freeze(writes),
    beforeBrokenCount: survey.beforeBrokenCount,
    afterBrokenCount: afterBoundary.count,
    newBrokenCount,
    ok: newBrokenCount === 0,
  });
}

/**
 * Repair every Markdown link under root whose written path no longer names the document it
 * resolves to, then rescan. Ambiguous and dangling links are reported, never guessed at.
 */
export async function applyMarkdownLinkRepair({ root, region = "", limit, maxScan, scan, write } = {}) {
  const before = await scan({ root, region, limit, maxScan });
  if (!before.complete) {
    return Object.freeze({ type: "MarkdownLinkRepairRefusal", reason: "relation-universe-incomplete", relationCoverage: summarizeMarkdownDirectoryObservation(before.observation, before.limits) });
  }
  const literalExists = (path) => existsSync(resolvePath(root, path));
  const plan = planMarkdownLinkRepair({ graph: before.graph, literalExists });
  const writes = await applyMarkdownLinkEdits({ root, plan, write });
  const after = await scan({ root, region, limit, maxScan });
  return Object.freeze({
    type: "MarkdownLinkRepairApplication",
    relationCoverage: summarizeMarkdownDirectoryObservation(after.observation, after.limits),
    rewrites: plan.rewrites.length,
    files: writes.length,
    before: before.graph.diagnostics,
    after: after.graph.diagnostics,
    remaining: planMarkdownLinkRepair({ graph: after.graph, literalExists }).rewrites.length,
  });
}
