#!/usr/bin/env node
import { posix } from "node:path";
import { applyMarkdownLinkEdits } from "./apply-markdown-tree-relocation.mjs";
import { planMarkdownLinkRetarget } from "./consolidate-markdown-duplicates.mjs";
import { relativeLinkPath } from "./relocate-markdown-tree.mjs";

const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;

/**
 * Rewrite a document's relative links for its new path: each target is read from where the
 * document was, followed through `moves` if it is moving too, and written relative to where the
 * document goes.
 */
export function rebaseMarkdownLinks(text, from, to, moves = new Map()) {
  return text.replace(/(\]\()([^)\s]+)(\))/gu, (whole, open, target, close) => {
    if (EXTERNAL_TARGET.test(target) || target.startsWith("#") || target.startsWith("/")) return whole;
    const hash = target.indexOf("#");
    const path = hash < 0 ? target : target.slice(0, hash);
    const fragment = hash < 0 ? "" : target.slice(hash);
    if (path === "") return whole;
    let decoded = path;
    try { decoded = decodeURIComponent(path); } catch { /* Keep the literal target. */ }
    const absolute = posix.normalize(posix.join(posix.dirname(from), decoded));
    const destination = moves.get(absolute) ?? absolute;
    return `${open}${relativeLinkPath(to, destination)}${fragment}${close}`;
  });
}

/**
 * Move documents to new paths under root. Each moved document is written at its destination
 * with its links rebased (and `transform`, if given, applied to its text), every link to it from
 * a document that stays is pointed at the destination, and its old file is removed. A move whose
 * destination is already taken, or that two documents claim, is refused and left in place.
 *
 * @param {object} options
 * @param {Map<string, string>} options.moves - root-relative source path to destination path.
 * @param {Function} [options.transform] - (text, { from, to }) => text, applied after rebasing.
 */
export async function applyMarkdownDocumentMoves({ root, region = "", limit, maxScan, moves, transform = (text) => text, scan, read, write, exists, remove } = {}) {
  if (!(moves instanceof Map)) throw new TypeError("moves must be a Map of source path to destination path");
  const claimed = new Map();
  for (const [from, to] of moves) claimed.set(to, [...(claimed.get(to) ?? []), from]);
  const refused = [];
  const admitted = new Map();
  for (const [from, to] of moves) {
    if (from === to) continue;
    if ((claimed.get(to) ?? []).length > 1 || await exists({ root, path: to })) { refused.push(Object.freeze({ from, to })); continue; }
    admitted.set(from, to);
  }
  const before = await scan({ root, region, limit, maxScan });
  const retargeted = planMarkdownLinkRetarget({ graph: before.graph, retarget: admitted });
  const linkWrites = await applyMarkdownLinkEdits({ root, plan: retargeted, write });
  let moved = 0;
  for (const [from, to] of admitted) {
    const text = transform(rebaseMarkdownLinks(await read({ root, path: from }), from, to, admitted), { from, to });
    await write({ root, path: to, text, mode: "create", normalization: "preserve" });
    await remove({ root, path: from });
    moved += 1;
  }
  return Object.freeze({
    type: "MarkdownDocumentMoves",
    moved,
    refused: Object.freeze(refused),
    linksRetargeted: retargeted.rewrites,
    filesRelinked: linkWrites.length,
  });
}

/**
 * Rewrite a document's `id:` links (org-roam identities carried over from org), whether written
 * as Markdown `[label](id:…)` or left in org form `[[id:…][label]]` (escaped or not), to the
 * relative path of the document that holds that identity. A link whose identity no document
 * holds becomes its plain text: a named thing the corpus has no page for yet.
 *
 * @param {string} text
 * @param {string} path - the document's root-relative path.
 * @param {Map<string, string>} documentOfId - identity to root-relative path.
 */
export function resolveMarkdownIdLinks(text, path, documentOfId) {
  const link = /\[([^\]]*)\]\(id:([0-9A-Fa-f-]{8,})\)|\\?\[\\?\[id:([0-9A-Fa-f-]{8,})\\?\](?:\\?\[([^\]\\]*)\\?\])?\\?\]/gu;
  return text.replace(link, (whole, markdownLabel, markdownId, orgId, orgLabel) => {
    const id = markdownId ?? orgId;
    const label = markdownLabel ?? orgLabel ?? id;
    const target = documentOfId.get(id.toLowerCase());
    if (target === undefined) return label;
    return target === path ? label : `[${label}](${relativeLinkPath(path, target)})`;
  });
}
