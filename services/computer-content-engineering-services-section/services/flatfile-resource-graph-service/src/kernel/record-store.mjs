import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataKindDirectory } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

// A SEAVT journal row's v coordinate is only ever a record's own
// content-identity id (the semiotic EAVT module's seavtOfJson() call sites in
// operator/edit.mjs) — the row itself never carries before_digest/
// after_digest/details/kind/four_before/four_after. PyFARS's
// kernel/seavt.py avoids needing anywhere else to hold that fuller body
// by nesting the whole record under a "record" key on every journal line
// it writes; FARS's Node realization cannot do the same nesting without either widening
// the installed journal-log package's appendSeavt() past the strict
// {e,a,v,t} shape it normalizes every row to (asSeavt/asEntry silently
// drop anything else) or reimplementing that package's own file-append
// law locally — both foreclosed by the composition-boundary discipline
// the semiotic EAVT row admission and journal already enforce elsewhere in
// this codebase. This module is the "second, separate content store"
// that same discipline leaves as the other side of that tradeoff: a
// record's id resolves here to its full body, durably, once appended —
// the read path a projector (or anything else needing a witness's real
// before/after state, not merely its hash) actually needs.
//
// One JSON file per record, named by its own id, under
// <root>/data/records/resource-graph-records/ (eavt `dataKindDirectory`). Write-once by convention (a record's id is its
// own content hash, so a second write of the same id is always the same
// bytes); this module does not itself refuse a second write.

function recordFile(root, id) {
  // This is a filesystem filename codec, not a serialized SEAVT coordinate.
  return path.join(dataKindDirectory(root, "record", "resource-graph"), `${Buffer.from(id, "utf8").toString("base64url")}.json`);
}

export function putRecord(root, record) {
  const file = recordFile(root, record.id);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(record), "utf8");
  return file;
}

export function getRecord(root, id) {
  const file = recordFile(root, id);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

