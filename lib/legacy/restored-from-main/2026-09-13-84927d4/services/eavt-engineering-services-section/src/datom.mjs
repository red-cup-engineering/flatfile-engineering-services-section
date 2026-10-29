import { encodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { canonicalCborToNiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { requireJsonValue } from "@red-cup-engineering/computer-data-engine/json";

export const ASSERT = "assert";
export const RETRACT = "retract";

/** @param {unknown} value Candidate explicit datom event. @returns {object} Admitted `{e,a,v,tx,op}` event. */
export function assertObjectDatom(value) {
  const record = requireJsonValue(value, "object datom");
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new TypeError("object datom must be a JSON object");
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "a,e,op,tx,v") throw new TypeError(`object datom must be exactly {e,a,v,tx,op}, got ${keys.join(",")}`);
  if (record.op !== ASSERT && record.op !== RETRACT) throw new TypeError(`object datom op must be \"assert\" or \"retract\", got ${JSON.stringify(record.op)}`);
  return Object.freeze({ e: record.e, a: record.a, v: record.v, tx: record.tx, op: record.op });
}

/** @param {unknown} e Entity. @param {unknown} a Attribute. @param {unknown} v Value. @param {unknown} tx Event transaction. @returns {object} Assert event. */
export const assertDatomFact = (e, a, v, tx) => assertObjectDatom({ e, a, v, tx, op: ASSERT });
/** @param {unknown} e Entity. @param {unknown} a Attribute. @param {unknown} v Value. @param {unknown} tx Event transaction. @returns {object} Retract event. */
export const retractDatomFact = (e, a, v, tx) => assertObjectDatom({ e, a, v, tx, op: RETRACT });

/** @param {unknown} value Explicit datom event. @returns {string} Canonical-CBOR NI identity for the event. */
export const objectDatomId = (value) => canonicalCborToNiUri(encodeCanonical(assertObjectDatom(value)));

/** @param {readonly unknown[]} datoms Explicit events. @returns {object[]} Current facts. */
export function currentDatomValue(datoms) {
  const live = new Map();
  for (const value of datoms) {
    const event = assertObjectDatom(value);
    const fact = Object.freeze({ e: event.e, a: event.a, v: event.v });
    const key = canonicalCborToNiUri(encodeCanonical(fact));
    if (event.op === RETRACT) live.delete(key); else live.set(key, fact);
  }
  return [...live.values()];
}

/** @param {readonly unknown[]} datoms Explicit events. @param {unknown} asOf Transaction upper bound. @returns {object[]} Events no later than the bound. */
export function objectDatomsAsOf(datoms, asOf) {
  requireJsonValue(asOf, "datom as-of");
  return datoms.map(assertObjectDatom).filter((event) => String(event.tx) <= String(asOf));
}

/** @param {readonly unknown[]} datoms Explicit events. @returns {object} Paraconsistent cell evidence. */
export function foldObjectDatoms(datoms) {
  const cells = new Map();
  const events = datoms.map(assertObjectDatom);
  for (const event of events) {
    const fact = { e: event.e, a: event.a, v: event.v };
    const key = canonicalCborToNiUri(encodeCanonical(fact));
    const cell = cells.get(key) ?? { event, positive: new Map(), negative: new Map() };
    const evidence = event.op === ASSERT ? cell.positive : cell.negative;
    evidence.set(canonicalCborToNiUri(encodeCanonical(event.tx)), event.tx);
    cells.set(key, cell);
  }
  const result = [...cells.values()].map(({ event, positive, negative }) => Object.freeze({
    subject: event.e, predicate: event.a, object: event.v,
    value: positive.size && negative.size ? "stable" : positive.size ? "potential" : "active",
    evidence: Object.freeze([Object.freeze([...positive.values()]), Object.freeze([...negative.values()])]),
  }));
  return Object.freeze({ datoms: Object.freeze(events), cells: Object.freeze(result) });
}

/** @param {object} section Folded events. @param {object} cell Cell selector. @returns {readonly unknown[]} Assert-side witnesses. */
export function objectDatomWitnesses(section, cell) {
  const subject = "subject" in cell ? cell.subject : cell.e;
  const predicate = "predicate" in cell ? cell.predicate : cell.a;
  const object = "object" in cell ? cell.object : cell.v;
  const key = canonicalCborToNiUri(encodeCanonical({ e: requireJsonValue(subject, "cell subject"), a: requireJsonValue(predicate, "cell predicate"), v: requireJsonValue(object, "cell object") }));
  return section.cells.find((candidate) => canonicalCborToNiUri(encodeCanonical({ e: candidate.subject, a: candidate.predicate, v: candidate.object })) === key)?.evidence[0] ?? Object.freeze([]);
}
