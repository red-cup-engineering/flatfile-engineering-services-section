import { randomUUID } from "node:crypto";
import { chmod, link, lstat, mkdir, open, rename, stat, unlink } from "node:fs/promises";
import { chmodSync, closeSync, constants, fchmodSync, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

// flag "wx" publishes by hard-linking the finished temporary file into place instead of
// renaming over it, so an occupied destination is left untouched and rejected with EEXIST
// (matching node:fs's own "wx" exclusive-create semantics) rather than silently replaced.
// After the publish the directory entry itself is flushed, so the rename survives a crash; a
// platform that cannot open or sync a directory (Windows, some network mounts) is left as is.
const UNSYNCABLE_DIRECTORY = new Set(["EISDIR", "EINVAL", "EPERM", "EACCES", "EBADF", "ENOTSUP"]);
async function syncDirectory(directory) {
  let handle;
  try { handle = await open(directory, "r"); await handle.sync(); }
  catch (error) { if (!UNSYNCABLE_DIRECTORY.has(error?.code)) throw error; }
  finally { await handle?.close(); }
}
function syncDirectorySync(directory) {
  let descriptor;
  try { descriptor = openSync(directory, "r"); fsyncSync(descriptor); }
  catch (error) { if (!UNSYNCABLE_DIRECTORY.has(error?.code)) throw error; }
  finally { if (descriptor !== undefined) closeSync(descriptor); }
}

async function writeAtomically(path, data, encoding, { flag, mode, durableRoot } = {}) {
  if (durableRoot !== undefined) return writeStrict(path, data, encoding, { flag, mode, durableRoot });
  const directory = dirname(path);
  const temporary = `${directory}/.${basename(path)}.${process.pid}.${randomUUID()}.tmp`;
  let existingMode = null;
  if (mode === undefined) {
    try { existingMode = (await stat(path)).mode; } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const finalMode = mode ?? existingMode;
  await mkdir(directory, { recursive: true });
  let created = false;
  try {
    // Set permissions at creation, before any bytes become visible. Keep the
    // descriptor for syncing, since the requested mode may prohibit reopening.
    const handle = await open(temporary, "wx", finalMode ?? undefined);
    created = true;
    try {
      await handle.writeFile(data, encoding ? { encoding } : {});
      await handle.sync();
    } finally { await handle.close(); }
    if (finalMode !== null) await chmod(temporary, finalMode);
    if (flag === "wx") { await link(temporary, path); await unlink(temporary); }
    else await rename(temporary, path);
    await syncDirectory(directory);
  } catch (error) {
    // A generated path is not ours until exclusive creation succeeds.
    if (created) await unlink(temporary).catch(() => {});
    throw error;
  }
  return Object.freeze({ path, bytes: Buffer.byteLength(data) });
}

/** The same temp-file-then-rename publish, synchronously, for callers that cannot await. */
function writeAtomicallySync(path, data, encoding, { flag, mode, durableRoot } = {}) {
  if (durableRoot !== undefined) return writeStrictSync(path, data, encoding, { flag, mode, durableRoot });
  const directory = dirname(path);
  const temporary = `${directory}/.${basename(path)}.${process.pid}.${randomUUID()}.tmp`;
  let existingMode = null;
  if (mode === undefined) {
    try { existingMode = statSync(path).mode; } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const finalMode = mode ?? existingMode;
  mkdirSync(directory, { recursive: true });
  let created = false;
  try {
    const descriptor = openSync(temporary, "wx", finalMode ?? undefined);
    created = true;
    try {
      writeFileSync(descriptor, data, encoding ? { encoding } : {});
      fsyncSync(descriptor);
    } finally { closeSync(descriptor); }
    if (finalMode !== null) chmodSync(temporary, finalMode);
    if (flag === "wx") { linkSync(temporary, path); unlinkSync(temporary); }
    else renameSync(temporary, path);
    syncDirectorySync(directory);
  } catch (error) {
    // A generated path is not ours until exclusive creation succeeds.
    if (created) { try { unlinkSync(temporary); } catch {} }
    throw error;
  }
  return Object.freeze({ path, bytes: Buffer.byteLength(data) });
}

/** writeFileText, synchronously. */
export function writeFileTextSync(path, text, options) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return writeAtomicallySync(path, text, "utf8", options);
}

/**
 * @param {string} path
 * @param {string} text
 * @param {{flag?: "wx", mode?: number}} [options] flag "wx" creates only if path is absent
 *   (throws EEXIST otherwise, in place of the default replace-any-existing-file publish);
 *   mode sets the file's permission bits explicitly in place of preserving an existing file's mode.
 */
export async function writeFileText(path, text, options) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return writeAtomically(path, text, "utf8", options);
}

/**
 * Atomically writes arbitrary bytes (a binary carrier -- audio, image, any
 * non-UTF-8 format), the same temp-file-then-rename mechanics writeFileText
 * uses, without forcing a UTF-8 text encoding onto the data.
 * @param {string} path
 * @param {Buffer|Uint8Array} bytes
 * @param {{flag?: "wx", mode?: number}} [options] see writeFileText
 * @returns {Promise<{path:string, bytes:number}>}
 */
export async function writeFileBytes(path, bytes, options) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new TypeError("bytes must be a Buffer or Uint8Array");
  return writeAtomically(path, bytes, null, options);
}

/** writeFileBytes, synchronously. */
export function writeFileBytesSync(path, bytes, options) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new TypeError("bytes must be a Buffer or Uint8Array");
  return writeAtomicallySync(path, bytes, null, options);
}

export async function runWriteFile(argv, io) {
  if (argv.length !== 1) throw new TypeError("usage: write-file PATH");
  io.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of io.stdin) text += chunk;
  const receipt = await writeFileText(argv[0], text);
  io.stdout.write(`${JSON.stringify(receipt)}\n`);
  return receipt;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runWriteFile(argv, { stdin, stdout, stderr }),
  formatError: (error) => `write-file: ${error.message}\n`,
  exitCode: 64,
});


/**
 * Strict durability is opt-in. durableRoot is a caller-proved, already durable
 * directory anchor. These checks establish containment/type/device, not that
 * historical durability or exclusion from concurrent directory replacement.
 */
function durablePaths(path, durableRoot) {
  if (typeof path !== "string" || path.length === 0 ||
      typeof durableRoot !== "string" || !isAbsolute(durableRoot))
    throw new TypeError("strict durability requires a file path and an absolute durableRoot");
  const file = resolve(path), root = resolve(durableRoot), parent = dirname(file);
  const within = relative(root, parent);
  if (isAbsolute(within) || within === ".." || within.startsWith(".." + sep))
    throw new TypeError("strict durable path must be below durableRoot");
  for (const flag of ["O_NOFOLLOW", "O_NONBLOCK", "O_DIRECTORY"])
    if (!Number.isInteger(constants[flag])) throw new Error("strict durable file opens are unsupported");
  const directories = [];
  for (let directory = parent;; directory = dirname(directory)) {
    directories.push(directory);
    if (directory === root) break;
  }
  return { path: file, durableRoot: root, directories };
}
const strictReadFlags = () => constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const assertDirectoryStat = (stat, device) => {
  if (!stat.isDirectory() || stat.isSymbolicLink?.() || (device !== undefined && stat.dev !== device))
    throw new TypeError("strict durability requires non-redirected directories on the anchor filesystem");
};
const assertFileStat = (stat, device) => {
  if (!stat.isFile() || stat.isSymbolicLink?.() || stat.dev !== device)
    throw new TypeError("strict durability requires a regular file on the anchor filesystem");
};
function directoryStatSync(directory, device) {
  assertDirectoryStat(lstatSync(directory), device);
  const fd = openSync(directory, strictReadFlags() | constants.O_DIRECTORY);
  try { const held = fstatSync(fd); assertDirectoryStat(held, device); return held; }
  finally { closeSync(fd); }
}
async function directoryStat(directory, device) {
  assertDirectoryStat(await lstat(directory), device);
  const handle = await open(directory, strictReadFlags() | constants.O_DIRECTORY);
  try { const held = await handle.stat(); assertDirectoryStat(held, device); return held; }
  finally { await handle.close(); }
}
/** Read-only path admission. Missing descendants are allowed; the anchor must exist. */
export function assertDurableFilePathSync(path, { durableRoot } = {}) {
  const admitted = durablePaths(path, durableRoot);
  const device = directoryStatSync(admitted.durableRoot).dev;
  for (const directory of [...admitted.directories].reverse().slice(1)) {
    try { directoryStatSync(directory, device); }
    catch (error) { if (error.code === "ENOENT") break; throw error; }
  }
  try { assertFileStat(lstatSync(admitted.path), device); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return Object.freeze({ ...admitted, directories: Object.freeze(admitted.directories), device });
}
async function assertDurableFilePath(path, { durableRoot } = {}) {
  const admitted = durablePaths(path, durableRoot);
  const device = (await directoryStat(admitted.durableRoot)).dev;
  for (const directory of [...admitted.directories].reverse().slice(1)) {
    try { await directoryStat(directory, device); }
    catch (error) { if (error.code === "ENOENT") break; throw error; }
  }
  try { assertFileStat(await lstat(admitted.path), device); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return Object.freeze({ ...admitted, directories: Object.freeze(admitted.directories), device });
}
/** Caller owns the returned descriptor. No file bytes are read/written before validation. */
export function openDurableFileSync(path, flags, { durableRoot, mode = 0o666, createParents = false } = {}) {
  if (!Number.isInteger(flags) || flags < 0 || (flags & constants.O_TRUNC) !== 0)
    throw new TypeError("strict file flags must be nonnegative and must not truncate before descriptor validation");
  let admitted = assertDurableFilePathSync(path, { durableRoot });
  if (createParents) {
    mkdirSync(dirname(admitted.path), { recursive: true });
    admitted = assertDurableFilePathSync(path, { durableRoot });
  }
  const fd = openSync(admitted.path, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, mode);
  try { assertFileStat(fstatSync(fd), admitted.device); return fd; }
  catch (error) { closeSync(fd); throw error; }
}
async function openDurableFile(path, flags, { durableRoot, mode = 0o666, createParents = false } = {}) {
  let admitted = await assertDurableFilePath(path, { durableRoot });
  if (createParents) {
    await mkdir(dirname(admitted.path), { recursive: true });
    admitted = await assertDurableFilePath(path, { durableRoot });
  }
  const handle = await open(admitted.path, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, mode);
  try { assertFileStat(await handle.stat(), admitted.device); return handle; }
  catch (error) { await handle.close(); throw error; }
}
function syncDurableDirectoriesSync(path, durableRoot) {
  const admitted = assertDurableFilePathSync(path, { durableRoot });
  for (const directory of admitted.directories) {
    const fd = openSync(directory, strictReadFlags() | constants.O_DIRECTORY);
    try { assertDirectoryStat(fstatSync(fd), admitted.device); fsyncSync(fd); }
    finally { closeSync(fd); }
  }
}
async function syncDurableDirectories(path, durableRoot) {
  const admitted = await assertDurableFilePath(path, { durableRoot });
  for (const directory of admitted.directories) {
    const handle = await open(directory, strictReadFlags() | constants.O_DIRECTORY);
    try { assertDirectoryStat(await handle.stat(), admitted.device); await handle.sync(); }
    finally { await handle.close(); }
  }
}
/** Reestablish file + full ancestry barriers, even for already-present readable data. */
export function syncFileDurablySync(path, { durableRoot } = {}) {
  const fd = openDurableFileSync(path, constants.O_RDONLY, { durableRoot });
  try { fsyncSync(fd); } finally { closeSync(fd); }
  syncDurableDirectoriesSync(path, durableRoot);
}
function writeStrictSync(path, data, encoding, { flag, mode, durableRoot }) {
  const admitted = assertDurableFilePathSync(path, { durableRoot });
  let existingMode = null;
  if (mode === undefined) {
    try { existingMode = statSync(admitted.path).mode; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const finalMode = mode ?? existingMode;
  const temporary = dirname(admitted.path) + "/." + basename(admitted.path) + "." + process.pid + "." + randomUUID() + ".tmp";
  let created = false, publicationAttempted = false;
  try {
    const fd = openDurableFileSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      { durableRoot, mode: finalMode ?? 0o666, createParents: true });
    created = true;
    try {
      writeFileSync(fd, data, encoding ? { encoding } : {});
      if (finalMode !== null) fchmodSync(fd, finalMode);
      fsyncSync(fd);
    } finally { closeSync(fd); }
    publicationAttempted = true;
    if (flag === "wx") linkSync(temporary, admitted.path);
    else renameSync(temporary, admitted.path);
    syncDurableDirectoriesSync(admitted.path, durableRoot);
    if (flag === "wx") {
      unlinkSync(temporary);
      syncDurableDirectoriesSync(admitted.path, durableRoot);
    }
  } catch (error) {
    // Never remove the destination; after publication the outcome is uncertain.
    // Keep a linked temporary until its destination barrier succeeds.
    if (created && !publicationAttempted) { try { unlinkSync(temporary); } catch {} }
    throw error;
  }
  return Object.freeze({ path, bytes: Buffer.byteLength(data) });
}
async function writeStrict(path, data, encoding, { flag, mode, durableRoot }) {
  const admitted = await assertDurableFilePath(path, { durableRoot });
  let existingMode = null;
  if (mode === undefined) {
    try { existingMode = (await stat(admitted.path)).mode; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const finalMode = mode ?? existingMode;
  const temporary = dirname(admitted.path) + "/." + basename(admitted.path) + "." + process.pid + "." + randomUUID() + ".tmp";
  let created = false, publicationAttempted = false;
  try {
    const handle = await openDurableFile(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      { durableRoot, mode: finalMode ?? 0o666, createParents: true });
    created = true;
    try {
      await handle.writeFile(data, encoding ? { encoding } : {});
      if (finalMode !== null) await handle.chmod(finalMode);
      await handle.sync();
    } finally { await handle.close(); }
    publicationAttempted = true;
    if (flag === "wx") await link(temporary, admitted.path);
    else await rename(temporary, admitted.path);
    await syncDurableDirectories(admitted.path, durableRoot);
    if (flag === "wx") {
      await unlink(temporary);
      await syncDurableDirectories(admitted.path, durableRoot);
    }
  } catch (error) {
    if (created && !publicationAttempted) await unlink(temporary).catch(() => {});
    throw error;
  }
  return Object.freeze({ path, bytes: Buffer.byteLength(data) });
}

