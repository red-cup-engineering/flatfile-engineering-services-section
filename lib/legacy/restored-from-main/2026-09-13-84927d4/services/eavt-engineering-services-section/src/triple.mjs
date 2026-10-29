import { encodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { canonicalCborToNiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { requireJsonValue } from "@red-cup-engineering/computer-data-engine/json";
import { assertRow } from "./eavt.mjs";
import { assertObjectDatom } from "./datom.mjs";

/** @param {unknown} value Candidate `{s,p,o}` triple. @returns {object} Admitted triple. */
export function assertTriple(value) {
  const record = requireJsonValue(value, "triple");
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new TypeError("triple must be a JSON object");
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "o,p,s") throw new TypeError(`triple must be exactly {s,p,o}, got ${keys.join(",")}`);
  return Object.freeze({ s: record.s, p: record.p, o: record.o });
}
/** @param {unknown} value Triple. @returns {string} Canonical-CBOR NI identity. */
export const tripleId = (value) => canonicalCborToNiUri(encodeCanonical(assertTriple(value)));
/** @param {readonly unknown[]} values Triples. @returns {object[]} Deduplicated triples. */
export function dedupeTriples(values) { const seen = new Set(); return values.map(assertTriple).filter((triple) => { const id = tripleId(triple); if (seen.has(id)) return false; seen.add(id); return true; }); }
/** @param {object} row EAVT row. @returns {object} Plain triple. */
export function tripleFromEavt(row) { const admitted = assertRow(row); return Object.freeze({ s: admitted.e, p: admitted.a, o: admitted.v }); }
/** @param {unknown} datom Explicit event. @returns {object} Plain triple. */
export function tripleFromDatom(datom) { const admitted = assertObjectDatom(datom); return Object.freeze({ s: admitted.e, p: admitted.a, o: admitted.v }); }
