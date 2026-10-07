import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** The words of a text: lowercase letter-and-digit runs. */
export function words(text) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The layout this module writes; a file of another layout is a stale cache, rebuilt empty. */
const LAYOUT = 1;

/**
 * An archive's full text, held for ranked search: an SQLite FTS5 inverted index ranked by
 * BM25 (k1 1.2, b 0.75), with the revision each document was indexed at. Words are
 * letter-and-digit runs, folded to lower case, diacritics kept. A query matches documents
 * holding every one of its words, best first.
 *
 * `file` keeps the index between processes, so a reopened archive reindexes only documents
 * whose revision changed; ":memory:" keeps it for this process only. Either way the index is
 * a replaceable reading of the archive's files, never a source of them: its owner tells it
 * which revision each document is at and gives it the text of those that moved.
 */
export function openFullTextIndex({ file = ":memory:" } = {}) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  if (db.prepare("PRAGMA user_version").get().user_version !== LAYOUT) {
    db.exec(`DROP TABLE IF EXISTS documents; DROP TABLE IF EXISTS texts;
      CREATE TABLE documents (id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE, revision TEXT NOT NULL);
      CREATE VIRTUAL TABLE texts USING fts5(body, tokenize = 'unicode61 remove_diacritics 0');
      PRAGMA user_version = ${LAYOUT};`);
  }
  const held = new Map(db.prepare("SELECT path, id, revision FROM documents").all().map((row) => [row.path, { id: row.id, revision: row.revision }]));
  const insertDocument = db.prepare("INSERT INTO documents (path, revision) VALUES (?, ?)");
  const reviseDocument = db.prepare("UPDATE documents SET revision = ? WHERE id = ?");
  const deleteDocument = db.prepare("DELETE FROM documents WHERE id = ?");
  const insertText = db.prepare("INSERT INTO texts (rowid, body) VALUES (?, ?)");
  const deleteText = db.prepare("DELETE FROM texts WHERE rowid = ?");
  const ranked = db.prepare(`SELECT documents.path AS path, -bm25(texts) AS score FROM texts
    JOIN documents ON documents.id = texts.rowid WHERE texts MATCH ? ORDER BY bm25(texts) LIMIT ?`);

  function put(path, revision, text) {
    const known = held.get(path);
    if (known) {
      deleteText.run(known.id);
      reviseDocument.run(revision, known.id);
      insertText.run(known.id, text);
      held.set(path, { id: known.id, revision });
    } else {
      const id = Number(insertDocument.run(path, revision).lastInsertRowid);
      insertText.run(id, text);
      held.set(path, { id, revision });
    }
  }
  function remove(path) {
    const known = held.get(path);
    if (!known) return;
    deleteText.run(known.id);
    deleteDocument.run(known.id);
    held.delete(path);
  }
  return Object.freeze({
    /** The revision `path` was indexed at, or undefined. */
    revisionOf: (path) => held.get(path)?.revision,
    /** Every indexed path. */
    paths: () => [...held.keys()],
    /** Apply changes atomically: `change` receives `put(path, revision, text)` and `remove(path)`. */
    revise(change) {
      db.exec("BEGIN");
      try { change({ put, remove }); db.exec("COMMIT"); }
      catch (error) { db.exec("ROLLBACK"); held.clear(); for (const row of db.prepare("SELECT path, id, revision FROM documents").all()) held.set(row.path, { id: row.id, revision: row.revision }); throw error; }
    },
    /** Documents holding every word of the query, best first by BM25. */
    search(query, { limit = 25 } = {}) {
      const terms = [...new Set(words(query))];
      if (terms.length === 0 || limit === 0) return [];
      return ranked.all(terms.map((term) => `"${term}"`).join(" "), limit).map((row) => Object.freeze({ path: row.path, score: row.score }));
    },
    get size() { return held.size; },
    close() { db.close(); },
  });
}
