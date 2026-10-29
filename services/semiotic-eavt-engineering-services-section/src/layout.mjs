/**
 * Where the store's files are: the paths of store.md section 4, computed and never looked up.
 *
 *   data/records/<type>-records/<ni-path-v1 bucket of the address>
 *   data/state/<object>-state/<name>.json
 *   data/logs/<type>-logs/<date>.jsonl
 *
 * The directory names come from eavt-services-section (`dataKindDirectoryName`, the tier table) and
 * the bucket from the content address section (`niBucketPath`); this module reproduces neither.
 */
import { statSync } from "node:fs";
import { join } from "node:path";
import { dataKindDirectoryName, dataTierPathSegment } from "@red-cup-engineering/eavt-services-section/data-artifact-address";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { isSeavtCalendarDate, isAbsoluteSeavtClock } from "./clock.mjs";

export const RECORD_BYTES_MAX = 65_536;
export const LOG_LINE_BYTES_MAX = 4_096;
/** A SEAVT row line (a row's coordinates are data, not a few fields): larger rows are records, named by address. */
export const SEAVT_ROW_BYTES_MAX = 1_048_576;
export const NI_PATH_VERSION = "ni-path-v1";
export const LEGACY_STORE_PATHS = Object.freeze(["data/state/log-state", "data/journals"]);

/** A refusal of the store; `code` names which. */
export class StoreError extends Error {
  constructor(code, message) { super(message); this.name = new.target.name; this.code = code; }
}
export class StoreCorruption extends StoreError { constructor(message) { super("store-corruption", message); } }
export class HeadConflict extends StoreError { constructor(message) { super("head-conflict", message); } }
export class LegacyStoreRefused extends StoreError { constructor(message) { super("legacy-store", message); } }

const TYPE_NAME = /^[a-z]+(?:-[a-z]+)*$/u;

/** A type (or the object of a head): plain lowercase words joined by hyphens, each at most 24
 *  characters and the whole at most 64. Anything else is refused (ST-13). */
export function checkTypeName(type) {
  const ok = typeof type === "string" && type.length <= 64 && TYPE_NAME.test(type) && type.split("-").every((word) => word.length <= 24);
  if (!ok) throw new StoreError("type-name", `not a plain lowercase hyphenated type name of at most 64 characters: ${JSON.stringify(type)}`);
  return type;
}

export function checkDate(date) {
  if (!isSeavtCalendarDate(date))
    throw new StoreError("log-date", "not a calendar date: " + JSON.stringify(date));
  return date;
}

/** Whether a root holds the earlier layout at `legacy`. The layout is a directory (state, or a journal store): a file of that name is a note or a stray, not a store, and a dangling link holds nothing. */
const holdsDirectory = (root, legacy) => {
  try { return statSync(join(root, legacy)).isDirectory(); } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return false; throw error; }
};

/** ST-17: a root that still holds the earlier layout is refused, naming the conversion. */
export function checkRoot(root) {
  if (typeof root !== "string" || root.length === 0) throw new StoreError("root", "the settlement root must be a path");
  for (const legacy of LEGACY_STORE_PATHS) {
    if (holdsDirectory(root, legacy)) throw new LegacyStoreRefused(`${root} holds ${legacy}, the earlier store layout; convert it first (store-conversion.md)`);
  }
  return root;
}

export const recordsDirectory = (root, type) => join(root, dataTierPathSegment("record"), dataKindDirectoryName("record", checkTypeName(type)));
export const stateDirectory = (root, object) => join(root, dataTierPathSegment("state"), dataKindDirectoryName("state", checkTypeName(object)));
export const logsDirectory = (root, type) => join(root, dataTierPathSegment("log"), dataKindDirectoryName("log", checkTypeName(type)));

/** The one bucket file that holds an address's line (ST-1). */
export function recordFile(root, type, address) {
  if (!isNiUri(address)) throw new StoreError("address", `not a canonical sha-256 NI address: ${String(address)}`);
  return join(recordsDirectory(root, type), niBucketPath(address, NI_PATH_VERSION));
}

export const logFile = (root, type, date) => join(logsDirectory(root, type), `${checkDate(date)}.jsonl`);

/** A thread's name as a file name: `/`, `\`, `#`, `%` and control characters percent-encoded. */
export function encodeHeadName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 200) throw new StoreError("head-name", "a head name is 1 to 200 characters");
  const encoded = name.replace(/[/\\#%\u0000-\u001f]/gu, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
  return encoded.startsWith(".") ? `%2E${encoded.slice(1)}` : encoded;
}
export const decodeHeadName = (stem) => decodeURIComponent(stem);

export const headFile = (root, object, name) => join(stateDirectory(root, object), `${encodeHeadName(name)}.json`);

/** The name a thread known by an address is given: the address's 43-character digest. */
export function threadName(address) {
  if (!isNiUri(address)) throw new StoreError("address", `not a canonical sha-256 NI address: ${String(address)}`);
  return address.slice(address.lastIndexOf(";") + 1);
}
