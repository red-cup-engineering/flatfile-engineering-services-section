/**
 * @module zip-archive
 * Reading a ZIP archive (APPNOTE 6.3.x): its entries from the central directory, and one entry's
 * bytes, stored or deflated. A pure reading of bytes already in memory; fetching or opening the
 * archive is the caller's effect. ZIP64, encryption and split archives are refused by name.
 */
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

function endOfCentralDirectory(bytes) {
  const floor = Math.max(0, bytes.length - 22 - 0xffff);
  for (let at = bytes.length - 22; at >= floor; at -= 1) {
    if (bytes.readUInt32LE(at) === EOCD) return at;
  }
  throw new Error("not a ZIP archive: no end-of-central-directory record");
}

/** The archive's entries: name, compression method, sizes, and where each one's local header is. */
export function zipEntries(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const end = endOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(end + 10);
  const size = buffer.readUInt32LE(end + 12);
  const offset = buffer.readUInt32LE(end + 16);
  if (offset === 0xffffffff || count === 0xffff) throw new Error("ZIP64 archives are not read");
  const entries = [];
  let at = offset;
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(at) !== CENTRAL) throw new Error(`central directory entry ${i} is malformed`);
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const uncompressedSize = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.toString(flags & 0x800 ? "utf8" : "latin1", at + 46, at + 46 + nameLength);
    entries.push(Object.freeze({ name, method, compressedSize, uncompressedSize, localOffset, encrypted: (flags & 1) === 1, directory: name.endsWith("/") }));
    at += 46 + nameLength + extraLength + commentLength;
  }
  if (at - offset !== size) throw new Error("central directory size does not match its entries");
  return Object.freeze(entries);
}

/** One entry's bytes, by name or by entry. */
export function zipEntryBytes(bytes, entryOrName) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const entry = typeof entryOrName === "string" ? zipEntries(buffer).find((e) => e.name === entryOrName) : entryOrName;
  if (!entry) throw new Error(`the archive has no entry ${entryOrName}`);
  if (entry.encrypted) throw new Error(`${entry.name} is encrypted`);
  const at = entry.localOffset;
  if (buffer.readUInt32LE(at) !== LOCAL) throw new Error(`${entry.name}: local header is malformed`);
  const start = at + 30 + buffer.readUInt16LE(at + 26) + buffer.readUInt16LE(at + 28);
  const data = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(data);
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error(`${entry.name}: compression method ${entry.method} is not read`);
}
