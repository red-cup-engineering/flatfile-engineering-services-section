/**
 * Admit JSONL files an earlier release left behind into a journal, once. The files are read only,
 * in order, under the journal's writer lock (`<root>/.lock`, the lock `withDirectoryLock` and the
 * ledger journals' `exclusively` both take), and a record whose identity the journal held before
 * the admission began is skipped; repeats within a file are admitted, as the file recorded them.
 * A marker in the journal (`jsonl-admission.json` by default, written with `wx`) records the
 * counts, so the admission never repeats and a second process waiting on the lock finds it done.
 *
 * `journal` is `{ root, record(category, record), read(category) }`; `sources` is a list of
 * `{ path, category }`, and a missing file is passed over; `mode` sets the marker's file mode. Call
 * it outside the journal's lock.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withDirectoryLock } from "./journal/filesystem/directory-lock.mjs";

export const JSONL_ADMISSION_MARKER = "jsonl-admission.json";
const recordId = (record) => (typeof record?.id === "string" ? record.id : undefined);

export function admitJsonlOnce(journal, sources, { identity = recordId, marker = JSONL_ADMISSION_MARKER, type = "JsonlAdmission", from, mode } = {}) {
  if (typeof journal?.root !== "string" || typeof journal.record !== "function" || typeof journal.read !== "function") {
    throw new TypeError("admitJsonlOnce needs a journal with root, record(category, record) and read(category)");
  }
  if (!Array.isArray(sources) || sources.some((source) => typeof source?.path !== "string" || typeof source?.category !== "string")) {
    throw new TypeError("admitJsonlOnce sources are { path, category } entries");
  }
  const root = resolve(journal.root);
  const markerPath = join(root, marker);
  if (existsSync(markerPath)) return { admitted: false, counts: null };
  return withDirectoryLock(root, () => {
    if (existsSync(markerPath)) return { admitted: false, counts: null };
    const counts = {};
    for (const { path, category } of sources) {
      if (!existsSync(path)) continue;
      const held = new Set(journal.read(category).map(identity).filter((id) => id !== undefined));
      let admitted = 0;
      for (const line of readFileSync(path, "utf8").split("\n")) {
        if (!line.trim()) continue;
        const record = JSON.parse(line);
        const id = identity(record);
        if (id !== undefined && held.has(id)) continue;
        journal.record(category, record);
        admitted += 1;
      }
      counts[category] = (counts[category] ?? 0) + admitted;
    }
    writeFileSync(markerPath, `${JSON.stringify({ type, version: 1, ...(from === undefined ? {} : { from }), at: new Date().toISOString(), counts })}\n`, { flag: "wx", ...(mode === undefined ? {} : { mode }) });
    return { admitted: true, counts };
  });
}
