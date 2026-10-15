#!/usr/bin/env node
import { posix } from "node:path";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";
import { relativeLinkPath } from "./relocate-markdown-tree.mjs";
import { mutateMarkdownFrontmatter } from "./mutate-markdown-frontmatter.mjs";
import { applyMarkdownLinkEdits } from "./apply-markdown-tree-relocation.mjs";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;
const REWRITABLE_KINDS = new Set(["markdown-link", "markdown-image", "wikilink", "transclusion"]);
const NAMED_KINDS = new Set(["wikilink", "transclusion"]);

/** Path segments that mark a copy as custody rather than a living home. */
export const CUSTODY_SEGMENTS = Object.freeze(["lenticule-import", "triage", "_archive", "archive", "legacy", "archived", "assets"]);

/** The text a document says, without its frontmatter, with whitespace runs collapsed. */
export function markdownBodyIdentity(text) {
  let body = text;
  try {
    const fence = splitMarkdownFrontmatterFence(text);
    if (fence?.body !== undefined) body = fence.body;
  } catch { /* An unreadable fence is body. */ }
  const normalized = body.replace(/\s+/gu, " ").trim();
  return Object.freeze({ normalized, digest: sha256Hex(normalized) });
}

/**
 * The order in which copies of one document are preferred as its home: fewer custody segments
 * first (a living note over a triage, archive, or import copy, or an export's counter-named carrier), then a glossary location, then
 * the shallower and shorter path, then the path itself.
 */
export function rankMarkdownCopy(path) {
  const segments = path.split("/");
  const custody = segments.filter((segment) => CUSTODY_SEGMENTS.includes(segment)).length + (/\.org\.md$|--\d{3,}\.md$/iu.test(path) ? 1 : 0);
  const glossary = segments.includes("glossary") ? 0 : 1;
  return [custody, glossary, segments.length, path.length, path];
}

function compareRanks(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

/** Frontmatter keys that describe one carrier rather than the document's content; never carried. */
const CARRIER_KEYS = new Set(["title", "name", "identity", "id", "aliases", "description", "date-created", "date-modified", "date-updated", "provenance", "status", "authors", "author", "source", "path"]);

function frontmatterOf(text) {
  try { return readMarkdownFrontmatter(text, { frontmatterFormats: ["yaml"], absentFrontmatter: "empty" }).frontmatter ?? {}; } catch { return null; }
}

/** What retired copies' frontmatter says that the home's does not: keys the home lacks, first copy first. */
function carriedFrontmatter(home, retired) {
  const own = frontmatterOf(home.text);
  if (own === null) return {};
  const carried = {};
  for (const copy of retired) {
    const theirs = frontmatterOf(copy.text) ?? {};
    for (const [key, value] of Object.entries(theirs)) {
      if (CARRIER_KEYS.has(key) || Object.hasOwn(own, key) || Object.hasOwn(carried, key) || value === null || value === "") continue;
      carried[key] = value;
    }
  }
  return carried;
}

function names(text) {
  let frontmatter = {};
  try { frontmatter = readMarkdownFrontmatter(text, { frontmatterFormats: ["yaml"], absentFrontmatter: "empty" }).frontmatter ?? {}; } catch { /* No names from a broken block. */ }
  const found = new Set();
  for (const key of ["title", "name"]) if (typeof frontmatter[key] === "string" && frontmatter[key].trim()) found.add(frontmatter[key].trim());
  const aliases = Array.isArray(frontmatter.aliases) ? frontmatter.aliases : typeof frontmatter.aliases === "string" ? [frontmatter.aliases] : [];
  for (const alias of aliases) if (typeof alias === "string" && alias.trim()) found.add(alias.trim());
  return found;
}

/**
 * Group documents that say the same thing and choose each group's home.
 *
 * Documents whose bodies are identical once frontmatter is set aside and whitespace collapsed
 * are copies of one document. The best-ranked copy (`rankMarkdownCopy`) is kept; every other
 * copy is retired to it. The kept copy gains, as aliases, the titles, names, and aliases its
 * retired copies carried that it does not, and every other frontmatter key a retired copy states
 * that the kept copy lacks (a relation, a citation list), so a reader who found a copy by name still finds
 * the document; links are retargeted separately (`planMarkdownLinkRetarget`). Bodies shorter than `minimumLength` are not grouped: two stubs that
 * share one sentence are not the same document.
 *
 * @param {object} options
 * @param {{path: string, text: string}[]} options.documents
 * @param {number} [options.minimumLength]
 */
export function planMarkdownDuplicateConsolidation({ documents, minimumLength = 80, rank = rankMarkdownCopy } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  const byDigest = new Map();
  for (const document of documents) {
    const identity = markdownBodyIdentity(document.text);
    if (identity.normalized.length < minimumLength) continue;
    const group = byDigest.get(identity.digest) ?? [];
    group.push(document);
    byDigest.set(identity.digest, group);
  }
  const groups = [];
  const retarget = new Map();
  for (const [digest, copies] of byDigest) {
    if (copies.length < 2) continue;
    const ranked = [...copies].sort((left, right) => compareRanks(rank(left.path), rank(right.path)));
    const [home, ...retired] = ranked;
    const carried = names(home.text);
    const aliases = new Set();
    for (const copy of retired) {
      retarget.set(copy.path, home.path);
      for (const name of names(copy.text)) if (!carried.has(name)) aliases.add(name);
    }
    groups.push(Object.freeze({
      digest,
      home: home.path,
      retired: Object.freeze(retired.map(({ path }) => path)),
      aliases: Object.freeze([...aliases].sort()),
      carried: Object.freeze(carriedFrontmatter(home, retired)),
    }));
  }
  groups.sort((left, right) => left.home.localeCompare(right.home));
  return Object.freeze({ type: "MarkdownDuplicateConsolidationPlan", groups: Object.freeze(groups), retarget });
}

/** Five-word shingles of what a text says: link targets are where it points, not what it says. */
function wordShingles(text, width = 5) {
  const words = markdownBodyIdentity(text.replace(/\]\([^)\s]*\)/gu, "]")).normalized.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/u).filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index + width <= words.length; index += 1) shingles.add(words.slice(index, index + width).join(" "));
  return shingles;
}

function fmix32(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}
function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  return hash >>> 0;
}

/**
 * The MinHash signature of a document's five-word shingles: for each of `hashes` seeded hash
 * functions, the least hash any shingle takes. Two signatures agree at a position with
 * probability equal to the Jaccard overlap of the two shingle sets, so documents that say one
 * thing under different names find each other without comparing every pair. A document with
 * fewer than `minimumShingles` shingles has no signature (`null`): too short to say anything twice.
 */
export function markdownShingleSignature(text, { hashes = 64, width = 5, minimumShingles = 20 } = {}) {
  const shingles = wordShingles(text, width);
  if (shingles.size < minimumShingles) return null;
  const signature = new Uint32Array(hashes).fill(0xffffffff);
  for (const shingle of shingles) {
    const base = fnv1a32(shingle);
    for (let index = 0; index < hashes; index += 1) {
      const value = fmix32(base ^ Math.imul(index + 1, 0x9e3779b9));
      if (value < signature[index]) signature[index] = value;
    }
  }
  return signature;
}

/**
 * Locality-sensitive bands of a signature: `rows` consecutive positions per band, each band a
 * key. Documents sharing any band key are candidates; with 64 hashes in 16 bands of 4 rows, a
 * pair overlapping by 0.5 shares a band about 64% of the time and a pair overlapping by 0.8
 * about 99.9% of the time.
 */
export function markdownSignatureBands(signature, { rows = 4 } = {}) {
  const bands = [];
  for (let start = 0; start + rows <= signature.length; start += rows) {
    let hash = 0x811c9dc5;
    for (let index = start; index < start + rows; index += 1) hash = Math.imul(hash ^ signature[index], 0x01000193);
    bands.push(`${start / rows}:${(hash >>> 0).toString(36)}`);
  }
  return bands;
}

/** The estimated Jaccard overlap of the shingle sets two signatures were taken from. */
export function estimateShingleOverlap(left, right) {
  if (left.length !== right.length) throw new RangeError("signatures must have one length");
  let agree = 0;
  for (let index = 0; index < left.length; index += 1) if (left[index] === right[index]) agree += 1;
  return agree / left.length;
}

/** A copy held in custody: in a custody tree, or a converted carrier (`<name>.org.md`) awaiting its home. */
export function isCustodyCopy(path) {
  return path.split("/").some((segment) => CUSTODY_SEGMENTS.includes(segment)) || /\.org\.md$/iu.test(path);
}

/**
 * The name a copy is filed under, without an export's numeric suffix, the filing law's date and
 * `note-on-` prefix, or an import's marks: a trailing date (`canon-2026-03-05`), a `-from-library`
 * source mark, or a one- or two-digit counter (`lore-1`, `worldbuilding-3`).
 */
export function copyStem(path) {
  return posix.basename(path).replace(/\.(?:md|markdown)$/iu, "").replace(/\.org$/iu, "").toLowerCase().replace(/--\d+$/u, "")
    .replace(/^\d{4}-\d{2}-\d{2}-(?!\d{4}h?$)/u, "").replace(/^note-on-/u, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/u, "").replace(/-from-library$/u, "").replace(/(?<=[a-z])-\d{1,2}$/u, "");
}

/** 1 when a file name carries an import's mark (a trailing date, `-from-library`, a counter), so a cleanly named copy is preferred as home. */
function importMarked(path) {
  return /(?:-\d{4}-\d{2}-\d{2}|-from-library|(?<=[a-z])-\d{1,2})\.(?:md|markdown)$/iu.test(posix.basename(path)) ? 1 : 0;
}

/** File names that name a place in a tree rather than a document; namesakes under them are not copies. */
const GENERIC_STEMS = new Set(["readme", "index", "notes", "terms", "overview", "questions", "texts", "untitled", "draft", "agents"]);

/**
 * Plan the merge of living namesakes that say one thing.
 *
 * Documents filed under one name (`copyStem`) in different places, sharing at least `overlap`
 * of the smaller one's five-word shingles, are one document filed more than once. Its home is
 * the living copy that says the most, a glossary copy first (then the best-ranked, `rankMarkdownCopy`), so the least
 * material arrives as earlier; each other copy gives it the paragraphs only
 * that copy says (under "Earlier material"), its names as aliases and the frontmatter keys the
 * home lacks, and is retired. A copy that says more than four times what the home says is a
 * different, larger document and is left alone, as is a glossary copy whose namesake is not
 * one (a term is not retired into a note); generic names (`README`, `index`) are never grouped.
 */
export function planMarkdownNamesakeMerge({ documents, overlap = 0.8, minimumShingles = 20, paragraphContainment = 0.8, rank = rankMarkdownCopy } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  const byStem = new Map();
  for (const document of documents) {
    const stem = copyStem(document.path);
    if (GENERIC_STEMS.has(stem)) continue;
    byStem.set(stem, [...(byStem.get(stem) ?? []), document]);
  }
  const homes = new Map();
  const retarget = new Map();
  for (const group of byStem.values()) {
    if (group.length < 2) continue;
    const ranked = group.map((document) => ({ ...document, shingles: wordShingles(document.text) }))
      .filter(({ shingles }) => shingles.size >= minimumShingles)
      .sort((left, right) => compareRanks([...rank(left.path).slice(0, 2), importMarked(left.path), -left.shingles.size, ...rank(left.path)], [...rank(right.path).slice(0, 2), importMarked(right.path), -right.shingles.size, ...rank(right.path)]));
    const taken = new Set();
    for (const home of ranked) {
      if (taken.has(home.path)) continue;
      const entry = { home, retired: [], fresh: [] };
      for (const copy of ranked) {
        if (copy === home || taken.has(copy.path)) continue;
        let shared = 0;
        for (const shingle of copy.shingles) if (home.shingles.has(shingle)) shared += 1;
        if (shared / Math.min(copy.shingles.size, home.shingles.size) < overlap) continue;
        if (copy.shingles.size > 4 * home.shingles.size) continue;
        if (rank(copy.path)[1] < rank(home.path)[1]) continue;
        taken.add(copy.path);
        retarget.set(copy.path, home.path);
        entry.retired.push(copy);
        entry.fresh.push(...freshParagraphs(copy, home, paragraphContainment));
      }
      if (entry.retired.length > 0) { taken.add(home.path); homes.set(home.path, entry); }
    }
  }
  return Object.freeze({ type: "MarkdownNamesakeMergePlan", groups: mergeGroups(homes), retarget });
}

/**
 * Plan the retirement of superseded custody copies.
 *
 * A custody copy (a triage, archive, import, legacy or asset copy) whose file name a living
 * document also carries, and whose text that living document already holds — at least
 * `containment` of the copy's five-word shingles appear in it — is an earlier state of that
 * document and is retired to it, carrying its names as aliases. Copies that differ more are
 * left for merging; copies with no living namesake are left in custody.
 */
export function planMarkdownSupersededCopies({ documents, containment = 0.98, minimumShingles = 20, isCustody = isCustodyCopy } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  const byStem = new Map();
  for (const document of documents) {
    const stem = copyStem(document.path);
    const group = byStem.get(stem) ?? [];
    group.push(document);
    byStem.set(stem, group);
  }
  const homes = new Map();
  const retarget = new Map();
  for (const group of byStem.values()) {
    const living = group.filter(({ path }) => !isCustody(path)).map((document) => ({ ...document, shingles: wordShingles(document.text) }));
    if (living.length === 0) continue;
    for (const copy of group.filter(({ path }) => isCustody(path))) {
      const shingles = wordShingles(copy.text);
      if (shingles.size < minimumShingles) continue;
      let best = null;
      for (const home of living) {
        let shared = 0;
        for (const shingle of shingles) if (home.shingles.has(shingle)) shared += 1;
        const covered = shared / shingles.size;
        if (best === null || covered > best.covered || (covered === best.covered && compareRanks(rankMarkdownCopy(home.path), rankMarkdownCopy(best.home.path)) < 0)) best = { home, covered };
      }
      if (best.covered < containment) continue;
      retarget.set(copy.path, best.home.path);
      const entry = homes.get(best.home.path) ?? { home: best.home, retired: [] };
      entry.retired.push(copy);
      homes.set(best.home.path, entry);
    }
  }
  const groups = [...homes.values()].map(({ home, retired }) => {
    const carried = names(home.text);
    const aliases = new Set();
    for (const copy of retired) for (const name of names(copy.text)) if (!carried.has(name)) aliases.add(name);
    return Object.freeze({ home: home.path, retired: Object.freeze(retired.map(({ path }) => path).sort()), aliases: Object.freeze([...aliases].sort()), carried: Object.freeze(carriedFrontmatter(home, retired)) });
  }).sort((left, right) => left.home.localeCompare(right.home));
  return Object.freeze({ type: "MarkdownSupersededCopyPlan", groups: Object.freeze(groups), retarget });
}

/** Rewrite a moved paragraph's relative links so they reach the same targets from `to` as they did from `from`. */
function rebaseLinks(paragraph, from, to) {
  return paragraph.replace(/(\]\()([^)\s]+)(\))/gu, (whole, open, target, close) => {
    if (EXTERNAL_TARGET.test(target) || target.startsWith("#") || target.startsWith("/")) return whole;
    const hash = target.indexOf("#");
    const path = hash < 0 ? target : target.slice(0, hash);
    const fragment = hash < 0 ? "" : target.slice(hash);
    const absolute = posix.normalize(posix.join(posix.dirname(from), path));
    return `${open}${relativeLinkPath(to, absolute)}${fragment}${close}`;
  });
}

function bodyOf(text) {
  try {
    const fence = splitMarkdownFrontmatterFence(text);
    return fence?.body ?? text;
  } catch { return text; }
}

/**
 * Plan the merge of overlapping custody copies into their living namesakes.
 *
 * A custody copy whose file name a living document also carries, and that shares at least
 * `overlap` of its five-word shingles with it (but is not already held by it), is an earlier
 * state of that document with material of its own. Its paragraphs the living document does not
 * already hold (less than `paragraphContainment` of a paragraph's shingles found there) are
 * appended to the living document under an "Earlier material" heading, its names and
 * frontmatter are carried like a retired copy's, and it is retired. Nothing the copy said is
 * lost; the living document becomes the one place it is said.
 */
export function planMarkdownCopyMerge({ documents, overlap = 0.5, containment = 0.98, paragraphContainment = 0.8, minimumShingles = 20, isCustody = isCustodyCopy } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  const byStem = new Map();
  for (const document of documents) {
    const stem = copyStem(document.path);
    const group = byStem.get(stem) ?? [];
    group.push(document);
    byStem.set(stem, group);
  }
  const homes = new Map();
  const retarget = new Map();
  for (const group of byStem.values()) {
    const living = group.filter(({ path }) => !isCustody(path)).map((document) => ({ ...document, shingles: wordShingles(document.text) }));
    if (living.length === 0) continue;
    for (const copy of group.filter(({ path }) => isCustody(path))) {
      const shingles = wordShingles(copy.text);
      if (shingles.size < minimumShingles) continue;
      let best = null;
      for (const home of living) {
        let shared = 0;
        for (const shingle of shingles) if (home.shingles.has(shingle)) shared += 1;
        const covered = shared / shingles.size;
        if (best === null || covered > best.covered) best = { home, covered };
      }
      if (best.covered < overlap || best.covered >= containment) continue;
      retarget.set(copy.path, best.home.path);
      const entry = homes.get(best.home.path) ?? { home: best.home, retired: [], fresh: [] };
      entry.retired.push(copy);
      entry.fresh.push(...freshParagraphs(copy, best.home, paragraphContainment));
      homes.set(best.home.path, entry);
    }
  }
  return Object.freeze({ type: "MarkdownCopyMergePlan", groups: mergeGroups(homes), retarget });
}

/**
 * A retired copy's paragraphs its home does not already hold (less than `paragraphContainment`
 * of a paragraph's shingles found there), with links re-based to the home. Headings standing
 * alone, comments, rules, and frontmatter-shaped residue are not paragraphs of their own.
 */
function freshParagraphs(copy, home, paragraphContainment) {
  const homeShingles = home.shingles ?? wordShingles(home.text);
  return bodyOf(copy.text).split(/\n\s*\n/u).map((paragraph) => paragraph.trim()).filter((paragraph) => {
    if (paragraph === "" || /^#{1,6}\s/u.test(paragraph) && !paragraph.includes("\n")) return false;
    if (/^<!--[\s\S]*-->$/u.test(paragraph) || /^-{3,}$/u.test(paragraph)) return false;
    const lines = paragraph.split("\n").filter((line) => line.trim() !== "" && !/^-{3,}$/u.test(line.trim()));
    if (lines.length > 0 && lines.filter((line) => /^[A-Za-z_][\w-]*:(\s|$)|^\s+-\s|^\s+[\w-]+:\s/u.test(line)).length / lines.length >= 0.6) return false;
    const own = wordShingles(paragraph);
    if (own.size === 0) return !home.text.includes(paragraph);
    let held = 0;
    for (const shingle of own) if (homeShingles.has(shingle)) held += 1;
    return held / own.size < paragraphContainment;
  }).map((paragraph) => rebaseLinks(paragraph, copy.path, home.path));
}

/** Merge groups from homes and what their retired copies bring: names, frontmatter, paragraphs. */
function mergeGroups(homes) {
  return Object.freeze([...homes.values()].map(({ home, retired, fresh }) => {
    const carried = names(home.text);
    const aliases = new Set();
    for (const copy of retired) for (const name of names(copy.text)) if (!carried.has(name)) aliases.add(name);
    const unique = [...new Set(fresh)];
    return Object.freeze({
      home: home.path,
      retired: Object.freeze(retired.map(({ path }) => path).sort()),
      aliases: Object.freeze([...aliases].sort()),
      carried: Object.freeze(carriedFrontmatter(home, retired)),
      append: unique.length === 0 ? null : `## Earlier material\n\n${unique.join("\n\n")}\n`,
    });
  }).sort((left, right) => left.home.localeCompare(right.home)));
}

/**
 * Plan the merge a reader has decided on: `retired` documents say what `home` says, whatever
 * they are named. The home gains the paragraphs only a retired document says (under "Earlier
 * material"), their names as aliases, and the frontmatter keys they state that it lacks; every
 * link to a retired document is pointed at the home. Nothing is inferred about which documents
 * are copies: that is the caller's judgment, evidenced by `markdownShingleSignature` overlap or
 * by reading.
 */
export function planMarkdownDocumentMerge({ home, retired, paragraphContainment = 0.8 } = {}) {
  if (typeof home?.path !== "string" || typeof home.text !== "string") throw new TypeError("home must be a document {path, text}");
  if (!Array.isArray(retired) || retired.length === 0) throw new TypeError("retired must be a nonempty array of documents");
  const own = { ...home, shingles: wordShingles(home.text) };
  const copies = retired.filter((copy) => copy.path !== home.path);
  const entry = { home: own, retired: copies, fresh: copies.flatMap((copy) => freshParagraphs(copy, own, paragraphContainment)) };
  return Object.freeze({ type: "MarkdownDocumentMergePlan", groups: mergeGroups(new Map([[home.path, entry]])), retarget: new Map(copies.map(({ path }) => [path, home.path])) });
}

const ORG_ROAM_IDENTITY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Plan the merge of documents that carry one org-roam identity.
 *
 * An org-roam `id` names one note; documents that carry the same one are copies of that note,
 * filed more than once as it passed through exports and imports. The best-ranked copy
 * (`rankMarkdownCopy`) is its home. Every other copy is retired to it: the home gains the
 * paragraphs only that copy says (under "Earlier material"), its names as aliases, and the
 * frontmatter keys it states that the home lacks. A copy that shares less than `overlap` of the
 * smaller one's shingles with the home, or says more than four times what the home says, is not
 * that note but a different document wearing its identity (a concatenated export that kept its
 * first entry's `id`, say) and is left alone.
 * Identities that are not org-roam UUIDs are house identities, which name terms, and are not
 * grouped here.
 */
export function planMarkdownIdentityMerge({ documents, overlap = 0.3, minimumShingles = 20, paragraphContainment = 0.8, rank = rankMarkdownCopy } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  const byIdentity = new Map();
  for (const document of documents) {
    const id = frontmatterOf(document.text)?.id;
    if (typeof id !== "string" || !ORG_ROAM_IDENTITY.test(id.trim())) continue;
    const key = id.trim().toLowerCase();
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), document]);
  }
  const homes = new Map();
  const retarget = new Map();
  for (const copies of byIdentity.values()) {
    if (copies.length < 2) continue;
    const [home, ...retired] = [...copies].sort((left, right) => compareRanks(rank(left.path), rank(right.path)));
    const entry = { home: { ...home, shingles: wordShingles(home.text) }, retired, fresh: [] };
    for (const copy of retired) {
      const shingles = wordShingles(copy.text);
      const smaller = Math.min(shingles.size, entry.home.shingles.size);
      let shared = 0;
      for (const shingle of shingles) if (entry.home.shingles.has(shingle)) shared += 1;
      if (smaller >= minimumShingles && shared / smaller < overlap) continue;
      if (shingles.size > 4 * Math.max(entry.home.shingles.size, minimumShingles)) continue;
      retarget.set(copy.path, home.path);
      entry.fresh.push(...freshParagraphs(copy, entry.home, paragraphContainment));
    }
    entry.retired = retired.filter((copy) => retarget.has(copy.path));
    if (entry.retired.length > 0) homes.set(home.path, entry);
  }
  return Object.freeze({ type: "MarkdownIdentityMergePlan", groups: mergeGroups(homes), retarget });
}

/**
 * The link rewrites that point every resolved link to a retired document at its home instead.
 * Links written inside a retired document are not rewritten: the document is going.
 */
export function planMarkdownLinkRetarget({ graph, retarget } = {}) {
  if (!graph || !Array.isArray(graph.edges)) throw new TypeError("graph must carry an edges array");
  if (!(retarget instanceof Map)) throw new TypeError("retarget must be a Map of retired path to home path");
  const editsByFile = new Map();
  let rewrites = 0;
  for (const edge of graph.edges) {
    if (!REWRITABLE_KINDS.has(edge.kind) || edge.status !== "resolved" || !retarget.has(edge.targetPath)) continue;
    if (retarget.has(edge.sourcePath) || EXTERNAL_TARGET.test(edge.target)) continue;
    const hash = edge.target.indexOf("#");
    const fragment = hash < 0 ? "" : edge.target.slice(hash);
    const home = retarget.get(edge.targetPath);
    // A wikilink names its target; it keeps naming it, by the home's file name.
    const replacement = NAMED_KINDS.has(edge.kind) ? posix.basename(home).replace(/\.(?:md|markdown)$/iu, "") + fragment
      : home === edge.sourcePath ? (fragment || posix.basename(home)) : relativeLinkPath(edge.sourcePath, home) + fragment;
    if (replacement === edge.target) continue;
    const edits = editsByFile.get(edge.sourcePath) ?? new Map();
    edits.set(`${edge.target} ${replacement}`, { target: edge.target, replacement });
    editsByFile.set(edge.sourcePath, edits);
    rewrites += 1;
  }
  const files = [...editsByFile.entries()]
    .map(([filePath, edits]) => Object.freeze({ filePath, edits: Object.freeze([...edits.values()]) }))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
  return Object.freeze({ type: "MarkdownLinkRetargetPlan", files: Object.freeze(files), rewrites });
}

/**
 * Consolidate duplicate documents under root: retarget every link to a retired copy at its home,
 * give each home its retired copies' names as aliases, then remove the retired copies. `plan`
 * chooses what counts as a copy: identical bodies by default, or `planMarkdownSupersededCopies`. `admit`
 * decides which paths take part (a caller keeps code packages' docs out, for instance);
 * `read`, `write`, and `remove` are supplied at the kernel edge.
 */
export async function applyMarkdownDuplicateConsolidation({ root, region = "", limit, maxScan, admit = () => true, scan, read, write, remove, minimumLength, plan: planOf = (documents) => planMarkdownDuplicateConsolidation({ documents, minimumLength }) } = {}) {
  const before = await scan({ root, region, limit, maxScan });
  if (!before.complete) return Object.freeze({ type: "MarkdownDuplicateConsolidationRefusal", reason: "relation-universe-incomplete" });
  const documents = [];
  for (const { path } of before.documents) if (admit(path)) documents.push({ path, text: await read({ root, path }) });
  const plan = planOf(documents);
  const retargeted = planMarkdownLinkRetarget({ graph: before.graph, retarget: plan.retarget });
  const linkWrites = await applyMarkdownLinkEdits({ root, plan: retargeted, write });
  const textOf = new Map(documents.map(({ path, text }) => [path, text]));
  let aliased = 0;
  // A group's copies are retired only once its home holds what they carried.
  const settled = new Set();
  for (const group of plan.groups) {
    const carried = Object.entries(group.carried ?? {});
    if (group.aliases.length === 0 && carried.length === 0 && !group.append) { settled.add(group); continue; }
    let text = linkWrites.some(({ filePath }) => filePath === group.home) ? await read({ root, path: group.home }) : textOf.get(group.home);
    const current = frontmatterOf(text);
    if (current === null) { if (!group.append && carried.length === 0) settled.add(group); continue; }
    try {
      if (group.aliases.length > 0) {
        const held = Array.isArray(current.aliases) ? current.aliases : current.aliases ? [current.aliases] : [];
        text = mutateMarkdownFrontmatter(text, { mode: "set", key: "aliases", value: [...new Set([...held.filter((alias) => typeof alias === "string"), ...group.aliases])] });
      }
      for (const [key, value] of carried) text = mutateMarkdownFrontmatter(text, { mode: "set", key, value });
      if (group.append) text = `${text.replace(/\s*$/u, "")}\n\n${group.append}`;
      await write({ root, path: group.home, text, mode: "replace", normalization: "preserve" });
      aliased += 1;
      settled.add(group);
    } catch {
      // A home whose frontmatter the codec cannot rewrite keeps what it has. Copies that carried
      // nothing it lacks may still go; copies with material of their own stay until it can.
      if (!group.append && carried.length === 0) settled.add(group);
    }
  }
  for (const group of plan.groups) if (settled.has(group)) for (const path of group.retired) await remove({ root, path });
  return Object.freeze({
    type: "MarkdownDuplicateConsolidation",
    groups: plan.groups.length,
    retired: plan.groups.filter((group) => settled.has(group)).reduce((count, group) => count + group.retired.length, 0),
    kept: plan.groups.filter((group) => !settled.has(group)).reduce((count, group) => count + group.retired.length, 0),
    linksRetargeted: retargeted.rewrites,
    filesRelinked: linkWrites.length,
    homesEnriched: aliased,
  });
}
