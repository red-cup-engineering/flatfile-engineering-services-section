import { dirname, extname, join, relative } from "node:path";
import { mkdirSync, readFileSync, readdirSync, rmdirSync, renameSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DATA_CUSTODY_KINDS } from "./data-custody-directory.mjs";

const DATA_CUSTODY_KIND_SET = new Set(DATA_CUSTODY_KINDS);

/**
 * Top-level entry names/tokens that mark a journal or event-stream feed —
 * the house `logs/` lane (journals, event streams).
 * @type {ReadonlySet<string>}
 */
const LOG_NAME_TOKENS = new Set(["journal", "journals", "log", "logs", "event", "events", "arrival", "arrivals"]);

/**
 * Top-level entry names/tokens that mark a runtime tree, cache,
 * reservation, lock, task store, or content-addressed store — the house
 * `state/` lane.
 * @type {ReadonlySet<string>}
 */
const STATE_NAME_TOKENS = new Set([
  "runtime",
  "cache",
  "forge-cache",
  "forge-out",
  "tmp",
  "temp",
  "lock",
  "locks",
  "store",
  "credential",
  "credentials",
  "reservation",
  "reservations",
]);

/** @type {RegExp} */
const DATED_NAME_PATTERN = /\d{4}-\d{2}-\d{2}/;

/** @type {RegExp} */
const YEAR_TOKEN_PATTERN = /^\d{4}$/;

/** @type {RegExp} */
const TWO_DIGIT_TOKEN_PATTERN = /^\d{2}$/;

/**
 * JSON top-level field names that mark a dated receipt/snapshot — the
 * house `records/` lane.
 * @type {ReadonlySet<string>}
 */
const RECORD_JSON_FIELDS = new Set(["observed_at", "recordedAt"]);

/**
 * Directory names never descended into when scanning for writer
 * references to a `data/<entry>` path.
 * @type {ReadonlySet<string>}
 */
const REFERENCE_SCAN_EXCLUDED_DIRS = new Set(["data", "node_modules", ".git", "dist"]);

/**
 * File extensions scanned for a hard-coded `data/<entry>` path reference.
 * @type {ReadonlySet<string>}
 */
const REFERENCE_SCAN_EXTENSIONS = new Set([".mjs", ".mts", ".js", ".ts", ".json", ".sh", ".toml", ".scm", ".service", ".timer", ".md"]);

/** @type {number} */
const MAX_WRITER_REFERENCES = 50;

/**
 * @param {string} text
 * @returns {string} text with regex metacharacters escaped
 */
function escapeRegExpLiteral(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recurses under `dir`, appending relative paths of text matches to `found`.
 * @param {string} dir
 * @param {string} baseDir
 * @param {RegExp} pattern
 * @param {string[]} found
 * @returns {void}
 */
function scanForDataEntryReferences(dir, baseDir, pattern, found) {
  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const dirent of dirents) {
    if (found.length >= MAX_WRITER_REFERENCES) return;
    const fullPath = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (!REFERENCE_SCAN_EXCLUDED_DIRS.has(dirent.name)) {
        scanForDataEntryReferences(fullPath, baseDir, pattern, found);
      }
      continue;
    }
    if (!dirent.isFile() || !REFERENCE_SCAN_EXTENSIONS.has(extname(dirent.name).toLowerCase())) continue;
    let text;
    try {
      text = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    if (pattern.test(text)) {
      found.push(relative(baseDir, fullPath));
    }
  }
}

/**
 * Finds text-file references to `data/<entryName>` under a package root
 * (owner law: a writer hard-coding the path is the debt, not the mover).
 * @param {string} packageRoot
 * @param {string} entryName
 * @returns {readonly string[]} sorted relative paths, capped at 50
 */
function findDataEntryReferences(packageRoot, entryName) {
  const pattern = new RegExp(`data/${escapeRegExpLiteral(entryName)}(?![\\w.-])`);
  const found = [];
  scanForDataEntryReferences(packageRoot, packageRoot, pattern, found);
  return Object.freeze(found.sort().slice(0, MAX_WRITER_REFERENCES));
}

/**
 * @param {string} name
 * @returns {string[]}
 */
function tokenize(name) {
  return name.toLowerCase().split(/[-_.\s]+/).filter(Boolean);
}

/**
 * @param {string} name
 * @param {ReadonlySet<string>} tokenSet
 * @returns {string | null} the matched token, or null when none match
 */
function matchedToken(name, tokenSet) {
  const lower = name.toLowerCase();
  if (tokenSet.has(lower)) return lower;
  for (const token of tokenize(name)) {
    if (tokenSet.has(token)) return token;
  }
  return null;
}

/**
 * Detects a YYYY/MM/DD dated subtree, independent of the directory's name.
 * @param {string} fullPath
 * @returns {boolean}
 */
function hasDateShapedSubtree(fullPath) {
  let yearEntries;
  try {
    yearEntries = readdirSync(fullPath, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const yearEntry of yearEntries) {
    if (!yearEntry.isDirectory() || !YEAR_TOKEN_PATTERN.test(yearEntry.name)) continue;
    let monthEntries;
    try {
      monthEntries = readdirSync(join(fullPath, yearEntry.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const monthEntry of monthEntries) {
      if (!monthEntry.isDirectory() || !TWO_DIGIT_TOKEN_PATTERN.test(monthEntry.name)) continue;
      let dayEntries;
      try {
        dayEntries = readdirSync(join(fullPath, yearEntry.name, monthEntry.name), { withFileTypes: true });
      } catch {
        continue;
      }
      if (dayEntries.some((dayEntry) => dayEntry.isDirectory() && TWO_DIGIT_TOKEN_PATTERN.test(dayEntry.name))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {Readonly<{name: string, kind: "file"|"directory", classification: "logs"|"records"|"state", reason: string}>} fields
 * @returns {Readonly<{entry: string, kind: "file"|"directory", classification: "logs"|"records"|"state", reason: string, destination: string}>}
 */
function classifiedRow({ name, kind, classification, reason }) {
  return Object.freeze({
    entry: name,
    kind,
    classification,
    reason,
    destination: `data/${classification}/${name}`,
  });
}

/**
 * Classify one top-level offending `data/` entry into a lawful custody
 * lane (`logs`, `records`, `state`), `purge`, or an unclassified refusal
 * — pure and deterministic from the entry's own already-gathered shape,
 * so the rule is explainable and independently testable without
 * filesystem access.
 *
 * @param {Readonly<{
 *   name: string,
 *   kind: "file"|"directory",
 *   isEmpty?: boolean,
 *   isJsonlLike?: boolean,
 *   isSchemaLike?: boolean,
 *   hasDateInName?: boolean,
 *   hasDatedSubtree?: boolean,
 *   jsonTopLevelFields?: readonly string[] | null,
 * }>} entry
 * @returns {Readonly<{entry: string, kind: "file"|"directory", classification: "logs"|"records"|"state"|"purge", reason: string, destination: string}> | Readonly<{entry: string, reason: "unclassified"}>}
 */
export function classifyDataCustodyEntry(entry) {
  const { name, kind } = entry;

  if (entry.isJsonlLike) {
    return classifiedRow({ name, kind, classification: "logs", reason: `file extension ".jsonl" matches the journal/event-stream feed pattern` });
  }

  const logToken = matchedToken(name, LOG_NAME_TOKENS);
  if (logToken) {
    return classifiedRow({ name, kind, classification: "logs", reason: `name token "${logToken}" matches the journal/event-stream pattern` });
  }

  const stateToken = matchedToken(name, STATE_NAME_TOKENS);
  if (stateToken) {
    return classifiedRow({ name, kind, classification: "state", reason: `name token "${stateToken}" matches the runtime/cache/lock/store pattern` });
  }

  if (entry.isSchemaLike) {
    return classifiedRow({ name, kind, classification: "records", reason: `name "${name}" matches the schema-file records pattern` });
  }

  if (kind === "file") {
    if (entry.hasDateInName) {
      return classifiedRow({ name, kind, classification: "records", reason: `file name "${name}" carries a YYYY-MM-DD date, matching the dated-receipt pattern` });
    }
    if (Array.isArray(entry.jsonTopLevelFields)) {
      for (const field of entry.jsonTopLevelFields) {
        if (RECORD_JSON_FIELDS.has(field)) {
          return classifiedRow({ name, kind, classification: "records", reason: `JSON top-level field "${field}" matches the dated-receipt field pattern` });
        }
      }
    }
  }

  if (kind === "directory" && entry.hasDatedSubtree) {
    return classifiedRow({ name, kind, classification: "records", reason: `directory contains a YYYY/MM/DD dated subtree, matching the dated-receipt/attestation records pattern` });
  }

  if (kind === "directory" && entry.isEmpty) {
    return Object.freeze({
      entry: name,
      kind,
      classification: "purge",
      reason: "empty directory carries no content to migrate and matches no named lane",
      destination: null,
    });
  }

  return Object.freeze({ entry: name, reason: "unclassified" });
}

/**
 * @param {string} dataDir
 * @param {string} name
 * @returns {Readonly<{name: string, kind: "file"|"directory", isEmpty?: boolean, isJsonlLike?: boolean, isSchemaLike?: boolean, hasDateInName?: boolean, hasDatedSubtree?: boolean, jsonTopLevelFields?: readonly string[] | null}>}
 */
function describeEntry(dataDir, name) {
  const fullPath = join(dataDir, name);
  const stat = statSync(fullPath);
  const lower = name.toLowerCase();
  if (stat.isDirectory()) {
    const children = readdirSync(fullPath);
    return Object.freeze({
      name,
      kind: "directory",
      isEmpty: children.length === 0,
      isSchemaLike: lower === "schema" || lower.includes("schema"),
      hasDatedSubtree: hasDateShapedSubtree(fullPath),
    });
  }
  const ext = extname(name).toLowerCase();
  let jsonTopLevelFields = null;
  if (ext === ".json") {
    try {
      const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        jsonTopLevelFields = Object.keys(parsed);
      }
    } catch {
      jsonTopLevelFields = null;
    }
  }
  return Object.freeze({
    name,
    kind: "file",
    isJsonlLike: ext === ".jsonl",
    isSchemaLike: lower.includes("schema"),
    hasDateInName: DATED_NAME_PATTERN.test(name),
    jsonTopLevelFields,
  });
}

/**
 * Plan the migration of every offending top-level entry under a `data/`
 * directory into the lawful `logs`/`records`/`state` trio or `purge`;
 * refuses (never moves) any entry a writer still hard-codes by its old
 * `data/<entry>` path (owner law: fix the writer, never just relocate
 * the files around it). Changes nothing on disk.
 *
 * @param {string} dataDir - absolute path to a section's `data/` directory
 * @returns {Readonly<{dataDir: string, rows: readonly ReturnType<typeof classifyDataCustodyEntry>[], refusals: readonly (Readonly<{entry: string, reason: "unclassified"}> | Readonly<{entry: string, classification: string, reason: "referenced-by-writer", references: readonly string[]}>)[]}>}
 */
export function planDataCustodyMigration(dataDir) {
  let entries;
  try {
    entries = readdirSync(dataDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return Object.freeze({ dataDir, rows: Object.freeze([]), refusals: Object.freeze([]) });
    }
    throw error;
  }
  const packageRoot = dirname(dataDir);
  const offenders = entries.filter((name) => !DATA_CUSTODY_KIND_SET.has(name)).sort();
  const rows = [];
  const refusals = [];
  for (const name of offenders) {
    const described = describeEntry(dataDir, name);
    const classified = classifyDataCustodyEntry(described);
    if (classified.classification === undefined) {
      refusals.push(classified);
      continue;
    }
    const references = findDataEntryReferences(packageRoot, name);
    if (references.length > 0) {
      refusals.push(Object.freeze({
        entry: name,
        classification: classified.classification,
        reason: "referenced-by-writer",
        references,
      }));
      continue;
    }
    rows.push(classified);
  }
  return Object.freeze({ dataDir, rows: Object.freeze(rows), refusals: Object.freeze(refusals) });
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 * @returns {"tracked" | "ignored" | "untracked"}
 */
function gitPathStatus(repoRoot, absPath) {
  const rel = relative(repoRoot, absPath);
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "--", rel], { cwd: repoRoot, encoding: "utf8" });
  if (tracked.status === 0 && tracked.stdout.trim().length > 0) {
    return "tracked";
  }
  const ignored = spawnSync("git", ["check-ignore", "--quiet", "--", rel], { cwd: repoRoot });
  if (ignored.status === 0) {
    return "ignored";
  }
  return "untracked";
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function isGitRepo(repoRoot) {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() === "true";
}

/**
 * Apply one already-classified plan row: move a `logs`/`records`/`state`
 * entry to its destination (via `git mv` when git-tracked, plain rename
 * otherwise) or `rmdir` an empty directory marked `purge`.
 *
 * @param {string} dataDir - absolute path to the section's `data/` directory
 * @param {ReturnType<typeof classifyDataCustodyEntry>} row - a classified (non-refusal) plan row
 * @returns {Readonly<{entry: string, classification: string, method: "git-mv"|"fs-rename"|"rmdir", destination: string | null}>}
 * @throws {Error} when row is a refusal (has no classification)
 */
export function applyDataCustodyMigrationRow(dataDir, row) {
  if (row.classification === undefined) {
    throw new Error(`migrate-data-custody-directory: refusal row "${row.entry}" cannot be applied — it is unclassified`);
  }
  const sourcePath = join(dataDir, row.entry);

  if (row.classification === "purge") {
    rmdirSync(sourcePath);
    return Object.freeze({ entry: row.entry, classification: "purge", method: "rmdir", destination: null });
  }

  const destinationPath = join(dataDir, row.classification, row.entry);
  mkdirSync(join(dataDir, row.classification), { recursive: true });

  const repoRootResult = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: dataDir, encoding: "utf8" });
  const repoRoot = repoRootResult.status === 0 ? repoRootResult.stdout.trim() : null;

  let method = "fs-rename";
  if (repoRoot && isGitRepo(repoRoot) && gitPathStatus(repoRoot, sourcePath) === "tracked") {
    const mv = spawnSync("git", ["mv", "--", relative(repoRoot, sourcePath), relative(repoRoot, destinationPath)], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (mv.status !== 0) {
      throw new Error(`migrate-data-custody-directory: git mv failed for "${row.entry}": ${mv.stderr || mv.stdout}`);
    }
    method = "git-mv";
  } else {
    renameSync(sourcePath, destinationPath);
  }

  return Object.freeze({ entry: row.entry, classification: row.classification, method, destination: row.destination });
}

/**
 * Apply every classified row in a migration plan, in order.
 *
 * @param {string} dataDir - absolute path to the section's `data/` directory
 * @param {readonly ReturnType<typeof classifyDataCustodyEntry>[]} rows - classified (non-refusal) plan rows
 * @returns {readonly ReturnType<typeof applyDataCustodyMigrationRow>[]}
 */
export function applyDataCustodyMigrationPlan(dataDir, rows) {
  const applied = [];
  for (const row of rows) {
    applied.push(applyDataCustodyMigrationRow(dataDir, row));
  }
  return Object.freeze(applied);
}
