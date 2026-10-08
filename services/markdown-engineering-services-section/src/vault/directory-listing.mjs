import { basename, posix } from "node:path";

/** Repository-relative browse prefix, refusing absolute paths and root escapes. */
function normalizeBrowsePrefix(value) {
  if (typeof value !== "string") throw new TypeError("prefix must be a string");
  if (value === "") return "";
  const normalized = posix.normalize(value.replace(/^\.\//u, "")).replace(/\/$/u, "");
  if (normalized === "." || normalized === "") return "";
  if (posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new RangeError("browse prefix escapes root");
  }
  return normalized;
}

/**
 * Extend `run` for as long as every remaining path descends through one shared segment.
 * Stops at the first divergence, and at any level holding a document, so a collapsed run
 * always ends where a real choice begins.
 */
function collapseSingleChildRun(run, remainders) {
  const segments = [...run];
  let current = remainders;
  for (;;) {
    if (current.length === 0) return segments;
    let shared = null;
    for (const remainder of current) {
      const slash = remainder.indexOf("/");
      if (slash < 0) return segments;
      const segment = remainder.slice(0, slash);
      if (shared === null) shared = segment;
      else if (shared !== segment) return segments;
    }
    segments.push(shared);
    current = current.map((remainder) => remainder.slice(shared.length + 1));
  }
}


export function browseDocuments(paths, vaultRoot, prefix = "", options = {}) {
  const admittedVaultRoot = normalizeBrowsePrefix(vaultRoot);
  function browse(prefix = "", { limit = 300, compress = true } = {}) {
    if (typeof prefix !== "string") throw new TypeError("prefix must be a string");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) throw new TypeError("invalid browse limit");
    const requested = prefix === "" ? admittedVaultRoot : normalizeBrowsePrefix(prefix);
    if (admittedVaultRoot && requested !== admittedVaultRoot && !requested.startsWith(`${admittedVaultRoot}/`)) {
      throw new RangeError("browse prefix escapes the vault root");
    }
    // Bucket every admitted path by its first segment below `requested`. Files list directly;
    // directories keep their remainders so a single-child run can be collapsed into one item.
    const directories = new Map();
    const files = [];
    const start = requested ? `${requested}/` : "";
    for (const path of paths) {
      if (start && !path.startsWith(start)) continue;
      const remainder = start ? path.slice(start.length) : path;
      const slash = remainder.indexOf("/");
      if (slash < 0) {
        files.push({ kind: "document", path, name: basename(path) });
        continue;
      }
      const name = remainder.slice(0, slash);
      const bucket = directories.get(name);
      if (bucket) bucket.push(remainder.slice(slash + 1));
      else directories.set(name, [remainder.slice(slash + 1)]);
    }
    const items = [
      ...[...directories.entries()]
        .map(([name, remainders]) => {
          // A directory holding exactly one child, whose child holds exactly one child, and so on,
          // costs a click per level while carrying no choice. Collapse the run into a single item.
          // The proof path is preserved verbatim in `path`; only the number of clicks changes.
          const run = compress ? collapseSingleChildRun([name], remainders) : [name];
          const directoryPath = requested ? `${requested}/${run.join("/")}` : run.join("/");
          return {
            kind: "directory",
            path: directoryPath,
            name: run.join("/"),
            segments: run.length,
            count: remainders.length,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name)),
      ...files.sort((left, right) => left.name.localeCompare(right.name)),
    ];
    return Object.freeze({
      type: "CairnDirectoryListing",
      prefix: requested,
      vaultRoot: admittedVaultRoot,
      total: items.length,
      truncated: items.length > limit,
      items: Object.freeze(items.slice(0, limit).map((item) => Object.freeze(item))),
    });
  }

  return browse(prefix, options);
}
