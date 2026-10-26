/**
 * The one reader of where a data root keeps its artifacts. A tier files each kind in its own
 * directory (`data/logs/arrival-logs/`, `data/records/land-owner-records/`), and each artifact's
 * stem begins with its date (`2026-10-10.jsonl`), so the artifacts of one kind are
 * one listing and the artifacts of one date are found by stem. Every reader of a tier lists it
 * here rather than walking directories itself.
 *
 * A directory's listing is held while its modification and change times are unchanged, so a
 * process that lists the same tier repeatedly reads each kind directory once per change.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { dataArtifactStemOf, dataKindDirectory, dataKindOfDirectoryName, dataTierPathSegment, parseArtifactStem } from "./data-artifact-address.mjs";

const listings = new Map();

function heldListing(directory) {
  let stat;
  try {
    stat = statSync(directory);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error?.code)) { listings.delete(directory); return []; }
    throw error;
  }
  const held = listings.get(directory);
  if (held?.mtimeMs === stat.mtimeMs && held.ctimeMs === stat.ctimeMs) return held.entries;
  const entries = Object.freeze(readdirSync(directory, { withFileTypes: true })
    .map((entry) => Object.freeze({ name: entry.name, directory: entry.isDirectory(), file: entry.isFile() }))
    .sort((left, right) => left.name.localeCompare(right.name)));
  listings.set(directory, { mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, entries });
  return entries;
}

/** The directory one tier keeps under a data root. */
export function dataTierDirectoryOf(root, tier) {
  return path.join(root, ...dataTierPathSegment(tier).split("/"));
}

/** The kinds one tier holds under a data root, as `{ subject, directory }`, in subject order. */
export function dataKinds(root, tier) {
  const tierDirectory = dataTierDirectoryOf(root, tier);
  const kinds = [];
  for (const entry of heldListing(tierDirectory)) {
    if (!entry.directory) continue;
    const subject = dataKindOfDirectoryName(tier, entry.name);
    if (subject !== null) kinds.push(Object.freeze({ subject, directory: path.join(tierDirectory, entry.name) }));
  }
  return Object.freeze(kinds);
}

/**
 * The artifact files one tier holds under a data root, as
 * `{ path, directory, filename, subject, stem, date }` (date only for a
 * day-named stem), in kind then filename order. `subject` lists that one kind's directory;
 * `date` keeps one date's artifacts and `through` those on or before a date; `match(filename)`
 * keeps the files a reader asks for (a suffix, an encoding).
 */
export function dataArtifactFiles(root, tier, { subject, date, through, match } = {}) {
  const kinds = subject === undefined
    ? dataKinds(root, tier)
    : [Object.freeze({ subject: dataKindOfDirectoryName(tier, path.basename(dataKindDirectory(root, tier, subject))), directory: dataKindDirectory(root, tier, subject) })];
  const files = [];
  for (const kind of kinds) {
    for (const entry of heldListing(kind.directory)) {
      if (!entry.file || (match !== undefined && !match(entry.name))) continue;
      const stem = dataArtifactStemOf(entry.name);
      const parsed = parseArtifactStem(stem);
      if (date !== undefined && parsed?.date !== date) continue;
      if (through !== undefined && (parsed === null || parsed.date > through)) continue;
      files.push(Object.freeze({ path: path.join(kind.directory, entry.name), directory: kind.directory, filename: entry.name,
        subject: kind.subject, stem, ...(parsed === null ? {} : parsed) }));
    }
  }
  return Object.freeze(files);
}

/** The dates one tier holds artifacts for under a data root (one kind's, given `subject`), in order. */
export function dataArtifactDates(root, tier, options = {}) {
  return Object.freeze([...new Set(dataArtifactFiles(root, tier, options).map((file) => file.date).filter(Boolean))].sort());
}

/** Forget every held listing (tests, and a process that moved a store). */
export function clearDataArtifactListings() {
  listings.clear();
}
