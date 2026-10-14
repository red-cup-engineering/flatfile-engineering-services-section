/**
 * SignCell — the semiotic cell.
 *
 * A cell is an ordered triple (subject, predicate, object): the predicate is a
 * claim, the subject and object are the tokens that bound it. An utterance
 * (token, claim) opens the reflexive cell (token, claim, token). The order is
 * load-bearing: (o, p, s) is a different cell, the converse. This is the RDF
 * 1.1 triple shape.
 *
 * A cell carries its evidence: the marks told for it and the marks told
 * against it, and its value, a point of FOUR (the data layer's four). This is
 * Obsmetrologia's Valued: the evidence's presence (which sides have been told,
 * Belnap's told-true / told-false) is one reading, and the value is another.
 * A cell is Measured when its value is its presence; a carrier with no `value`
 * key is Measured, so a value is written only where it differs from what the
 * evidence shows — after a meet, which keeps every witness while the value
 * falls (absurd reached, witnesses kept), or after a conflation or a
 * presumption (signchain's bilattice).
 *
 * Each evidence side is a grow-only set over canonical content identities,
 * deduplicated and ordered by canonical bytes. Merge is associative,
 * commutative and idempotent on that quotient (a state-based G-Set CRDT per
 * side). Raw representatives need not be identical under input permutation:
 * retaining the last coincident witness is a presentation choice, not another
 * semantic identity. Compare canonical bytes, not raw object equality, when
 * asserting the semilattice laws.
 *
 * A cell's address is the content address of its triple alone — never of its
 * evidence — so identity does not move when evidence arrives. Addresses and
 * coincidence are RFC 6920 ni: names of RFC 8949 canonical CBOR, via
 * `semanticBytes`/`semanticId`.
 *
 * Terms and witnesses are opaque semiotic JSON values; nothing here reads them
 * except to encode them.
 */
import { bytesEqual, bytesToHex, bytesToLatin1, retainedCarrier, coincidenceKey, coincides, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { isReading, knowledgeJoinReading, readingAs, readingOfSides, readingSchema, record, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const present = (value, role) => {
  if (value === undefined) throw new TypeError(`signcell: ${role} must be present`);
  // Text, booleans, null and finite numbers are always carriers; anything else is checked by encoding.
  if (!(typeof value === "string" || typeof value === "boolean" || value === null || Number.isFinite(value))) semanticBytes(value);
  return value;
};

/** Coincidence is content identity, stated once beside the content address. */
export { coincides, coincidenceKey };

/** A deduplicated side of evidence, in canonical byte order. */
function side(witnesses) {
  const byBytes = new Map();
  for (const witness of witnesses) byBytes.set(bytesToHex(semanticBytes(present(witness, "witness"))), witness);
  return retainedCarrier([...byBytes.keys()].sort().map((key) => byBytes.get(key)));
}

/** The reading the sides alone show, in the knowledge family (Valued.presence). */
const presenceOfSides = (told, denied) => readingOfSides("knowledge", told.length > 0, denied.length > 0);

/** The value to write beside two sides: none when it is their presence (Measured), else its knowledge name. */
function written(value, told, denied) {
  if (value === undefined) return {};
  if (!isReading(value)) throw new TypeError(`signcell: a value is a reading of FOUR, not ${JSON.stringify(value)}`);
  const name = readingAs("knowledge", value);
  return name === presenceOfSides(told, denied) ? {} : { value: name };
}

/** An evidence pair on its own: the witnesses told for and against, each side a
 *  deduplicated set in canonical byte order, with its value when that is not its presence.
 *  A cell is a triple with one of these. */
export const evidence = ({ for: told = [], against: denied = [], value } = {}) => {
  const [forSide, againstSide] = [side(told), side(denied)];
  return retainedCarrier({ for: forSide, against: againstSide, ...written(value, forSide, againstSide) });
};

/** A cell's evidence (or a bare pair's) as a bare evidence pair, its value kept. */
export const evidenceOf = (value) => evidence({ for: value.for, against: value.against, value: value.value });

/** Whether a value carries evidence sides (a cell or a bare evidence pair). */
export const hasEvidence = (value) => value !== null && typeof value === "object" && Array.isArray(value.for) && Array.isArray(value.against);

// Cells this module made: their terms are carriers and their sides canonical, so admitting one again
// yields the same cell.
const admitted = new WeakSet();
function made(subject, predicate, object, told, denied, reading) {
  const [forSide, againstSide] = [side(told), side(denied)];
  const value = retainedCarrier({
    subject: present(subject, "subject"),
    predicate: present(predicate, "predicate"),
    object: present(object, "object"),
    for: forSide,
    against: againstSide,
    ...written(reading, forSide, againstSide),
  });
  admitted.add(value);
  return value;
}

// The same triple as an admitted cell, with other evidence: the triple is not checked or encoded
// again, and its bytes and address, once known, are the prior cell's.
function reEvidenced(prior, told, denied, reading) {
  const [forSide, againstSide] = [side(told), side(denied)];
  const value = retainedCarrier({ subject: prior.subject, predicate: prior.predicate, object: prior.object, for: forSide, against: againstSide, ...written(reading, forSide, againstSide) });
  admitted.add(value);
  if (tripleBytesOf.has(prior)) tripleBytesOf.set(value, tripleBytesOf.get(prior));
  if (addressOf.has(prior)) addressOf.set(value, addressOf.get(prior));
  return value;
}

/** A cell over (subject, predicate, object), with the evidence (and value) given (none by default). */
export function cell(subject, predicate, object, evidence = {}) {
  return made(subject, predicate, object, evidence.for ?? [], evidence.against ?? [], evidence.value);
}

/** An utterance is SignCell's one carrier (`utterance.mjs`): a token and a claim, token first,
 *  each hand carrying a Mark. A cell's terms are the hands' data. */
export { utterance, utteranceSchema, utteranceAt, tokenValue, claimValue, isUtterance } from "./utterance.mjs";

/** The reflexive cell an utterance (token, claim) opens: (token, claim, token). */
export function utteranceCell(token, claim) {
  return cell(token, claim, token);
}

/** Articulating an utterance: its reflexive cell, told for by its own token. */
export const articulate = (token, claim) => cell(token, claim, token, { for: [token] });

/** A triple (or cell) carrying the given evidence and its value — its own replaced. */
export const evidenced = (at, value) => admitted.has(at)
  ? reEvidenced(at, value.for ?? [], value.against ?? [], value.value)
  : cell(at.subject, at.predicate, at.object, value);

/** The triple a cell is addressed by. */
export const triple = (value) => retainedCarrier({ subject: value.subject, predicate: value.predicate, object: value.object });

// Owned, admitted cells have immutable triples, so their bytes and address are computed once.
const tripleBytesOf = new WeakMap();
const addressOf = new WeakMap();
/** The coincidence key of a cell's triple, computed once per admitted cell. */
export const tripleKey = (value) => bytesToLatin1(tripleBytes(value));
const tripleBytes = (value) => {
  let bytes = tripleBytesOf.get(value);
  if (bytes === undefined) {
    bytes = semanticBytes(triple(value));
    if (admitted.has(value)) tripleBytesOf.set(value, bytes);
  }
  return bytes;
};

/** The content address of a cell: its triple's ni: name. Evidence never enters it. */
export const address = (value) => {
  let id = addressOf.get(value);
  if (id === undefined) {
    id = semanticId(triple(value));
    if (admitted.has(value)) addressOf.set(value, id);
  }
  return id;
};

/** Whether two cells are the same cell (their triples coincide), whatever their evidence. */
export const sameCell = (left, right) => left === right || bytesEqual(tripleBytes(left), tripleBytes(right));

/** Which sides the evidence has told, of a cell or an evidence pair: [for is non-empty, against is non-empty]. */
export const told = (value) => Object.freeze([value.for.length > 0, value.against.length > 0]);

// — value and presence (Obsmetrologia Valued): the FOUR point a cell carries, and the one its evidence shows —

/** The reading the evidence alone shows (Valued.presence), in the knowledge family. */
export const presence = (value) => presenceOfSides(value.for, value.against);

/** A cell's (or pair's) value, in the knowledge family: its written value, else its presence. */
export const valueOf = (value) => value.value ?? presence(value);

/** Whether a cell (or pair) is Measured: its value is exactly what its evidence shows. */
export const measured = (value) => valueOf(value) === presence(value);

/** The value's sides [for, against] of a point given as a cell or evidence pair, or as a reading's name. */
export const sidesOf = (point) => sidesOfReading(hasEvidence(point) ? valueOf(point) : point);

/** A cell's, or a bare evidence pair's, value read in the knowledge order, and in the truth order. */
export const knowledgeReading = (value) => valueOf(value);
export const truthReading = (value) => readingAs("truth", valueOf(value));

/** A cell's (or pair's) record (Obsmetrologia Record): its distinct witnesses counted each way, whose
 *  topMass is how many tellings each way it holds at once. */
export const recordOf = (value) => record(value.for.length, value.against.length);

/** Whether a value carries a triple (a cell, as against a bare evidence pair). */
export const hasTriple = (value) => value !== null && typeof value === "object" && "subject" in value && "predicate" in value && "object" in value;

/** The cell with `witness` added to its for side: its knowledge join with that one-sided telling. */
export const witnessFor = (value, witness) => made(value.subject, value.predicate, value.object, [...value.for, witness], value.against, knowledgeJoinReading(valueOf(value), readingOfSides("knowledge", true, false)));

/** The cell with `witness` added to its against side: its knowledge join with that one-sided telling. */
export const witnessAgainst = (value, witness) => made(value.subject, value.predicate, value.object, value.for, [...value.against, witness], knowledgeJoinReading(valueOf(value), readingOfSides("knowledge", false, true)));

/** Join two tellings of the same cell (Valued.joinK): each side is the union of both, the value their
 *  knowledge join. Measured tellings join Measured (joinK_measured). */
export function merge(left, right) {
  if (!sameCell(left, right)) throw new TypeError("signcell: only the same cell merges");
  const [told, denied] = [[...left.for, ...right.for], [...left.against, ...right.against]];
  const value = knowledgeJoinReading(valueOf(left), valueOf(right));
  return admitted.has(left) ? reEvidenced(left, told, denied, value) : made(left.subject, left.predicate, left.object, told, denied, value);
}

// — moves on the triple. Evidence is not carried: transporting it is a valuation question. —

/** Converse: swap subject and object. */
export const converse = (value) => cell(value.object, value.predicate, value.subject);

/** Subject projection: collapse the object onto the subject. */
export const subjectProjection = (value) => cell(value.subject, value.predicate, value.subject);

/** Object projection: collapse the subject onto the object. */
export const objectProjection = (value) => cell(value.object, value.predicate, value.object);

/** Specialization: refine only the predicate by `refine`. */
export const specialize = (refine, value) => cell(value.subject, refine(value.predicate), value.object);

/** The moves by name. */
export const moves = Object.freeze({ converse, "subject-projection": subjectProjection, "object-projection": objectProjection });

/** The move of a given name. */
export function namedMove(name) {
  if (!Object.hasOwn(moves, name)) throw new TypeError(`signcell: unknown move ${JSON.stringify(name)}`);
  return moves[name];
}

// — cell sets: a body of tellings, one cell per address —

/** A cell set: its cells in address order, each address once, tellings of one cell merged (by `join`,
 *  by default every telling kept). */
export function cellSet(cells = [], join = merge) {
  const byAddress = new Map();
  for (const value of cells) {
    const key = address(value);
    byAddress.set(key, byAddress.has(key) ? join(byAddress.get(key), value) : admitCell(value));
  }
  return Object.freeze([...byAddress.keys()].sort().map((key) => byAddress.get(key)));
}

/** Join two cell sets: every cell of either, same cells merged. */
export const mergeCellSets = (left, right) => cellSet([...left, ...right]);

/** A functional section's sole, positively valued and unopposed object.
 *  Repeated tellings are one cell; distinct objects or a contested value refuse
 *  a definite reading. Witness presence and the settled value remain distinct. */
export function certainObject(cells) {
  const section = cellSet(cells);
  if (section.length !== 1) return null;
  const [positive, negative] = sidesOf(section[0]);
  return positive && !negative ? section[0].object : null;
}

/** A section's separate FOUR readings, native identities, presence and witness
 *  counts. Never join unrelated predicates into one alleged truth value. */
export function sectionReading(cells = []) {
  const readings = { unknown: 0, held: 0, denied: 0, contested: 0 };
  const predicates = new Map();
  const entries = cellSet(cells).map((cell) => {
    const reading = readingAs("extremal", valueOf(cell));
    readings[reading]++;
    const key = coincidenceKey([cell.subject, cell.predicate]);
    const group = predicates.get(key) ?? { predicate: cell.predicate, count: 0 };
    group.count++;
    predicates.set(key, group);
    return Object.freeze({ cell, address: address(cell), reading,
      presence: readingAs("extremal", presence(cell)), witnesses: recordOf(cell) });
  });
  return Object.freeze({ readings: Object.freeze(readings), entries: Object.freeze(entries),
    alternatives: Object.freeze([...predicates.values()].filter(({ count }) => count > 1).map(({ predicate }) => predicate)) });
}

/** The cell of a set at an address (or at another cell's address), if any. */
export function cellAt(set, at) {
  const key = typeof at === "string" ? at : address(at);
  return set.find((value) => address(value) === key);
}

/** The cells of `left` whose triple is not in `right`. */
export function cellDifference(left, right) {
  const present = new Set(right.map(address));
  return Object.freeze(left.filter((value) => !present.has(address(value))));
}

// — carrier —

/** The JSON Schema (2020-12) of a cell carrier. */
export const cellSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/signcell/cell.schema.json",
  title: "SignCell",
  description: "An ordered (subject, predicate, object) triple with the witnesses told for and against it, and its value when that is not what the witnesses show.",
  type: "object",
  required: ["subject", "predicate", "object", "for", "against"],
  properties: {
    subject: {}, predicate: {}, object: {},
    for: { type: "array", uniqueItems: true },
    against: { type: "array", uniqueItems: true },
    value: readingSchema("knowledge"),
  },
  additionalProperties: false,
});

/** The JSON Schema of a bare triple (a cell's address without its evidence). */
export const tripleSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/signcell/triple.schema.json",
  title: "Triple", description: "An ordered (subject, predicate, object).",
  type: "object", required: ["subject", "predicate", "object"], properties: { subject: {}, predicate: {}, object: {} }, additionalProperties: false,
});

const KEYS = ["against", "for", "object", "predicate", "subject"].join();
const VALUED_KEYS = ["against", "for", "object", "predicate", "subject", "value"].join();

/** Whether a value is a cell carrier (by shape; decoded JSON need not be frozen). */
export function isCell(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort().join();
  return (keys === KEYS || (keys === VALUED_KEYS && isReading(value.value, "knowledge")))
    && Array.isArray(value.for) && Array.isArray(value.against);
}

/** Admit a carrier as a cell, normalizing its evidence sides. Throws on anything else. */
export function admitCell(value) {
  if (admitted.has(value)) return value;
  if (!isCell(value)) throw new TypeError("signcell: a cell has exactly subject, predicate, object, for, against, and a value only when not measured");
  return made(value.subject, value.predicate, value.object, value.for, value.against, value.value);
}

/** A cell's canonical CBOR bytes. */
export const cellBytes = (value) => semanticBytes(admitCell(value));
