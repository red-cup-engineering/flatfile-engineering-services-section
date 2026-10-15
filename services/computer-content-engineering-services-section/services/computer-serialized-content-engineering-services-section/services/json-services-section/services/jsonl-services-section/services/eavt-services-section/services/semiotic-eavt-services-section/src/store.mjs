/** The store: records, logs and heads found by address. See content/text/documents/specifications/store.md. */
export {
  put, get, has, each, walk, append, readLog, logDates, readHead, writeHead, extend, heads, referenceOf, withFileLock,
} from "./store-core.mjs";
export { pull, directoryRemote } from "./exchange.mjs";
export {
  HeadConflict, LegacyStoreRefused, LOG_LINE_BYTES_MAX, RECORD_BYTES_MAX, StoreCorruption, StoreError, threadName,
} from "./layout.mjs";

// withFileLock is the existing synchronous store publication primitive. Callers
// supply a canonical lock filename and a non-reentrant synchronous callback;
// returning a Promise is unsupported. It waits 15 seconds and reclaims locks
// older than 30 seconds. Stale reclamation is not fencing against a paused
// writer resuming later; short callbacks must finish publication before return.
