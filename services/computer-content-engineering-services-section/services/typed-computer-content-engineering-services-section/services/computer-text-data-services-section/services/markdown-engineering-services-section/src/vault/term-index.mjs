import { get, heads, put, writeHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** The words of a text: lowercase letter-and-digit runs, diacritics kept. */
export function words(text) {
  return String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The store type a document's word counts are held under. */
export const TERM_DOCUMENT_TYPE = "vault-term-document";
/** The bytes of word counts one record holds; a document with more continues in further records. */
const PART_BYTES = 32 * 1024;

/** A word-count map as lines `word<TAB>count`, in code-point order, and back. */
const countsLines = (counts) => [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)).map(([term, count]) => `${term}\t${count}`);
function countsOf(lines) {
  const counts = new Map();
  for (const line of lines) {
    const tab = line.lastIndexOf("\t");
    const count = Number(line.slice(tab + 1));
    if (tab < 1 || !Number.isInteger(count) || count < 1) throw new TypeError("term index counts are word<TAB>count lines");
    counts.set(line.slice(0, tab), count);
  }
  return counts;
}

/** A document's counts as the parts that carry them: each at most `PART_BYTES` of lines. */
function partsOf(counts) {
  const parts = [[]];
  let bytes = 0;
  for (const line of countsLines(counts)) {
    const size = Buffer.byteLength(line) + 1;
    if (bytes + size > PART_BYTES && parts.at(-1).length > 0) { parts.push([]); bytes = 0; }
    parts.at(-1).push(line);
    bytes += size;
  }
  return parts;
}

/**
 * A term index: ranked word search over keyed documents, a reading the feature that searches owns.
 *
 * Each document is held in the store as the records of its word counts (never its text), and the head
 * of the type named by its key lists them: a document's revision replaces its head, and a removal
 * closes it with no records. Postings, document lengths and revisions are read from the heads when the
 * index opens and kept current as documents are revised. Without `root` the index lives for the process.
 *
 * Ranking is Okapi BM25 (`k1` 1.2, `b` 0.75, the inverse document frequency floored just above zero for
 * words most documents hold); a query matches the documents holding every one of its words, best first,
 * ties by key. `tokenize` decides what a word is (default: lowercase letter-and-digit runs, diacritics kept).
 */
export function createTermIndex({ root, tokenize = words, k1 = 1.2, b = 0.75 } = {}) {
  const kept = root === undefined || root === null ? null : root;
  const documents = new Map();     // key -> { revision, length, counts: Map<word, count> }
  const postings = new Map();      // word -> Set<key>
  let totalLength = 0;

  function drop(key) {
    const held = documents.get(key);
    if (!held) return;
    for (const term of held.counts.keys()) {
      const keys = postings.get(term);
      keys.delete(key);
      if (keys.size === 0) postings.delete(term);
    }
    totalLength -= held.length;
    documents.delete(key);
  }
  function hold({ key, revision, length, counts }) {
    drop(key);
    documents.set(key, { revision, length, counts });
    for (const term of counts.keys()) {
      const keys = postings.get(term);
      if (keys) keys.add(key); else postings.set(term, new Set([key]));
    }
    totalLength += length;
  }
  if (kept !== null) {
    for (const { head } of heads(kept, TERM_DOCUMENT_TYPE)) {
      if (head.frontier.length === 0) continue;
      const records = head.frontier.map((address) => {
        const record = get(kept, TERM_DOCUMENT_TYPE, address);
        if (record === undefined) throw new TypeError(`a term index document part is absent: ${address}`);
        return record;
      }).sort((left, right) => left.part - right.part);
      const { key, revision, length } = records[0];
      hold({ key, revision, length, counts: countsOf(records.flatMap((record) => record.counts)) });
    }
  }

  function measure(text) {
    const counts = new Map();
    let length = 0;
    for (const term of tokenize(text)) {
      if (term === "" || /[\t\n]/u.test(term)) throw new TypeError("a term index word is not empty and holds no tab or line break");
      counts.set(term, (counts.get(term) ?? 0) + 1);
      length += 1;
    }
    return { length, counts };
  }

  /** A key's BM25 score over the terms it holds of `terms`. */
  function scoreOf(key, terms) {
    const document = documents.get(key), count = documents.size, average = totalLength / count;
    const norm = k1 * (1 - b + (b * document.length) / average);
    let score = 0;
    for (const term of terms) {
      const frequency = document.counts.get(term);
      if (!frequency) continue;
      const weight = Math.max(Math.log((count - postings.get(term).size + 0.5) / (postings.get(term).size + 0.5)), 1e-6);
      score += (weight * frequency * (k1 + 1)) / (frequency + norm);
    }
    return score;
  }

  return Object.freeze({
    /** The revision `key` was indexed at, or undefined. */
    revisionOf: (key) => documents.get(key)?.revision,
    /** Every indexed key. */
    keys: () => [...documents.keys()],
    /**
     * Apply changes together: `change` receives `put(key, revision, text)` and `remove(key)`;
     * the last change to a key is the one kept. Nothing is recorded or read differently when
     * `change` throws.
     */
    revise(change) {
      const last = new Map();
      change({
        put(key, revision, text) {
          if (typeof key !== "string" || key === "") throw new TypeError("a term index key is a non-empty string");
          last.delete(key);
          last.set(key, { key, revision: String(revision), ...measure(text) });
        },
        remove(key) {
          last.delete(key);
          last.set(key, { key, removed: true });
        },
      });
      const puts = [...last.values()].filter((document) => !document.removed);
      const removals = [...last.values()].filter((document) => document.removed && documents.has(document.key));
      if (kept !== null) {
        for (const { key, revision, length, counts } of puts) {
          const parts = partsOf(counts);
          const frontier = parts.map((lines, part) => put(kept, TERM_DOCUMENT_TYPE, { key, revision, length, part, parts: parts.length, counts: lines }));
          writeHead(kept, TERM_DOCUMENT_TYPE, key, { frontier });
        }
        for (const { key } of removals) writeHead(kept, TERM_DOCUMENT_TYPE, key, { frontier: [], closed: true });
      }
      for (const { key } of removals) drop(key);
      for (const document of puts) hold(document);
    },
    /** Keys whose documents hold every word of the query, best first by BM25. */
    search(query, { limit = 25 } = {}) {
      const terms = [...new Set(tokenize(query))];
      if (terms.length === 0 || limit === 0 || documents.size === 0) return [];
      const sets = terms.map((term) => postings.get(term));
      if (sets.some((keys) => keys === undefined)) return [];
      sets.sort((left, right) => left.size - right.size);
      const hits = [];
      for (const key of sets[0]) if (sets.every((keys) => keys.has(key))) hits.push({ key, score: scoreOf(key, terms) });
      return hits
        .sort((left, right) => right.score - left.score || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
        .slice(0, limit).map((hit) => Object.freeze(hit));
    },
    get size() { return documents.size; },
    /** The store root the index reads from and records to, or null in memory. */
    get root() { return kept; },
  });
}
