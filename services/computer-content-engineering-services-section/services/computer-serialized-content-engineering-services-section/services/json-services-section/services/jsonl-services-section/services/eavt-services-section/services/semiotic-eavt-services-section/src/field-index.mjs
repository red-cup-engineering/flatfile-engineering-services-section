import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { parseJournalWitness } from "./journal/event.mjs";
import { segmentPath } from "./journal/filesystem/segment-store.mjs";
import { kindFeedsGrew, tailKindFeeds } from "./journal/filesystem/feed-tail.mjs";
import { withDirectoryLock } from "./journal/filesystem/directory-lock.mjs";
import { journalDirectoryOf, journalIndexDirectory } from "./journal/store-root.mjs";
import { semanticRecordOf } from "./query-semantic-records.mjs";

const LAYOUT = 1;
const SHARDS = 256;

/**
 * A field path: dot-separated names, `[*]` after a name for each member of an array
 * (`sourceId`, `book.enterprise`, `sourceRefs[*]`, `legs[*].account`).
 */
function pathReader(path) {
  if (typeof path !== "string" || !/^[^.[\]]+(\[\*\])?(\.[^.[\]]+(\[\*\])?)*$/u.test(path)) throw new TypeError(`field path is malformed: ${path}`);
  const steps = path.split(".").map((step) => (step.endsWith("[*]") ? { name: step.slice(0, -3), each: true } : { name: step, each: false }));
  return (record) => {
    let values = [record];
    for (const { name, each } of steps) {
      const next = [];
      for (const value of values) {
        if (value === null || typeof value !== "object" || !Object.hasOwn(value, name)) continue;
        const member = value[name];
        if (each) { if (Array.isArray(member)) next.push(...member); } else next.push(member);
      }
      values = next;
    }
    return values;
  };
}

/** The key a field value is indexed under: text as is, other scalars as their text, structures canonically. */
function keyOf(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return canonicalJson(value);
}

const shardOf = (field, key) => createHash("sha256").update(field).update("\0").update(key).digest("hex").slice(0, 2);

function readBytes(file, offset, length) {
  const descriptor = openSync(file, "r"), buffer = Buffer.alloc(length);
  try {
    let read = 0;
    while (read < length) {
      const bytes = readSync(descriptor, buffer, read, length - read, offset + read);
      if (bytes === 0) break;
      read += bytes;
    }
    if (read < length) throw new TypeError(`${file} ended inside a witness the field index locates`);
    return buffer;
  } finally { closeSync(descriptor); }
}

/**
 * Bounded point reads by key over one category of a semantic record journal.
 *
 * `fields` names what to index: `{ name: path }` (see pathReader) or `{ name: (record) => value(s) }`.
 * The index is a derived reading of the journal and never a source of it: for each indexed key it
 * keeps where the witnesses holding it lie (feed, byte offset, length), appended as the journal's
 * feeds grow and sharded by key, under the journal's own directory. A read takes one shard and
 * decodes and verifies only the witnesses it names, so the journal's bodies are never all held
 * in memory; `has` decodes nothing. A feed that shrank (a rewritten segment) rebuilds the index
 * from the journal; each field declaration keeps its own index. Legacy SEAVT feed rows (before records were
 * witnesses) are not indexed.
 */
export function createFieldIndex({ root, objectKind, category, fields } = {}) {
  if (typeof root !== "string" || !root || typeof objectKind !== "string" || !objectKind || typeof category !== "string" || !category)
    throw new TypeError("field index root, objectKind and category are required");
  if (fields === null || typeof fields !== "object" || Object.keys(fields).length === 0) throw new TypeError("field index fields are required");
  const readers = new Map(Object.entries(fields).map(([name, path]) => {
    if (typeof path === "function") return [name, (record) => [].concat(path(record) ?? [])];
    return [name, pathReader(path)];
  }));
  const declaration = canonicalJson(Object.entries(fields).map(([name, path]) => [name, typeof path === "function" ? `function:${path.toString()}` : path]).sort());
  const store = journalDirectoryOf(resolve(root));
  // Each declaration keeps its own reading, so two readers declaring different fields never rebuild each other's.
  const directory = join(journalIndexDirectory(store), "field", "v1", encodeURIComponent(objectKind), encodeURIComponent(category), createHash("sha256").update(declaration).digest("hex").slice(0, 16));
  const cursorFile = join(directory, "cursor.json");
  const shardFile = (field, shard) => join(directory, encodeURIComponent(field), `${shard}.jsonl`);
  const readCursor = () => {
    try {
      const cursor = JSON.parse(readFileSync(cursorFile, "utf8"));
      return cursor.layout === LAYOUT && cursor.declaration === declaration ? cursor : null;
    } catch (error) { if (error.code === "ENOENT" || error instanceof SyntaxError) return null; throw error; }
  };
  const stale = (cursor) => cursor === null || kindFeedsGrew(store, objectKind, cursor.feeds);

  function catchUp() {
    withDirectoryLock(directory, () => {
      let cursor = readCursor();
      const rebuild = () => {
        for (const field of readers.keys()) rmSync(join(directory, encodeURIComponent(field)), { recursive: true, force: true });
        cursor = { layout: LAYOUT, declaration, feeds: {} };
      };
      if (cursor === null) rebuild();
      const pending = new Map();
      const visit = ({ line, offset, length, feed }) => {
        let witness;
        try { witness = JSON.parse(line); } catch { return; }
        if (typeof witness?.id !== "string" || witness.observation === undefined) return;
        // Keys are read from the line as written; every read verifies the witness it decodes.
        let projected;
        try { projected = semanticRecordOf({ id: witness.id, observation: witness.observation }); } catch { return; }
        if (projected === undefined || projected.category !== category) return;
        for (const [field, read] of readers) {
          for (const value of read(projected.record)) {
            const key = keyOf(value);
            if (key === undefined) continue;
            const file = shardFile(field, shardOf(field, key));
            if (!pending.has(file)) pending.set(file, []);
            pending.get(file).push(JSON.stringify([key, witness.id, feed, offset, length]));
          }
        }
      };
      let read = tailKindFeeds({ store, objectKind, positions: cursor.feeds, visit });
      if (read.reset) { rebuild(); pending.clear(); read = tailKindFeeds({ store, objectKind, positions: cursor.feeds, visit }); }
      cursor.feeds = read.positions;
      for (const [file, lines] of pending) {
        mkdirSync(join(file, ".."), { recursive: true });
        appendFileSync(file, `${lines.join("\n")}\n`);
      }
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${cursorFile}.${process.pid}.tmp`, JSON.stringify(cursor));
      renameSync(`${cursorFile}.${process.pid}.tmp`, cursorFile);
    });
  }
  const current = () => { if (stale(readCursor())) catchUp(); };

  function locations(field, value) {
    if (!readers.has(field)) throw new TypeError(`field index does not index ${field}`);
    const key = keyOf(value);
    if (key === undefined) return [];
    current();
    const file = shardFile(field, shardOf(field, key));
    if (!existsSync(file)) return [];
    const seen = new Set(), found = [];
    for (const line of readFileSync(file, "utf8").split("\n")) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (!Array.isArray(entry) || entry[0] !== key || seen.has(entry[1])) continue;
      seen.add(entry[1]);
      found.push({ event: entry[1], log: entry[2], offset: entry[3], length: entry[4] });
    }
    return found;
  }
  function decode({ event, log, offset, length }) {
    const witness = parseJournalWitness(JSON.parse(readBytes(segmentPath(join(store, log)), offset, length).toString("utf8")));
    if (witness.id !== event) throw new TypeError(`the field index locates ${event} where ${witness.id} lies`);
    const record = semanticRecordOf(witness);
    return Object.freeze({ ...record, objectKind, record: structuredClone(record.record) });
  }

  return Object.freeze({
    root: resolve(root), objectKind, category,
    /** The records of this category whose `field` holds `value`, in the order the journal admitted them. */
    get(field, value) {
      try { return Object.freeze(locations(field, value).map(decode)); }
      catch (error) {
        if (!(error instanceof TypeError) || !/locates|ended inside/u.test(error.message)) throw error;
        // A segment rewritten under the index: rebuild from the journal once and read again.
        withDirectoryLock(directory, () => rmSync(cursorFile, { force: true }));
        return Object.freeze(locations(field, value).map(decode));
      }
    },
    /** The last record whose `field` holds `value`, or undefined. */
    latest(field, value) {
      const found = locations(field, value);
      return found.length === 0 ? undefined : decode(found.at(-1));
    },
    /** Whether any record's `field` holds `value`, read from the index alone. */
    has: (field, value) => locations(field, value).length > 0,
    /** How many records' `field` holds `value`, read from the index alone. */
    count: (field, value) => locations(field, value).length,
    /** Bring the index up to the journal now (reads do this themselves). */
    refresh: () => current(),
  });
}
