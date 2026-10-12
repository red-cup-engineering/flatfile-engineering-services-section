import { createTermIndex, words } from "./term-index.mjs";
import { assertLegacyIndexAbsent } from "./index-carrier.mjs";

export { words };

/**
 * An archive's full text, held for ranked search: a term index over the semiotic-eavt store
 * (`./term-index.mjs`), ranked by BM25 (k1 1.2, b 0.75), with the revision each
 * document was indexed at. Words are letter-and-digit runs, folded to lower case, diacritics
 * kept. A query matches documents holding every one of its words, best first.
 *
 * `root` is the store the index keeps between processes, so a reopened archive reindexes only
 * documents whose revision changed; without it the index lives for this process. `file` is the
 * earlier form, an SQLite index file: its store is kept beside it (`<file>.journal`), and an
 * unresolved earlier file or SQLite sidecar refuses before the store is opened or created.
 * Historical SQL admission is separately enrolled; native opening never converts old bytes. Either way the index is a replaceable reading
 * of the archive's files, never a source of them: its owner tells it which revision each
 * document is at and gives it the text of those that moved.
 */
export function openFullTextIndex({ root, file } = {}) {
  assertLegacyIndexAbsent(file);
  const journalRoot = root ?? (file && file !== ":memory:" ? `${file}.journal` : undefined);
  const index = createTermIndex({ root: journalRoot });
  return Object.freeze({
    /** The revision `path` was indexed at, or undefined. */
    revisionOf: (path) => index.revisionOf(path),
    /** Every indexed path. */
    paths: () => index.keys(),
    /** Apply changes together: `change` receives `put(path, revision, text)` and `remove(path)`. */
    revise: (change) => index.revise(change),
    /** Documents holding every word of the query, best first by BM25. */
    search: (query, { limit = 25 } = {}) => index.search(query, { limit }).map((hit) => Object.freeze({ path: hit.key, score: hit.score })),
    get size() { return index.size; },
    /** The store the index is kept in, or null when it lives for this process. */
    get root() { return index.root; },
    close() {},
  });
}
