/** The one owner of where a journal store lives and how it is laid out.
 *
 *  A settlement's store is its log tier, `data/logs`, derived from the log tier's
 *  `pathSegment` in the artifact tier table (eavt-services-section `statement`),
 *  never restated. Inside it every directory is `<kind>-logs`: each feed kind's
 *  dated segments (`arrival-logs/2026-10-10-admit-arrival.jsonl.witnesses`), the
 *  content-addressed objects (`journal-object-logs`) and the oversized source
 *  packets (`journal-packet-logs`). What the store derives from its logs to admit
 *  and read them (the located admission facts, segment verification and stream
 *  heads) is not a log: it is the logs' state, `data/state/log-state`, beside the
 *  logs it is about. Readers and writers ask this module for these directories
 *  rather than joining their names themselves. */
import fs from "node:fs";
import path from "node:path";

import { artifactTier } from "@red-cup-engineering/eavt-services-section/statement";
import { dataArtifactAddress, dataKindDirectoryName } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

/** The log tier's POSIX path segment under a settlement root — the store. */
export const journalSegment = artifactTier("log").pathSegment;

/** The store's own areas inside it, by role: each a `<kind>-logs` directory beside the feed kinds. */
export const STORE_AREAS = Object.freeze({
  objects: dataKindDirectoryName("log", "journal-object"),
  packets: dataKindDirectoryName("log", "journal-packet"),
});

/** The directory the store's state is kept in, `log-state`: the state of the logs. */
export const LOG_STATE = dataKindDirectoryName("state", "log");

/** The area the store kept its state in before that state was filed in the state tier. */
export const SUPERSEDED_INDEX_AREA = dataKindDirectoryName("log", "journal-index");
const storeAreaNames = new Set(Object.values(STORE_AREAS));

/** Whether a directory name inside a store is one of the store's own areas rather than a feed kind. */
export const isStoreArea = (name) => storeAreaNames.has(name);

/** The host-native `<sep>data<sep>logs<sep>` marker used to locate the
 *  journal store inside an absolute path. */
const journalMarker = `${path.sep}${journalSegment.split("/").join(path.sep)}${path.sep}`;

/** The segment the store was kept under before it was filed by kind. A path
 *  bearing it is a store that was never converted, not a standalone journal,
 *  and must never resolve silently (see below). */
const supersededMarker = `${path.sep}data${path.sep}journals${path.sep}`;

/** The store directory for a journal addressed outside any settlement. */
const standaloneDirectory = ".metroplat-journal";

function markerIndex(absolute) {
  return absolute.indexOf(journalMarker);
}

/** Refuse a journal path under the superseded `data/journals` segment.
 *
 *  Such a path is a store that was never converted to kind directories, or a
 *  caller that outlived the conversion. Resolving it as a standalone journal
 *  would silently open an empty `.metroplat-journal` beside a real corpus and
 *  admit new statements into it — a quiet split-brain that reads as an empty
 *  journal rather than as an error. Only an address bearing neither segment is
 *  genuinely standalone. */
function refuseSupersededSegment(absolute, logPath) {
  if (!absolute.includes(supersededMarker)) return;
  throw new TypeError(
    `journal path lies under the superseded "data/journals" segment: ${logPath}\n`
    + `The journal is now filed by kind under "${journalSegment}". Convert the store with `
    + "semiotic-eavt-services-section scripts/file-journal-store-by-kind.mjs <settlement root>, or update the caller to address it.\n"
    + "Refusing to resolve this as a standalone journal, which would silently admit statements into an empty store.",
  );
}

/** Resolve the artifact store root enclosing `logPath` — the `data/logs`
 *  directory itself when the path lies inside a settlement, else a
 *  `.metroplat-journal` store beside it for a standalone journal. */
export function artifactStoreRoot(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at >= 0) return absolute.slice(0, at + journalMarker.length - 1);
  refuseSupersededSegment(absolute, logPath);
  return path.join(path.dirname(absolute), standaloneDirectory);
}

/** The directory to walk when collecting every received witness reachable from
 *  `logPath`: the whole store for a settled journal, else the standalone
 *  journal's own directory. */
export function receivedSearchRoot(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at >= 0) return absolute.slice(0, at + journalMarker.length - 1);
  refuseSupersededSegment(absolute, logPath);
  return path.dirname(absolute);
}

/** The settlement root enclosing `logPath` — the directory that *contains* the
 *  journal segment, i.e. one level above {@link artifactStoreRoot}. */
export function settlementRootOf(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at < 0) {
    refuseSupersededSegment(absolute, logPath);
    return undefined;
  }
  return absolute.slice(0, at);
}

/** The settlement root of a store directory, or undefined for a standalone store. */
export function settlementRootOfStore(storeRoot) {
  const parts = path.resolve(storeRoot).split(path.sep);
  const segments = journalSegment.split("/");
  const tail = parts.slice(parts.length - segments.length);
  return tail.join("/") === journalSegment ? parts.slice(0, parts.length - segments.length).join(path.sep) || path.sep : undefined;
}

/** Whether a directory is a journal store: a settlement's `data/logs` or a standalone `.metroplat-journal`. */
export function isJournalStoreDirectory(directory) {
  return path.basename(directory) === standaloneDirectory || settlementRootOfStore(directory) !== undefined;
}

/** The journal store directory a settlement root would hold. */
export function journalDirectoryOf(dataRoot) {
  return path.resolve(dataRoot, ...journalSegment.split("/"));
}

/** The store's state (causal admission, segment verification, field and head readings): the logs'
 *  state in the state tier of the settlement that physically holds the logs, `<settlement>/data/state/
 *  log-state`. A store linked from elsewhere keeps its state where its logs are; a standalone store keeps
 *  it inside itself. */
export function journalIndexDirectory(storeRoot) {
  let physical = path.resolve(storeRoot);
  try { physical = fs.realpathSync.native(physical); } catch { /* A store not yet made is where its path says. */ }
  const settlement = settlementRootOfStore(physical);
  return settlement === undefined
    ? path.join(physical, LOG_STATE)
    : path.join(settlement, ...artifactTier("state").pathSegment.split("/"), LOG_STATE);
}

/** The store's content-addressed objects. */
export function journalObjectDirectory(storeRoot) {
  return path.join(storeRoot, STORE_AREAS.objects);
}

/** The store's immutable oversized source packets, addressed by their SHA-256. */
export function journalPacketDirectory(storeRoot) {
  return path.join(storeRoot, STORE_AREAS.packets);
}

/** The handle of a feed that has no date, `<store>/<kind>-logs/<kind>.jsonl`. */
export function undatedJournalFeed(dataRoot, kind) {
  return path.join(journalDirectoryOf(dataRoot), dataKindDirectoryName("log", kind), `${kind}.jsonl`);
}

/** The handle of one kind's feed on the date `at` names, `<store>/<kind>-logs/<date>-admit-<kind>.jsonl`:
 *  every writer and reader of a feed takes its address from here. */
export function journalFeedPath(dataRoot, kind, at) {
  return dataArtifactAddress({ root: dataRoot, tier: "log", encoding: "jsonl", at, action: kind, subject: kind }).path;
}
