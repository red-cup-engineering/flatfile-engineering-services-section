// flatfile — the base byte primitives for the flat (text) branch, standalone: a whole-file atomic
// text write, a UTF-8 whole-file text read, a binarity sniff, and a plain (uncharged) classifier
// for the file -> regular-file -> flatfile spine. A flatfile is a NUL-free regular file (text);
// these are the byte-touch a deeper codec (json/jsonl/eavt, text/markdown, ...) composes.
//
// Ported (moved, adapted to stand alone) from @red-cup-engineering/computer's
// posix-holography/src/flatfile.mjs, posix-holography/src/read-text.mjs, and
// posix-holography/src/sniff.mjs (source directory:
// computer-operating-system-services-section/services/561-group-computer/posix-holography/).
//
// EXCLUDED, deliberately, and why:
//   - Upstream flatfile.mjs's readFile(path) = stat(path) and readRegularFile/readFlatfile's
//     `articulate([token, claim])` composition (@lenticule-science/metrologic/bilattice) lift the
//     path into a CHARGED Scott category (the file object as a presheaf of presence-charged
//     attribute cells) before restricting it. That charged/holographic reading is stat.mjs's own
//     law -- a sibling row of this decomposition, not touched or duplicated here (owner
//     instruction: the charged reading belongs with the stat/observation row).
//   - What upstream's spine reading is FOR -- confirming a path names a regular file before ever
//     sniffing or decoding it, so `file -> regular-file -> flatfile` composes in order -- is not
//     itself charged machinery, so it survives here as `classifyFlatfile`, using a plain
//     `node:fs.statSync` regular-file check in place of the charged `stat()` this package does not
//     import. `classifyFlatfile`'s result is the plain classification value the schema in this
//     section's data/records describes; nothing about a Scott category or bilattice charge is
//     represented in it.
// Nothing else upstream's three modules do is dropped: the atomic whole-file write (OP1 fsync /
// OP2 rename), the UTF-8 whole-file text read, and the binarity sniff are ported in full.
import { readFileSync, writeFileSync, mkdirSync, openSync, readSync, fsyncSync, closeSync, renameSync, unlinkSync, linkSync, statSync, constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, basename, join, resolve } from "node:path";

// Whole-file publication uses one prepared inode. Hard-link publication never replaces a winner.
function syncDirectory(path) {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function ensureFlatfileDirectory(path, { mode = 0o777 } = {}) {
  const first = mkdirSync(path, { recursive: true, mode });
  if (first !== undefined) {
    for (let directory = path; ; directory = dirname(directory)) {
      syncDirectory(directory);
      if (resolve(directory) === resolve(first)) break;
    }
    syncDirectory(dirname(first));
  }
  return path;
}

function publishFlatfile(path, content, {
  ifExists = "replace", mode = 0o666, directoryMode = 0o777,
  createDirectories = true, conflictMessage = "flatfile already exists with different bytes",
} = {}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("writeFlatfile: path must be a nonempty string");
  if (typeof content !== "string") throw new TypeError("writeFlatfile: content must be a string");
  if (!["replace", "preserve", "same"].includes(ifExists)) throw new TypeError("invalid flatfile ifExists policy");
  const dir = dirname(path), bytes = Buffer.from(content, "utf8");
  if (createDirectories) ensureFlatfileDirectory(dir, { mode: directoryMode });
  const temporary = join(dir, "." + basename(path) + "." + process.pid + "." + randomUUID() + ".tmp");
  let owned = false, failure;
  try {
    const fd = openSync(temporary, "wx", mode);
    owned = true;
    try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    if (ifExists === "replace") renameSync(temporary, path);
    else {
      try { linkSync(temporary, path); }
      catch (error) {
        if (error?.code !== "EEXIST") throw error;
        if (ifExists === "same" && !readFileSync(path).equals(bytes)) throw new TypeError(conflictMessage);
        return false;
      }
    }
    return true;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (owned) {
      try {
        try { unlinkSync(temporary); } catch (error) { if (error?.code !== "ENOENT") throw error; }
        syncDirectory(dir);
      } catch (error) { if (!failure) throw error; }
    }
  }
}

/** Replace by default; ifExists: "same" admits identical immutable bytes or throws conflictMessage. */
export function writeFlatfile(path, content, options) {
  publishFlatfile(path, content, options);
  return path;
}

/** Atomically create a complete file, returning false when another file already occupies the path. */
export function createFlatfile(path, content, options) {
  return publishFlatfile(path, content, { ...options, ifExists: "preserve" });
}

// === UTF-8 whole-file text read ================================================================
//
// readFlatfileText(path) -- read a file's bytes as a UTF-8 string. The lowest byte-touch: no
// kernel lift, no classification, just the decoded text. A consumer that needs the raw text of a
// flatfile (to regex its frontmatter, parse its JSON, ...) gets it here rather than reaching for
// node:fs itself. The richer readings that lift the text into a kernel category compose this;
// this is the plain string they wrap.
export function readFlatfileText(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("readFlatfileText: path must be a nonempty string");
  return readFileSync(path, "utf8");
}

// === binarity sniff =============================================================================
//
// sniffFileBinarity(path) -- sniff a regular file's leading bytes for binarity (does the head
// block carry a NUL?). The byte-level sub-reading the regular-file classification uses to derive
// its binarity claim. Returns "flat" | "binary".
export function sniffFileBinarity(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("sniffFileBinarity: path must be a nonempty string");
  const fd = openSync(path, "r");
  try {
    const b = Buffer.alloc(8192);
    const n = readSync(fd, b, 0, b.length, 0);
    for (let i = 0; i < n; i++) if (b[i] === 0) return "binary";
    return "flat";
  } finally {
    closeSync(fd);
  }
}

// === the file -> regular-file -> flatfile spine, plain (uncharged) ============================
//
// classifyFlatfile(path) -- classify a path along the spine a flatfile stands at the end of:
//   1. file      -- does the path exist at all, and what POSIX type does it name?
//   2. regular-file -- is it specifically a regular file (not a directory, symlink, etc.)?
//   3. flatfile  -- for a regular file only, is its head block NUL-free ("flat") or does it carry
//      a NUL ("binary")?
// This is a PLAIN classification value -- an ordinary JSON object -- never the charged Scott
// category upstream's stat.mjs-composed readings return; that charged/holographic reading is the
// stat/observation row's law, not duplicated here. `kind` is "flatfile" exactly when the path is a
// regular file whose sniffed binarity is "flat" -- the schema in this section's data/records
// describes exactly this result shape.
export function classifyFlatfile(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("classifyFlatfile: path must be a nonempty string");
  const stats = statSync(path);
  const isRegularFile = stats.isFile();
  const binarity = isRegularFile ? sniffFileBinarity(path) : null;
  const kind = isRegularFile ? (binarity === "flat" ? "flatfile" : "binary-file") : null;
  return Object.freeze({ path, isRegularFile, binarity, kind });
}
