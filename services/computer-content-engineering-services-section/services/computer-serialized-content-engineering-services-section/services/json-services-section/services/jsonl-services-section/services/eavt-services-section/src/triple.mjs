/** Plain `{s, p, o}` triples projected from EAVT rows or object datoms by
 *  dropping time and operation. */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { assertObjectDatom } from "@red-cup-engineering/datom-services-section";
import { eavtRecord } from "./row.mjs";

/** Admit a value as a `{s, p, o}` triple, or throw. */
export function assertTriple(value) {
  const json = requireJsonValue(value, "triple");
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError("triple must be a JSON object");
  const keys = Object.keys(json).sort();
  if (keys.join(",") !== "o,p,s") throw new TypeError(`triple must be exactly {s,p,o}, got ${keys.join(",")}`);
  return Object.freeze({ s: json.s, p: json.p, o: json.o });
}

/** A triple's content identity. */
export function tripleId(value) {
  return semanticId(assertTriple(value));
}

/** Triples with duplicates by content identity removed, first kept. */
export function dedupeTriples(values) {
  const seen = new Set();
  const triples = [];
  for (const value of values) {
    const triple = assertTriple(value);
    const id = tripleId(triple);
    if (seen.has(id)) continue;
    seen.add(id);
    triples.push(triple);
  }
  return triples;
}

/** The triple an EAVT row states. */
export function tripleFromEavt(value) {
  const row = eavtRecord(value);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}

/** The triple an object datom states. */
export function tripleFromDatom(value) {
  const datom = assertObjectDatom(value);
  return Object.freeze({ s: datom.e, p: datom.a, o: datom.v });
}
