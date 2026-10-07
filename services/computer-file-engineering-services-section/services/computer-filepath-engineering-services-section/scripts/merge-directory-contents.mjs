import { link, lstat, mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

/** @typedef {{relativePath: string, kind: "directory"|"file"|"symlink"|"other"}} DirectoryTreeEntry */
/** @typedef {{type: "DirectoryTreeInventory", root: string, entries: readonly DirectoryTreeEntry[]}} DirectoryTreeInventory */
/** @typedef {{type: "DirectoryContentsMergePlan", source: string, destination: string, sourceInventory: DirectoryTreeInventory, destinationInventory: DirectoryTreeInventory, directories: readonly string[], files: readonly string[]}} DirectoryContentsMergePlan */
/** @typedef {{type: "DirectoryContentsMergeRefusal", reason: string, source: string, destination: string, sourceInventory?: DirectoryTreeInventory, destinationInventory?: DirectoryTreeInventory, collisions?: readonly DirectoryTreeEntry[]}} DirectoryContentsMergeRefusal */
/** @typedef {{type: "DirectoryContentsMergeResult", plan: DirectoryContentsMergePlan, writes: readonly object[], verification: {complete: boolean, sourceRemoved: boolean, missingTargets: readonly string[]}} DirectoryContentsMergeResult */
/** @typedef {{type: "DirectoryContentsMergePartialFailure", reason: string, plan: DirectoryContentsMergePlan, writes: readonly object[], error?: string, verification?: {complete: boolean, sourceRemoved: boolean, missingTargets: readonly string[]}} DirectoryContentsMergePartialFailure */

function kindOf(stat) {
  if (stat.isDirectory()) return "directory";
  if (stat.isFile()) return "file";
  if (stat.isSymbolicLink()) return "symlink";
  return "other";
}

async function inventory(root) {
  const entries = [];
  async function visit(directory, prefix = "") {
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = prefix === "" ? child.name : `${prefix}/${child.name}`;
      const fullPath = resolve(directory, child.name);
      const kind = kindOf(await lstat(fullPath));
      entries.push(Object.freeze({ relativePath, kind }));
      if (kind === "directory") await visit(fullPath, relativePath);
    }
  }
  await visit(root);
  return Object.freeze({ type: "DirectoryTreeInventory", root, entries: Object.freeze(entries) });
}

function isNested(path, root) {
  const between = relative(root, path);
  return between === "" || (!between.startsWith(`..${sep}`) && between !== "..");
}

function refusal(reason, source, destination, details = {}) {
  return Object.freeze({ type: "DirectoryContentsMergeRefusal", reason, source, destination, ...details });
}

async function existingDirectory(path) {
  const stat = await lstat(path).catch(() => null);
  return stat?.isDirectory() ? stat : null;
}

/**
 * Survey a conflict-free contents merge. It never overwrites an existing path
 * and rejects source symlinks or special entries before any write is admitted.
 *
 * @param {{source: string, destination: string}} options
 * @returns {Promise<DirectoryContentsMergePlan|DirectoryContentsMergeRefusal>}
 */
export async function planDirectoryContentsMerge({ source, destination } = {}) {
  if (typeof source !== "string" || source === "") throw new TypeError("source is required");
  if (typeof destination !== "string" || destination === "") throw new TypeError("destination is required");
  const absoluteSource = resolve(source);
  const absoluteDestination = resolve(destination);
  if (absoluteSource === absoluteDestination || isNested(absoluteSource, absoluteDestination) || isNested(absoluteDestination, absoluteSource)) {
    return refusal("overlapping-roots", absoluteSource, absoluteDestination);
  }
  const sourceStat = await existingDirectory(absoluteSource);
  const destinationStat = await existingDirectory(absoluteDestination);
  if (!sourceStat) return refusal("source-is-not-directory", absoluteSource, absoluteDestination);
  if (!destinationStat) return refusal("destination-is-not-directory", absoluteSource, absoluteDestination);
  if (sourceStat.dev !== destinationStat.dev) return refusal("different-filesystems", absoluteSource, absoluteDestination);

  const sourceInventory = await inventory(absoluteSource);
  const destinationInventory = await inventory(absoluteDestination);
  const unsafeSource = sourceInventory.entries.filter((entry) => entry.kind === "symlink" || entry.kind === "other");
  if (unsafeSource.length > 0) {
    return refusal("source-has-unsafe-entry", absoluteSource, absoluteDestination, { sourceInventory, destinationInventory, collisions: Object.freeze(unsafeSource) });
  }

  const destinationEntries = new Map(destinationInventory.entries.map((entry) => [entry.relativePath, entry]));
  const collisions = sourceInventory.entries.filter((entry) => {
    const existing = destinationEntries.get(entry.relativePath);
    return existing && (entry.kind !== "directory" || existing.kind !== "directory");
  });
  if (collisions.length > 0) {
    return refusal("destination-path-collision", absoluteSource, absoluteDestination, { sourceInventory, destinationInventory, collisions: Object.freeze(collisions) });
  }

  const directories = sourceInventory.entries.filter((entry) => entry.kind === "directory").map((entry) => entry.relativePath);
  const files = sourceInventory.entries.filter((entry) => entry.kind === "file").map((entry) => entry.relativePath);
  return Object.freeze({
    type: "DirectoryContentsMergePlan",
    source: absoluteSource,
    destination: absoluteDestination,
    sourceInventory,
    destinationInventory,
    directories: Object.freeze(directories),
    files: Object.freeze(files),
  });
}

async function verify(plan) {
  const missingTargets = [];
  for (const entry of plan.sourceInventory.entries) {
    const target = resolve(plan.destination, entry.relativePath);
    const stat = await lstat(target).catch(() => null);
    if (!stat || kindOf(stat) !== entry.kind) missingTargets.push(entry.relativePath);
  }
  const sourceRemoved = !await lstat(plan.source).then(() => true, () => false);
  return Object.freeze({ complete: sourceRemoved && missingTargets.length === 0, sourceRemoved, missingTargets: Object.freeze(missingTargets) });
}

/**
 * Move a source directory's contents into an existing directory after a full,
 * conflict-free survey. Each rename is local to the filesystem; the merge as a
 * whole is not atomic, so failures retain the completed write evidence.
 *
 * @param {{source: string, destination: string, apply?: boolean}} options
 * @returns {Promise<DirectoryContentsMergePlan|DirectoryContentsMergeRefusal|DirectoryContentsMergeResult|DirectoryContentsMergePartialFailure>}
 */
export async function mergeDirectoryContents({ source, destination, apply = false } = {}) {
  const planned = await planDirectoryContentsMerge({ source, destination });
  if (planned.type === "DirectoryContentsMergeRefusal" || !apply) return planned;
  const writes = [];
  try {
    for (const relativePath of planned.directories) {
      const target = resolve(planned.destination, relativePath);
      if (!await lstat(target).then(() => true, () => false)) {
        await mkdir(target);
        writes.push(Object.freeze({ type: "mkdir", relativePath }));
      }
    }
    for (const relativePath of planned.files) {
      const sourcePath = resolve(planned.source, relativePath);
      const destinationPath = resolve(planned.destination, relativePath);
      await link(sourcePath, destinationPath);
      writes.push(Object.freeze({ type: "link", relativePath }));
      await unlink(sourcePath);
      writes.push(Object.freeze({ type: "unlink", relativePath }));
    }
    for (const relativePath of [...planned.directories].sort((left, right) => right.split("/").length - left.split("/").length)) {
      await rmdir(resolve(planned.source, relativePath));
      writes.push(Object.freeze({ type: "rmdir", relativePath }));
    }
    await rmdir(planned.source);
    writes.push(Object.freeze({ type: "rmdir", relativePath: "" }));
  } catch (error) {
    return Object.freeze({ type: "DirectoryContentsMergePartialFailure", reason: "write-failed", plan: planned, writes: Object.freeze(writes), error: error.message });
  }
  const verification = await verify(planned);
  if (!verification.complete) {
    return Object.freeze({ type: "DirectoryContentsMergePartialFailure", reason: "readback-incomplete", plan: planned, writes: Object.freeze(writes), verification });
  }
  return Object.freeze({ type: "DirectoryContentsMergeResult", plan: planned, writes: Object.freeze(writes), verification });
}
