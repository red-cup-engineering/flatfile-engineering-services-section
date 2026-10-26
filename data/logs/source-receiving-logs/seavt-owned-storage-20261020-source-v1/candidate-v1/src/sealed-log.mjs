/**
 * Sealed day logs: a closed day's lines kept compressed, read exactly as before.
 *
 * A day's log is the concatenation, in order, of its sealed segments, then a sealing file, then its open
 * `<date>.jsonl`. A reader's byte cursor is a position in that concatenation of uncompressed bytes, so sealing
 * a day changes no cursor and no line.
 *
 * - A segment is `<date>.<start>-<end>.jsonl.gz`: the day's uncompressed bytes [start, end) as BGZF (the blocked
 *   gzip of the SAM/BAM specification, section 4.1): independent gzip members of at most 64 KiB, each carrying
 *   its own size in a `BC` extra field. Any gzip tool reads it; this reader streams it block by block,
 *   synchronously. Blocks end at line ends, so each holds whole lines.
 * - Sealing renames the open file to `<date>.jsonl.sealing` first, so a concurrent late append opens a fresh
 *   tail instead of racing; then writes the segment (temporary file, fsync, rename) and removes the sealing
 *   file. An interrupted seal is recognised on the next run: a segment that starts where the earlier ones end
 *   and is exactly as long as the sealing file is that file's seal, and only the removal remains.
 */
import { closeSync, constants, fstatSync, ftruncateSync, fsyncSync, openSync, readSync, renameSync, statSync, unlinkSync, writeSync } from "node:fs";
import { BGZF_BLOCK_DATA_MAX as BLOCK_DATA_MAX, bgzfBlock as block, bgzfBlocks, readBgzfBlockAt } from "@red-cup-engineering/computer-file-engineering-services-section/bgzf";
import { StoreCorruption } from "./layout.mjs";
import { assertDurableFilePathSync, openDurableFileSync, syncFileDurablySync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
const receiveFiles = (durableRoot, ...paths) => {
  if (durableRoot !== undefined)
    for (const path of paths) assertDurableFilePathSync(path, { durableRoot });
};
const openRead = (path, durableRoot) => durableRoot === undefined ? openSync(path, "r") :
  openDurableFileSync(path, constants.O_RDONLY, { durableRoot });

const NEWLINE = 0x0a;
/** A line longer than this in a segment is passed over (a block holds 64 KiB; a line may span blocks). */
export const SEGMENT_LINE_BYTES_MAX = 1_048_576 + 1_024;
const SEGMENT = /^(\d{4}-\d{2}-\d{2})\.(\d+)-(\d+)\.jsonl\.gz$/u;

/** A day's sealed segments in a directory listing, ordered and checked contiguous from 0. */
export function segmentsOf(names, date) {
  const segments = names.map((name) => SEGMENT.exec(name)).filter((match) => match && match[1] === date)
    .map((match) => ({ name: match[0], start: Number(match[2]), end: Number(match[3]) })).sort((a, b) => a.start - b.start);
  let at = 0;
  for (const segment of segments) {
    if (segment.start !== at || segment.end <= segment.start) throw new StoreCorruption(`${date}: sealed segments are not contiguous at ${segment.name}`);
    at = segment.end;
  }
  return segments;
}
/** The date a sealed segment's name belongs to, or null. */
export const segmentDate = (name) => SEGMENT.exec(name)?.[1] ?? null;

/** Every block's uncompressed data of a BGZF file, in order, each checked against its CRC and size. */
function* blocks(file, durableRoot) {
  let fd;
  try {
    if (durableRoot === undefined) { for (const { data } of bgzfBlocks(file)) yield data; return; }
    fd = openRead(file, durableRoot);
    // The File owner's exported decoder supplies the BGZF grammar/checksum;
    // this adapter only retains its already admitted descriptor for iteration.
    for (let offset = 0;;) {
      if (readSync(fd, Buffer.alloc(1), 0, 1, offset) === 0) return;
      const { data, size } = readBgzfBlockAt(fd, offset, file); yield data; offset += size;
    }
  } catch (error) { throw error instanceof StoreCorruption ? error : new StoreCorruption(error.message); }
  finally { if (fd !== undefined) closeSync(fd); }
}

/** A segment's lines from day position `from`: `{text, next}` with day positions. */
export function* segmentLines(file, start, from, { lineBytesMax = SEGMENT_LINE_BYTES_MAX } = {}) {
  let at = start, lineStart = start, carry = [], held = 0, skipping = false;
  for (const data of blocks(file)) {
    const end = at + data.length;
    for (let i = 0; i < data.length;) {
      const newline = data.indexOf(NEWLINE, i);
      const stop = newline < 0 ? data.length : newline;
      if (!skipping) {
        held += stop - i;
        if (held > lineBytesMax) { skipping = true; carry = []; held = 0; } else carry.push(data.subarray(i, stop));
      }
      if (newline < 0) break;
      if (!skipping && lineStart >= from) yield { text: Buffer.concat(carry, held).toString("utf8"), next: at + newline + 1 };
      carry = []; held = 0; skipping = false; lineStart = at + newline + 1;
      i = newline + 1;
    }
    at = end;
  }
  if (held > 0 || skipping) throw new StoreCorruption(`${file} ends inside a line`);
}

/** Write `source` (an uncompressed day file) as the segment starting at day position `start` in `directory`.
 *  An unterminated last line (an append cut short) is terminated; readers skip a line that does not parse. */
export function writeSegment(directory, date, source, start, { durableRoot } = {}) {
  const temporary = `${directory}/.${date}.${start}.jsonl.gz.partial`;
  receiveFiles(durableRoot, source, temporary);
  let input, output, outputOpened = false;
  const chunk = Buffer.alloc(BLOCK_DATA_MAX * 4);
  let pending = Buffer.alloc(0), position = 0, length = 0, done = false;
  try {
    input = openRead(source, durableRoot);
    output = durableRoot === undefined ? openSync(temporary, "w", 0o644) :
      openDurableFileSync(temporary, constants.O_WRONLY | constants.O_CREAT, { durableRoot, mode: 0o644 });
    outputOpened = true;
    // The original replacement semantics are retained only after strict
    // descriptor admission; O_TRUNC cannot act before that check.
    if (durableRoot !== undefined) ftruncateSync(output, 0);
    while (!done) {
      const read = readSync(input, chunk, 0, chunk.length, position);
      position += read; done = read === 0;
      pending = Buffer.concat([pending, chunk.subarray(0, read)]);
      if (done && pending.length > 0 && pending[pending.length - 1] !== NEWLINE) pending = Buffer.concat([pending, Buffer.from([NEWLINE])]);
      while (pending.length >= BLOCK_DATA_MAX || (done && pending.length > 0)) {
        // A block ends at a line end when it can; a line longer than a block spans whole blocks.
        const head = pending.subarray(0, BLOCK_DATA_MAX);
        let cut = head.lastIndexOf(NEWLINE);
        if (cut < 0) cut = head.length - 1;
        if (cut < 0) throw new StoreCorruption(`${source} has an empty block`);
        writeSync(output, block(pending.subarray(0, cut + 1)));
        length += cut + 1;
        pending = pending.subarray(cut + 1);
      }
    }
    fsyncSync(output);
  } catch (error) {
    if (output !== undefined) { closeSync(output); output = undefined; }
    if (outputOpened) { receiveFiles(durableRoot, temporary); unlinkSync(temporary); }
    throw error;
  } finally {
    if (input !== undefined) closeSync(input);
    if (output !== undefined) closeSync(output);
  }
  const name = `${date}.${start}-${start + length}.jsonl.gz`, target = `${directory}/${name}`;
  receiveFiles(durableRoot, temporary, target);
  renameSync(temporary, target);
  if (durableRoot !== undefined) syncFileDurablySync(target, { durableRoot });
  return { name, start, end: start + length };
}

/** Seal `date` in a log `directory` whose listing is `names`: its open file (or one an earlier run renamed)
 *  becomes the next segment, and the uncompressed copy is removed. Returns the segment written, or null. */
export function sealDay(directory, names, date, { durableRoot } = {}) {
  const open = `${directory}/${date}.jsonl`, sealing = `${open}.sealing`;
  receiveFiles(durableRoot, open, sealing);
  const sizeOf = (file) => {
    let fd;
    try {
      if (durableRoot === undefined) return statSync(file).size;
      fd = openRead(file, durableRoot); return fstatSync(fd).size;
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    finally { if (fd !== undefined) closeSync(fd); }
  };
  if (sizeOf(sealing) === null) {
    if (sizeOf(open) === null) return null;
    receiveFiles(durableRoot, open, sealing);
    renameSync(open, sealing);
    if (durableRoot !== undefined) syncFileDurablySync(sealing, { durableRoot });
  }
  const segments = segmentsOf(names, date), size = sizeOf(sealing), last = segments.at(-1);
  // A run that wrote this sealing file's segment, then stopped before removing it: the last segment holds the
  // sealing file's bytes (terminated, so at most one byte longer).
  if (last && size > 0 && (last.end - last.start === size || last.end - last.start === size + 1) && holds(`${directory}/${last.name}`, sealing, size, durableRoot)) {
    receiveFiles(durableRoot, sealing);
    unlinkSync(sealing);
    return null;
  }
  const segment = size > 0 ? writeSegment(directory, date, sealing, last?.end ?? 0, { durableRoot }) : null;
  receiveFiles(durableRoot, sealing);
  unlinkSync(sealing);
  return segment;
}

/** Whether a segment's first `size` uncompressed bytes are the file's bytes. */
function holds(segment, file, size, durableRoot) {
  receiveFiles(durableRoot, segment, file);
  const fd = openRead(file, durableRoot);
  try {
    let at = 0;
    for (const data of blocks(segment, durableRoot)) {
      const want = Math.min(data.length, size - at);
      if (want <= 0) break;
      const copy = Buffer.alloc(want);
      if (readSync(fd, copy, 0, want, at) !== want || !copy.equals(data.subarray(0, want))) return false;
      at += want;
    }
    return at === size;
  } finally { closeSync(fd); }
}
