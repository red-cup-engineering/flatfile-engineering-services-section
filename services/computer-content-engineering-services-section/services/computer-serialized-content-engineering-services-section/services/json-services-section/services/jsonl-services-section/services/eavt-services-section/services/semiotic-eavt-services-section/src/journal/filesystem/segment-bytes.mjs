/**
 * @packageDocumentation
 *
 * A journal file's bytes, wherever they are kept. A closed segment (a past day's feed) never
 * changes, and its canonical JSON is mostly repetition: zstd keeps it in about a thirtieth of the
 * space. `packSegment` therefore keeps a segment's complete lines `[0, N)` as independent zstd
 * frames of about a mebibyte each (the seekable layout: any line is one frame's decompression away),
 * and frees those bytes of the file itself with a punched hole. The file keeps its name, size and
 * every offset, so appends, admission indexes and checkpoints are unchanged; only reading consults
 * the packing.
 *
 * Packing descriptions and temporary files have bounded names derived from the SHA-256 identity of
 * the segment basename. Packed data is named by the complete packed-prefix digest and compressed
 * representation digest, allowing identical representations to be shared without colliding with a
 * different frame layout for the same plain bytes.
 *
 * Legacy `<segment>.packed.json` descriptions remain readable. New descriptions are written last
 * and atomically, after their data is verified, so a reader sees either the plain bytes or a packing
 * that reproduces them exactly; the hole is punched only after publication.
 *
 * A crash during an append can leave the file extended with NUL bytes whose data never reached the
 * disk (delayed allocation extends the size before the data lands). The bytes after the last
 * complete line are the file's tail. A tail of only NUL bytes is crash padding: readers read the
 * file as if it ended at the last newline, and `appendDurably`, the file's writer, truncates it
 * before appending. A tail of text without a newline is a torn append: readers already leave it
 * unread, and the writer truncates it before appending, so the next line is never fused to it. A NUL
 * byte anywhere else outside the packed prefix, including a tail that mixes text and NUL, is
 * corruption and is refused. Each recovery is reported once through `process.emitWarning` with the
 * code `JOURNAL_TAIL_RECOVERED`.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { zstdCompressSync, zstdDecompressSync, constants } from "node:zlib";

export const PACKING_SUFFIX = ".packed.json";
const FRAME_BYTES = 1 << 20;
const LEVEL = 12;

const descriptions = new Map();

export const TAIL_RECOVERED = "JOURNAL_TAIL_RECOVERED";
const TAIL_CHUNK = 64 * 1024;

/**
 * Classify the bytes after the last newline of `[boundary, size)`, where `boundary` is the end of the
 * packed prefix (which always ends on a newline). Returns `{ end, kind }`: `end` is the offset just
 * past the last complete line, and `kind` is "clean" (nothing follows it), "nul" (only NUL bytes
 * follow), "torn" (text without NUL follows) or "mixed" (NUL and other bytes follow).
 */
function classifyTail(fd, size, boundary) {
  if (size <= boundary) return { end: size, kind: "clean" };
  const chunk = Buffer.alloc(TAIL_CHUNK);
  let nul = false, other = false;
  for (let at = size; at > boundary;) {
    const from = Math.max(boundary, at - chunk.length);
    const count = fs.readSync(fd, chunk, 0, at - from, from);
    if (count !== at - from) throw new TypeError("journal file ended while its tail was classified");
    const view = chunk.subarray(0, count);
    const newline = view.lastIndexOf(10);
    const after = newline >= 0 ? view.subarray(newline + 1) : view;
    if (after.length > 0) {
      const zeros = after.indexOf(0) >= 0;
      if (zeros) nul = true;
      if (!zeros || after.some((byte) => byte !== 0)) other = true;
    }
    if (newline >= 0) {
      const end = from + newline + 1;
      return { end, kind: end === size ? "clean" : classifyKind(nul, other) };
    }
    at = from;
  }
  return { end: boundary, kind: classifyKind(nul, other) };
}

function classifyKind(nul, other) {
  if (nul && other) return "mixed";
  return nul ? "nul" : "torn";
}

const reported = new Map();

function reportTail(file, kind, detail) {
  process.emitWarning(
    `journal file ${file}: ${kind === "nul" ? "a run of NUL bytes left by a crash" : "a torn final line"} after its last complete line ${detail.action}`,
    { type: "JournalTailRecovery", code: TAIL_RECOVERED, detail: JSON.stringify({ file, kind, pid: process.pid, ...detail }) },
  );
}

/** A reader met crash padding: report it once per file and extent. */
function reportRead(file, tail, size) {
  const key = `${tail.end}:${size}`;
  if (reported.get(file) === key) return;
  reported.set(file, key);
  reportTail(file, "nul", { action: "was read as absent", offset: tail.end, bytes: size - tail.end });
}

/** The writer recovers a tail it owns: truncates NUL padding or a torn line at the last newline. */
function repairTail(fd, file, size, stat) {
  const boundary = packingOf(file)?.packed ?? 0;
  const tail = classifyTail(fd, size, boundary);
  if (tail.kind === "clean") return;
  if (tail.kind === "mixed") {
    throw new TypeError(`journal file ${file} holds NUL bytes outside its packed prefix`);
  }
  const detail = { action: "was truncated before the next append", offset: tail.end, bytes: size - tail.end, mtime: new Date(stat.mtimeMs).toISOString() };
  if (tail.kind === "torn") {
    const lost = Buffer.alloc(size - tail.end);
    fs.readSync(fd, lost, 0, lost.length, tail.end);
    detail.sha256 = createHash("sha256").update(lost).digest("hex");
  }
  fs.ftruncateSync(fd, tail.end);
  reported.delete(file);
  reportTail(file, tail.kind, detail);
}

function syncDirectory(directory) {
  let fd;
  try {
    fd = fs.openSync(directory, "r");
    fs.fsyncSync(fd);
  } catch (error) {
    if (!["EISDIR", "EPERM", "EINVAL", "EACCES"].includes(error.code)) throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * Append `text` to `file` as its writer. A crash tail (NUL padding or a torn line) is truncated
 * first, so the new bytes always begin on a line boundary. With `sync` (the default) the bytes are on
 * disk (fdatasync) before this returns, and a file this call created is linked durably into its
 * directory; with `sync: false` the caller makes them durable with `syncFile`.
 */
export function appendDurably(file, text, { sync = true } = {}) {
  const fd = fs.openSync(file, "a+");
  try {
    const stat = fs.fstatSync(fd);
    const size = stat.size;
    if (size > 0) {
      const last = Buffer.alloc(1);
      fs.readSync(fd, last, 0, 1, size - 1);
      if (last[0] !== 10) repairTail(fd, file, size, stat);
    }
    const body = Buffer.from(text, "utf8");
    for (let written = 0; written < body.length;) {
      written += fs.writeSync(fd, body, written, body.length - written);
    }
    if (sync) {
      fs.fdatasyncSync(fd);
      if (size === 0) syncDirectory(path.dirname(file));
    }
  } finally {
    fs.closeSync(fd);
  }
}

/** Make the bytes already written to `file` durable. */
export function syncFile(file) {
  const fd = fs.openSync(file, "r");
  try {
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function basenameIdentity(file) {
  return createHash("sha256").update(path.basename(file), "utf8").digest("hex");
}

function newDescriptionPath(file) {
  return path.join(path.dirname(file), `.packing-${basenameIdentity(file)}${PACKING_SUFFIX}`);
}

function legacyDescriptionPath(file) {
  return `${file}${PACKING_SUFFIX}`;
}

function absentDescription(error, legacy) {
  return error?.code === "ENOENT" || (legacy && error?.code === "ENAMETOOLONG");
}

function locateDescription(file) {
  const currentPath = newDescriptionPath(file);
  try {
    return { descriptionPath: currentPath, stat: fs.statSync(currentPath), legacy: false };
  } catch (error) {
    if (!absentDescription(error, false)) throw error;
  }

  const oldPath = legacyDescriptionPath(file);
  try {
    return { descriptionPath: oldPath, stat: fs.statSync(oldPath), legacy: true };
  } catch (error) {
    if (!absentDescription(error, true)) throw error;
    return null;
  }
}

/** The current packing of `file`, or null when none was written. */
export function packingOf(file) {
  const located = locateDescription(file);
  if (located === null) {
    descriptions.delete(file);
    return null;
  }

  const { descriptionPath, stat, legacy } = located;
  const key = `${descriptionPath}:${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}`;
  const held = descriptions.get(file);
  if (held?.key === key) return held.packing;

  const packing = JSON.parse(fs.readFileSync(descriptionPath, "utf8"));
  if (packing.version !== 1 || !Number.isSafeInteger(packing.packed) || !Array.isArray(packing.frames)) {
    throw new TypeError(`${descriptionPath} is not a packing this reader knows`);
  }

  packing.dataPath = path.join(path.dirname(file), packing.data);
  Object.defineProperties(packing, {
    descriptionPath: { value: descriptionPath },
    legacyDescription: { value: legacy },
  });
  descriptions.set(file, { key, packing });
  return packing;
}

/**
 * A reader of one journal file's bytes, shaped like a file descriptor's: `read(buffer, offset,
 * length, position)` fills as much of `buffer[offset, offset+length)` as the file holds from
 * `position` and returns how many bytes it filled (0 at the end), taking packed bytes from their
 * frames and the rest from the file.
 */
export function openSegmentReader(file) {
  const fd = fs.openSync(file, "r");
  let packing;
  try {
    packing = packingOf(file);
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }

  let dataFd = null;
  let closed = false;
  const decoded = new Map();

  const frame = (index) => {
    let bytes = decoded.get(index);
    if (bytes !== undefined) return bytes;

    const [, length, at, size] = packing.frames[index];
    dataFd ??= fs.openSync(packing.dataPath, "r");
    const compressed = Buffer.alloc(size);
    for (let read = 0; read < size;) {
      const got = fs.readSync(dataFd, compressed, read, size - read, at + read);
      if (got === 0) throw new TypeError(`${packing.dataPath} ended inside a frame`);
      read += got;
    }

    bytes = zstdDecompressSync(compressed);
    if (bytes.length !== length) {
      throw new TypeError(`${packing.dataPath} frame ${index} does not hold ${length} bytes`);
    }
    if (decoded.size >= 2) decoded.delete(decoded.keys().next().value);
    decoded.set(index, bytes);
    return bytes;
  };

  const frameIndexAt = (position) => {
    let low = 0;
    let high = packing.frames.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (packing.frames[middle][0] <= position) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const repack = () => {
    const fresh = packingOf(file);
    if (fresh === null || fresh === packing) return false;
    packing = fresh;
    decoded.clear();
    if (dataFd !== null) {
      fs.closeSync(dataFd);
      dataFd = null;
    }
    return true;
  };

  function readOnce(buffer, offset, length, position) {
    if (packing !== null && position < packing.packed) {
      const index = frameIndexAt(position);
      const bytes = frame(index);
      const start = position - packing.frames[index][0];
      const count = Math.min(length, bytes.length - start, packing.packed - position);
      bytes.copy(buffer, offset, start, start + count);
      return count;
    }

    const count = fs.readSync(fd, buffer, offset, length, position);
    if (count > 0 && buffer.subarray(offset, offset + count).includes(0)) {
      if (repack() && position < packing.packed) {
        return readOnce(buffer, offset, length, position);
      }
      // Crash padding: NUL bytes that run from the last complete line to the end of the file are read as absent.
      const size = fs.fstatSync(fd).size;
      const tail = classifyTail(fd, size, packing?.packed ?? 0);
      if (tail.kind === "nul") {
        const usable = Math.max(0, Math.min(count, tail.end - position));
        if (!buffer.subarray(offset, offset + usable).includes(0)) {
          reportRead(file, tail, size);
          return usable;
        }
      }
      throw new TypeError(`journal file ${file} holds NUL bytes outside its packed prefix`);
    }
    return count;
  }

  return Object.freeze({
    read(buffer, offset, length, position) {
      let filled = 0;
      while (filled < length) {
        const count = readOnce(buffer, offset + filled, length - filled, position + filled);
        if (count === 0) break;
        filled += count;
      }
      return filled;
    },
    close() {
      if (closed) return;
      closed = true;
      fs.closeSync(fd);
      if (dataFd !== null) {
        fs.closeSync(dataFd);
        dataFd = null;
      }
    },
  });
}

/** Free `[0, length)` of `file` on disk while keeping its size and offsets. */
function punchHole(file, length) {
  execFileSync("fallocate", [
    "--punch-hole",
    "--keep-size",
    "--offset",
    "0",
    "--length",
    String(length),
    file,
  ]);
}

function filesEqual(left, right) {
  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (leftStat.size !== rightStat.size) return false;

  const leftFd = fs.openSync(left, "r");
  const rightFd = fs.openSync(right, "r");
  const leftBuffer = Buffer.alloc(64 * 1024);
  const rightBuffer = Buffer.alloc(leftBuffer.length);
  try {
    for (let position = 0; position < leftStat.size;) {
      const length = Math.min(leftBuffer.length, leftStat.size - position);
      const leftRead = fs.readSync(leftFd, leftBuffer, 0, length, position);
      const rightRead = fs.readSync(rightFd, rightBuffer, 0, length, position);
      if (leftRead !== length || rightRead !== length) return false;
      if (!leftBuffer.subarray(0, length).equals(rightBuffer.subarray(0, length))) return false;
      position += length;
    }
    return true;
  } finally {
    fs.closeSync(leftFd);
    fs.closeSync(rightFd);
  }
}

function publishData(partial, destination) {
  try {
    fs.linkSync(partial, destination);
    fs.unlinkSync(partial);
    return;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  if (!filesEqual(partial, destination)) {
    throw new TypeError(`${destination} does not hold the expected packed data`);
  }
  fs.unlinkSync(partial);
}

function retireLegacyDescription(file, current) {
  if (current === null || !current.legacyDescription) return;
  try {
    fs.unlinkSync(current.descriptionPath);
  } catch (error) {
    if (!absentDescription(error, true)) throw error;
  }
}

/**
 * Read a packed segment back into a plain file a person can read: its bytes, taken through its packing,
 * replace the file whole, and its packing description goes, with its frame data unless another
 * description in the directory names it. Returns `{ unpacked, unchanged }`; a segment that is not packed
 * is left as it is. Its bytes do not change, so a verification checkpoint over them still holds.
 */
export function unpackSegment(file) {
  const packing = packingOf(file);
  if (packing === null) return { unpacked: 0, unchanged: true };
  const size = Math.max(fs.statSync(file).size, packing.packed);
  const temporary = `${file}.unpacking-${process.pid}`;
  const reader = openSegmentReader(file);
  const out = fs.openSync(temporary, "wx");
  try {
    const chunk = Buffer.alloc(4 * 1024 * 1024);
    for (let position = 0; position < size;) {
      const got = reader.read(chunk, 0, Math.min(chunk.length, size - position), position);
      if (got === 0) throw new TypeError(`unpacking ${file}: its packing ended at ${position} of ${size} bytes`);
      for (let written = 0; written < got;) written += fs.writeSync(out, chunk, written, got - written);
      position += got;
    }
    fs.fsyncSync(out);
  } catch (error) {
    fs.closeSync(out);
    fs.rmSync(temporary, { force: true });
    reader.close();
    throw error;
  }
  fs.closeSync(out);
  reader.close();
  fs.renameSync(temporary, file);
  fs.rmSync(packing.descriptionPath, { force: true });
  descriptions.delete(file);
  const directory = path.dirname(file);
  const stillNamed = fs.readdirSync(directory)
    .filter((name) => name.startsWith(".packing-") && name.endsWith(PACKING_SUFFIX))
    .some((name) => { try { return JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")).data === packing.data; } catch { return false; } });
  if (!stillNamed) fs.rmSync(packing.dataPath, { force: true });
  return { unpacked: size, unchanged: false };
}

/**
 * Pack the complete lines of a closed segment into seekable zstd frames and free their plain bytes.
 * Returns `{ packed, size, unchanged }`: the packed prefix, its compressed size, and whether it was
 * already packed through its last complete line.
 */
export function packSegment(file, { frameBytes = FRAME_BYTES, punch = punchHole } = {}) {
  const size = fs.statSync(file).size;
  const reader = openSegmentReader(file);
  const directory = path.dirname(file);
  const identity = basenameIdentity(file);
  const partial = path.join(directory, `.packing-${identity}-${process.pid}.data.tmp`);
  const descriptionPartial = path.join(
    directory,
    `.packing-${identity}-${process.pid}.description.tmp`,
  );
  const descriptionPath = newDescriptionPath(file);
  let out;

  try {
    const tail = Buffer.alloc(Math.min(size, 64 * 1024));
    let end = 0;
    for (let at = size; at > 0 && end === 0;) {
      const from = Math.max(0, at - tail.length);
      const count = reader.read(tail, 0, at - from, from);
      const newline = tail.subarray(0, count).lastIndexOf(10);
      if (newline >= 0) end = from + newline + 1;
      at = from;
    }

    const current = packingOf(file);
    if (end === 0 || (current !== null && current.packed >= end)) {
      return {
        packed: current?.packed ?? 0,
        size: current?.frames.reduce((sum, item) => sum + item[3], 0) ?? 0,
        unchanged: true,
      };
    }

    out = fs.openSync(partial, "wx");
    const hash = createHash("sha256");
    const packedHash = createHash("sha256");
    const frames = [];
    const chunk = Buffer.alloc(frameBytes);
    let position = 0;
    let framed = 0;
    let written = 0;
    let carry = Buffer.alloc(0);

    while (framed < end) {
      const count = position < end
        ? reader.read(chunk, 0, Math.min(chunk.length, end - position), position)
        : 0;
      if (count === 0 && position < end) {
        throw new TypeError(`packing ${file}: it ended before byte ${end}`);
      }

      position += count;
      const pending = Buffer.concat([carry, chunk.subarray(0, count)]);
      const cut = position >= end ? pending.length : pending.lastIndexOf(10) + 1;
      if (cut === 0) {
        carry = pending;
        continue;
      }

      const body = pending.subarray(0, cut);
      hash.update(body);
      const compressed = zstdCompressSync(body, {
        params: { [constants.ZSTD_c_compressionLevel]: LEVEL },
      });
      packedHash.update(compressed);

      let compressedWritten = 0;
      while (compressedWritten < compressed.length) {
        compressedWritten += fs.writeSync(
          out,
          compressed,
          compressedWritten,
          compressed.length - compressedWritten,
          written + compressedWritten,
        );
      }

      frames.push([framed, body.length, written, compressed.length]);
      framed += body.length;
      written += compressed.length;
      carry = Buffer.from(pending.subarray(cut));
    }

    fs.fsyncSync(out);
    fs.closeSync(out);
    out = undefined;

    const sha256 = hash.digest("hex");
    const representation = packedHash.digest("hex");

    const check = createHash("sha256");
    const data = fs.openSync(partial, "r");
    try {
      for (const [, length, at, bytes] of frames) {
        const compressed = Buffer.alloc(bytes);
        for (let read = 0; read < bytes;) {
          const got = fs.readSync(data, compressed, read, bytes - read, at + read);
          if (got === 0) {
            throw new TypeError(`packing ${file}: its temporary data ended inside a frame`);
          }
          read += got;
        }

        const plain = zstdDecompressSync(compressed);
        if (plain.length !== length) {
          throw new TypeError(`packing ${file}: a frame did not reproduce its length`);
        }
        check.update(plain);
      }
    } finally {
      fs.closeSync(data);
    }

    if (check.digest("hex") !== sha256) {
      throw new TypeError(`packing ${file}: the frames do not reproduce its bytes`);
    }

    const dataName = `.packed-${sha256}-${representation}.zst`;
    const dataPath = path.join(directory, dataName);
    publishData(partial, dataPath);

    const description = {
      version: 1,
      packed: end,
      sha256,
      data: dataName,
      frames,
    };

    const descriptionFd = fs.openSync(descriptionPartial, "wx");
    try {
      const body = Buffer.from(`${JSON.stringify(description)}\n`);
      for (let writtenDescription = 0; writtenDescription < body.length;) {
        writtenDescription += fs.writeSync(
          descriptionFd,
          body,
          writtenDescription,
          body.length - writtenDescription,
        );
      }
      fs.fsyncSync(descriptionFd);
    } finally {
      fs.closeSync(descriptionFd);
    }

    fs.renameSync(descriptionPartial, descriptionPath);
    descriptions.delete(file);
    retireLegacyDescription(file, current);
    punch(file, end);

    return { packed: end, size: written, unchanged: false };
  } finally {
    reader.close();
    if (out !== undefined) fs.closeSync(out);
    fs.rmSync(partial, { force: true });
    fs.rmSync(descriptionPartial, { force: true });
  }
}