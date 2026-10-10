#!/usr/bin/env node
import { relativeLinkPath } from "./relocate-markdown-tree.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Project the correct `../`-relative link text one Markdown carrier would
 * use to reach another repo-relative path. A thin public name over
 * `relativeLinkPath` (the same computation `planMarkdownTreeRelocation`
 * already uses for a directory move) so a session can get one relative
 * link right without hand-counting `../` segments.
 *
 * @param {string} carrierPath - Repo-relative path of the Markdown carrier the link appears in.
 * @param {string} targetPath - Repo-relative path of the link's target.
 * @returns {string} The relative link text (e.g. `../../other/note.md`).
 * @throws {TypeError} When either path is not a nonempty string.
 */
export function projectMarkdownRelativeLink(carrierPath, targetPath) {
  if (typeof carrierPath !== "string" || carrierPath === "") throw new TypeError("carrierPath must be a nonempty string");
  if (typeof targetPath !== "string" || targetPath === "") throw new TypeError("targetPath must be a nonempty string");
  return relativeLinkPath(carrierPath, targetPath);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [carrierPath, targetPath] = process.argv.slice(2);
  if (!carrierPath || !targetPath) {
    process.stderr.write("usage: project-markdown-relative-link.mjs <carrierPath> <targetPath>\n");
    process.exit(2);
  }
  try {
    process.stdout.write(`${projectMarkdownRelativeLink(carrierPath, targetPath)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exit(2);
  }
}
