import { randomUUID } from "node:crypto";
import { chmod, link, mkdir, open, rename, stat, unlink } from "node:fs/promises";
import { chmodSync, closeSync, fsyncSync, linkSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

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

async function writeAtomically(path, data, encoding, { flag, mode } = {}) {
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
  try {
    // Set permissions at creation, before any bytes become visible. Keep the
    // descriptor for syncing, since the requested mode may prohibit reopening.
    const handle = await open(temporary, "wx", finalMode ?? undefined);
    try {
      await handle.writeFile(data, encoding ? { encoding } : {});
      await handle.sync();
    } finally { await handle.close(); }
    if (finalMode !== null) await chmod(temporary, finalMode);
    if (flag === "wx") { await link(temporary, path); await unlink(temporary); }
    else await rename(temporary, path);
    await syncDirectory(directory);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return Object.freeze({ path, bytes: Buffer.byteLength(data) });
}

/** The same temp-file-then-rename publish, synchronously, for callers that cannot await. */
function writeAtomicallySync(path, data, encoding, { flag, mode } = {}) {
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
  try {
    const descriptor = openSync(temporary, "wx", finalMode ?? undefined);
    try {
      writeFileSync(descriptor, data, encoding ? { encoding } : {});
      fsyncSync(descriptor);
    } finally { closeSync(descriptor); }
    if (finalMode !== null) chmodSync(temporary, finalMode);
    if (flag === "wx") { linkSync(temporary, path); unlinkSync(temporary); }
    else renameSync(temporary, path);
    syncDirectorySync(directory);
  } catch (error) {
    try { unlinkSync(temporary); } catch {}
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
