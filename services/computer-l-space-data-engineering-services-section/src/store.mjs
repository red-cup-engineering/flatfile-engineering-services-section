// The L-Space store: marks kept by address alone.
//
// Every mark lives in the JSONL bucket its address computes (ni-path-v1, e.g. sha-256/AB.jsonl) under
// data/records/l-space-records/ of the store's root, one line {"id": address, "value": value}. Nothing else is
// needed to find a mark — no type, no index — and every value read back is checked against its address. The
// store only appends; a mark written twice is kept once.
import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { isAddress } from "./l-space.mjs";

export const RECORDS = join("data", "records", "l-space-records");
const CACHED_BUCKETS = 64;

/** Yields a bucket's marks as [address, value], refusing any value that does not have its stated address. */
function* parseBucket(text, path, { verify = true } = {}) {
  for (const [index, line] of text.split("\n").entries()) {
    if (line === "") continue;
    const { id, value } = JSON.parse(line);
    if (verify && semanticId(value) !== id) throw new Error(`${path}:${index + 1}: value does not have address ${id}`);
    yield [id, value];
  }
}

async function bucketText(file) {
  try { return await readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return ""; throw error; }
}

/**
 * Opens the store rooted at `root`.
 * @param {string} root The directory holding data/records/l-space-records.
 */
export function openSpace(root) {
  const records = join(root, RECORDS);
  const known = new Map(); // bucket path -> Set(address): what the bucket holds, for keeping each mark once
  const cached = new Map(); // bucket path -> Map(address -> value), the most recently read buckets
  const pending = new Map(); // bucket path -> Map(address -> value) not yet appended

  async function addresses(path) {
    let set = known.get(path);
    if (!set) {
      set = new Set();
      for (const [id] of parseBucket(await bucketText(join(records, path)), path, { verify: false })) set.add(id);
      known.set(path, set);
    }
    return set;
  }

  async function bucket(path) {
    let marks = cached.get(path);
    if (marks) { cached.delete(path); cached.set(path, marks); return marks; }
    marks = new Map(parseBucket(await bucketText(join(records, path)), path));
    cached.set(path, marks);
    if (cached.size > CACHED_BUCKETS) cached.delete(cached.keys().next().value);
    return marks;
  }

  return Object.freeze({
    root,
    /** Keeps a mark ({address, value}); true when it was not already kept. */
    async put({ address, value }) {
      if (!isAddress(address) || semanticId(value) !== address) throw new Error(`value does not have address ${address}`);
      const path = niBucketPath(address), set = await addresses(path);
      if (set.has(address)) return false;
      set.add(address);
      if (!pending.has(path)) pending.set(path, new Map());
      pending.get(path).set(address, value);
      return true;
    },
    /** The value at an address, or undefined when the store holds no such mark. */
    async get(address) {
      if (!isAddress(address)) throw new TypeError(`not an address: ${address}`);
      const path = niBucketPath(address);
      return pending.get(path)?.get(address) ?? (await bucket(path)).get(address);
    },
    async has(address) { return (await this.get(address)) !== undefined; },
    /** Appends every mark kept since the last flush. */
    async flush() {
      for (const [path, marks] of pending) {
        await mkdir(dirname(join(records, path)), { recursive: true });
        await appendFile(join(records, path), [...marks].map(([id, value]) => JSON.stringify({ id, value }) + "\n").join(""));
        cached.delete(path);
      }
      pending.clear();
    },
    /**
     * Every mark the store holds, as {address, value}, one bucket at a time.
     * @param {{verify?: boolean}} [options] verify: false skips rechecking each value's address (a trusted rebuild).
     */
    async *each({ verify = true } = {}) {
      let algorithms;
      try { algorithms = await readdir(records); } catch (error) { if (error.code === "ENOENT") return; throw error; }
      for (const algorithm of algorithms.sort()) {
        for (const file of (await readdir(join(records, algorithm))).sort()) {
          const path = `${algorithm}/${file}`;
          for (const [address, value] of parseBucket(await bucketText(join(records, path)), path, { verify })) yield { address, value };
        }
      }
    },
  });
}
