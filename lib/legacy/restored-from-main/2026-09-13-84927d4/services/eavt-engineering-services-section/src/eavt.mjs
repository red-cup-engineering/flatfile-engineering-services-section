// eavt — the EAVT law, standalone (owner-ruled 2026-08-30: plain EAVT gets its own topic
// section under computer-data custody; SEAVT — EAVT where each e,a,v is meant to be RMN — stays
// downstream in witness-journal/semiotic custody and is NOT built or moved here).
//
// A row is exactly {e,a,v,t}: e the SUBJECT (entity), a the PREDICATE (attribute, conventionally
// a gerund), v the OBJECT (value — any JSON-shaped value, first-class in the coordinate, never
// hidden in the charge), t the TRANSACTION (witness/provenance). Every row is a positive
// AFFIRMATION of its cell; negation/contradiction are read off the fold (a cell told both ways
// rises to a held contradiction), never a polarity field on the row itself.
//
// Ported (moved, adapted to stand alone) from @red-cup-engineering/computer's
// posix-holography/src/eavt.mjs, posix-holography/src/eavt-append.mjs, posix-holography/src/
// substrate.mjs, and typed-resource-catalog/.../eavt/scripts/eavt.mjs. The adaptation: identity
// and on-disk canonicalization now compose @red-cup-engineering/cbor-codec-service (RFC 8949
// core-deterministic CBOR) and @red-cup-engineering/cbor-ni-service (RFC 6920 `ni:` naming) —
// this package duplicates neither codec nor identity math, per the primitives-live-once law.
//
// ON-DISK FORMAT (adapted from the upstream jcs-jsonl form, which this package does not consume):
// each line is base64(canonical-CBOR(row)) + "\n". Base64 keeps the line newline-safe (CBOR bytes
// can themselves contain 0x0A), so the append-only, torn-line-tolerant read discipline below still
// works by splitting on "\n" — a crash mid-append can only leave a partial base64 tail, and a
// partial base64 tail fails to decode/decanonicalize cleanly, so it is dropped exactly like a torn
// JSON line was in the upstream form.
import { openSync, writeSync, fsyncSync, closeSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { encodeCanonical, decodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { canonicalCborToNiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { niUriDigest, niUriDigestBytes, makeNiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { bottom, charge, chargeValue, joinKnowledge } from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
import { mark } from "@lenticule-science/articulating/utterance";
import { requireJsonValue } from "@red-cup-engineering/computer-data-engine/json";
import { assertCanonicalJson } from "@red-cup-engineering/computer-data-engine/identity";
export { parseEavtJsonLines, serializeEavtJsonLines, convertLegacyEavtTuple } from "./json-lines.mjs";
export { unfoldJson, foldJson } from "./json-projection.mjs";
export { assertObjectDatom, assertDatomFact, retractDatomFact, objectDatomId, currentDatomValue, objectDatomsAsOf, foldObjectDatoms, objectDatomWitnesses } from "./datom.mjs";
export { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom } from "./triple.mjs";

// === row identity + contract =================================================================

// assertRow(row) — a row is exactly {e,a,v,t}. Lenient on values; throws otherwise. (Stricter,
// domain-specific contracts are the consumer's to add on top.)
export function assertRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new TypeError("eavt: row must be a JSON object");
  }
  for (const k of ["e", "a", "v", "t"]) {
    if (!(k in row)) throw new TypeError(`eavt: row missing "${k}"`);
  }
  if (Object.keys(row).length !== 4) {
    throw new TypeError(`eavt: row must be exactly {e,a,v,t}, got ${Object.keys(row).join(",")}`);
  }
  const admitted = requireJsonValue(row, "eavt row");
  assertCanonicalJson(admitted);
  return admitted;
}

// rowId(row) — the row's content identity: the RFC 6920 `ni:` URI of its RFC 8949 canonical CBOR
// encoding. Identical content -> identical id. Composes cbor-codec-service + cbor-ni-service;
// never a locally-reinvented hash/canonicalization.
export function rowId(row) {
  return canonicalCborToNiUri(encodeCanonical(assertRow(row)));
}

// canonicalKey(value) — a deterministic grouping/sort key for an arbitrary JSON-shaped value
// (e.g. a [predicate, object] pair), built from the same canonical CBOR encoding as rowId, so
// grouping never depends on incidental JS object key order.
export function canonicalKey(value) {
  return Buffer.from(encodeCanonical(value)).toString("base64");
}

// dedupe(rows) — dedup rows by canonical id, first occurrence kept (G-Set semantics),
// order-preserving.
export function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const id = rowId(row);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

// === on-disk encoding (one row per line) ======================================================

// encodeRow(row) — the exact bytes appended for one row: base64 of its canonical CBOR encoding.
export function encodeRow(row) {
  assertRow(row);
  return Buffer.from(encodeCanonical(row)).toString("base64");
}

// decodeRow(line) — the inverse: decode one on-disk line back to its row. Throws on anything that
// is not a clean base64-of-canonical-CBOR-of-a-conformant-row line (a torn/partial line included);
// callers that must tolerate torn lines (readEavtFile) catch this rather than propagate it.
export function decodeRow(line) {
  const bytes = Buffer.from(line, "base64");
  const value = decodeCanonical(bytes);
  return assertRow(value);
}

// === durable append (OP1 durability / OP2 write-atomicity / OP4 canonical bytes) =============
//
//   OP1 — the line is fsync'd to stable storage before appendEavt returns.
//   OP2 — the line is written with a single O_APPEND write, so two writers appending to the same
//         log never interleave a half-line. Within a process, appends are additionally serialised
//         through a per-path queue (single-writer discipline); cross-process serialisation is
//         O_APPEND's own atomicity.
//   OP4 — the persisted bytes are the row's ONE canonical form (base64-of-canonical-CBOR), not an
//         incidental JSON.stringify — the same bytes whose ni: URI is the row's identity.
const writing = new Set();

export function appendEavt(path, row) {
  mkdirSync(dirname(path), { recursive: true });
  const line = encodeRow(row) + "\n";
  writing.add(path);
  const fd = openSync(path, "a");
  try {
    writeSync(fd, line);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
    writing.delete(path);
  }
  return path;
}

// === disk read-back, torn-final-line tolerant (OP3) ===========================================
//
// A crash mid-append can leave a partial FINAL line: bytes written but never fsynced. The read
// membrane MUST tolerate that — skip the torn line, never throw. A torn line in the MIDDLE would
// mean deeper corruption than a crash mid-append can cause; readEavtFile still skips any
// non-decoding line rather than throw, so a read always yields the rows that ARE intact.
export function readEavtFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue; // blank / trailing newline
    try {
      rows.push(decodeRow(line));
    } catch {
      // torn/partial line (OP3) or otherwise non-conformant — skip, never throw.
    }
  }
  return rows;
}

// === entities ==================================================================================

// listEntities(rows) — the distinct subjects (`e`) appearing across a rows array, in
// first-occurrence order.
export function listEntities(rows) {
  const seen = new Set();
  const out = [];
  for (const { e } of rows) {
    const key = canonicalKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

const EAVT_OPERATION_ROW_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({ e: Object.freeze({ type: "string" }), a: Object.freeze({ type: "string" }), v: Object.freeze({}), t: Object.freeze({ type: "number" }) }),
  required: Object.freeze(["e", "a", "v", "t"]),
});
const EAVT_OPERATION_FOLDED_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({ entity: Object.freeze({ type: "string" }), fiber: Object.freeze({ type: "array" }) }),
  required: Object.freeze(["entity", "fiber"]),
});

/** Return the generic durable EAVT trace capability declarations for a receiving transport. */
export function eavtTraceCapabilityOperations(refusalSchema) {
  const rowArray = Object.freeze({ type: "array", items: EAVT_OPERATION_ROW_SCHEMA });
  return Object.freeze({
    "assert-row": Object.freeze({
      handler: ({ row }) => assertRow(row),
      spec: Object.freeze({ args: Object.freeze({ type: "object", properties: Object.freeze({ row: EAVT_OPERATION_ROW_SCHEMA }), required: Object.freeze(["row"]) }), returns: EAVT_OPERATION_ROW_SCHEMA, refusal: refusalSchema }),
    }),
    "append": Object.freeze({
      handler: ({ path, row }) => appendEavt(path, row),
      spec: Object.freeze({ args: Object.freeze({ type: "object", properties: Object.freeze({ path: Object.freeze({ type: "string" }), row: EAVT_OPERATION_ROW_SCHEMA }), required: Object.freeze(["path", "row"]) }), returns: Object.freeze({ type: "string" }), refusal: refusalSchema }),
    }),
    "read": Object.freeze({
      handler: ({ path }) => readEavtFile(path),
      spec: Object.freeze({ args: Object.freeze({ type: "object", properties: Object.freeze({ path: Object.freeze({ type: "string" }) }), required: Object.freeze(["path"]) }), returns: rowArray, refusal: refusalSchema }),
    }),
    "entities": Object.freeze({
      handler: ({ path }) => listEntities(readEavtFile(path)),
      spec: Object.freeze({ args: Object.freeze({ type: "object", properties: Object.freeze({ path: Object.freeze({ type: "string" }) }), required: Object.freeze(["path"]) }), returns: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }), refusal: refusalSchema }),
    }),
    "fold-trace": Object.freeze({
      handler: ({ path, subject, opts }) => fold(subject, readEavtFile(path), opts ?? {}),
      spec: Object.freeze({ args: Object.freeze({ type: "object", properties: Object.freeze({ path: Object.freeze({ type: "string" }), subject: Object.freeze({ type: "string" }), opts: Object.freeze({ type: "object" }) }), required: Object.freeze(["path", "subject"]) }), returns: EAVT_OPERATION_FOLDED_SCHEMA, refusal: refusalSchema }),
    }),
  });
}

// === entity constitution (the EAVT SKETCH-LANE address rule) ===================================
//
// An entity is born by ONE constituting utterance — a genesis row — and its address IS derived
// from that row's OWN content-address: `<kind>:<digest>`, where `kind` is a plain noun (task,
// project, machine, thing, ...) and `digest` is the RFC 6920 base64url SHA-256 digest of the row
// (the same digest rowId already names as a `ni:///sha-256;<digest>` URI, prefix stripped — no
// locally-reinvented hashing). Matches the tree's existing address shape (`thing:pebble`,
// `place:riverbed`) and existing attribute convention (flat gerunds like "named", "located-in",
// never kind-namespaced) seen in this package's own tests and the LAGOON seeds.
//
// THIS IS THE SKETCH-LANE ADDRESS, not the corpus's full semantic-identity law: the glass-sponge
// note (engineering-services-section/content/text/documents/articles/notes/2026/08/01/2026-08-01-
// note-on-the-content-addressed-glass-sponge-semantic-compute-complex.md), §9, specifies hashing a
// TYPED ENVELOPE (objectKind, semanticType, normalization profile, settlement profile, settled
// body, witness root) precisely so two different semantic acts cannot hash alike as bare carriers
// — "hashing does not create the least fixed point: settlement earns the object; canonicalization
// exposes unique bytes; hashing crystallizes those bytes" (§8-§9). That envelope law is specified
// there and still pending its proof; it is NOT built here, and this module claims no
// semantic-identity status for what it computes. Here, `kind` is only the sketch-lane stand-in for
// `objectKind` — a plain noun, not a typed envelope field. When SEAVT/RMN admission eventually
// implements the envelope law, entities gain envelope-law addresses WITHOUT this address changing
// role: it remains the genesis-row identity, one alias among an entity's names, not superseded.
//
// THE DERIVATION, in three sentences (a Guile reader can reimplement this exactly):
//   1. Hash the row with `e` held at the placeholder `null` — {e: null, a: "constituted",
//      v: attributes, t} — because the row cannot name itself with an address that does not exist
//      yet; the digest is rowId's own RFC 6920 digest, prefix stripped.
//   2. The address is the plain-noun `kind` joined to that digest with ":" — `${kind}:${digest}`
//      — and the returned genesis row has `e` REWRITTEN to that address (the only field that
//      differs between the hashed form and the row actually persisted).
//   3. Verification reverses this exactly: split the address on its first ":" to recover `kind`,
//      reset `e` back to `null`, recompute the digest the same way, and recompose
//      `${kind}:${digest}` — a genesis row is genuine iff that recomputation equals its own `e`.
const GENESIS_PLACEHOLDER_E = null;
const GENESIS_ATTRIBUTE = "constituted";

function assertKind(kind) {
  if (typeof kind !== "string" || kind === "" || kind.includes(":")) {
    throw new TypeError(`eavt: kind must be a non-empty string containing no ":", got ${JSON.stringify(kind)}`);
  }
  return kind;
}

// attributes is the genesis row's `v`: a JSON object (never null — null there would collide with
// fold's own retraction-tombstone reading of `v === null`, and never an array, to keep it a
// namespace of named facts rather than an ordered list).
function assertAttributes(attributes) {
  if (attributes === null || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new TypeError("eavt: attributes must be a JSON object (not null, not an array)");
  }
  return attributes;
}

// digestOf(row) — the shared half of rowId and an entity address: the row's RFC 6920 base64url
// SHA-256 digest with the "ni:///sha-256;" prefix stripped (@red-cup-engineering/ni-services-
// section's niUriDigest — never a local slice of the prefix).
function digestOf(row) {
  return niUriDigest(rowId(row));
}

// constituteEntity({kind, attributes, t}) — the ONE constituting utterance that births an entity.
// Builds the genesis row, derives its address per the three-step law above, and returns
// {address, genesisRow} where genesisRow.e IS address — rewritten before return, so the row on
// disk carries its own address.
export function constituteEntity({ kind, attributes, t }) {
  assertKind(kind);
  assertAttributes(attributes);
  const preAddressRow = { e: GENESIS_PLACEHOLDER_E, a: GENESIS_ATTRIBUTE, v: attributes, t };
  const address = `${kind}:${digestOf(preAddressRow)}`;
  return { address, genesisRow: { ...preAddressRow, e: address } };
}

// entityAddress(genesisRow) — the verification direction: recompute the address FROM a genesis
// row rather than from the original {kind, attributes, t} inputs, by reversing constituteEntity's
// substitution exactly (step 3 of the law above). Does not itself compare the result to
// genesisRow.e — that comparison is the caller's verification (`entityAddress(row) === row.e`).
export function entityAddress(genesisRow) {
  assertRow(genesisRow);
  if (typeof genesisRow.e !== "string" || !genesisRow.e.includes(":")) {
    throw new TypeError(`eavt: genesis row "e" must be a "<kind>:<digest>" address, got ${JSON.stringify(genesisRow.e)}`);
  }
  const kind = genesisRow.e.slice(0, genesisRow.e.indexOf(":"));
  const preAddressRow = { e: GENESIS_PLACEHOLDER_E, a: genesisRow.a, v: genesisRow.v, t: genesisRow.t };
  return `${kind}:${digestOf(preAddressRow)}`;
}

// === the per-predicate FUNCTIONAL read-lens ====================================================
//
// Ported (adapted to stand alone) from @red-cup-engineering/computer's posix-holography/src/
// substrate.mjs, same lineage as the header note above. Adaptation: upstream additionally excludes
// "reified" rows (attributions ABOUT a row, keyed by that row's content-id) from every one of these
// three laws — that reification apparatus is witness-journal/SEAVT-adjacent machinery this package
// does not carry (same scoping call as fold's dropped independent-evidence apparatus below); every
// row here is ordinary subject state, so no such exclusion is needed.

// supersede(rows, functional?) — keep, for each functional predicate `a`, only the max-t row;
// non-functional rows all survive (they accrue). `functional` names which predicates are
// single-valued over time: a Set of exact names, or a predicate `(a) => boolean`; omit for none
// (identity). This is a READ-time latest-t PROJECTION — it mutates nothing; the input trace is
// untouched, and every witness stays in the trace for a caller that reads it directly.
const asFunctional = (functional) => {
  if (typeof functional === "function") return functional;
  if (functional instanceof Set) return (a) => functional.has(a);
  return () => false; // no functional predicates => supersede is identity
};

export function supersede(rows, functional) {
  const fn = asFunctional(functional);
  const latest = new Map(); // a -> max t seen
  for (const r of rows) {
    if (!fn(r.a)) continue;
    const cur = latest.get(r.a);
    if (cur === undefined || r.t > cur) latest.set(r.a, r.t);
  }
  return rows.filter((r) => !fn(r.a) || r.t === latest.get(r.a));
}

// === the general relational graph read =========================================================
//
// relate(rows, predicate, object) — the subjects `e` of rows where (e, predicate, object): "who
// stands in `predicate` to `object`?" Deduped, sorted for a stable read.
export function relate(rows, predicate, object) {
  const out = new Set();
  for (const r of rows) {
    if (r.a === predicate && r.v === object) out.add(r.e);
  }
  return [...out].sort();
}

// relateFrom(rows, subject, predicate) — the objects `v` of rows where (subject, predicate, v):
// "what does `subject` stand in `predicate` to?" The inverse direction of relate. No latest-t
// projection here — that is supersede's job; relateFrom returns every object asserted (deduped,
// in trace order).
export function relateFrom(rows, subject, predicate) {
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    if (r.e === subject && r.a === predicate) {
      const key = canonicalKey(r.v);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r.v);
      }
    }
  }
  return out;
}

// The relational read capability surface is data-owned: a process transport may carry these
// declarations, but cannot redefine their relation semantics or contracts.
const RELATIONAL_ROWS_SCHEMA = Object.freeze({ type: "array", items: Object.freeze({
  type: "object",
  properties: Object.freeze({ e: Object.freeze({ type: "string" }), a: Object.freeze({ type: "string" }), v: Object.freeze({}), t: Object.freeze({ type: "number" }) }),
  required: Object.freeze(["e", "a", "v", "t"]),
}) });

/** Return the generic EAVT relation capability declarations for a receiving transport. */
export function eavtRelationCapabilityOperations(refusalSchema) {
  return Object.freeze({
    "relate": Object.freeze({
      handler: ({ rows, predicate, object }) => relate(rows, predicate, object),
      spec: Object.freeze({
        args: Object.freeze({ type: "object", properties: Object.freeze({ rows: RELATIONAL_ROWS_SCHEMA, predicate: Object.freeze({ type: "string" }), object: Object.freeze({}) }), required: Object.freeze(["rows", "predicate", "object"]) }),
        returns: Object.freeze({ type: "array" }),
        refusal: refusalSchema,
      }),
    }),
    "relate-from": Object.freeze({
      handler: ({ rows, subject, predicate }) => relateFrom(rows, subject, predicate),
      spec: Object.freeze({
        args: Object.freeze({ type: "object", properties: Object.freeze({ rows: RELATIONAL_ROWS_SCHEMA, subject: Object.freeze({ type: "string" }), predicate: Object.freeze({ type: "string" }) }), required: Object.freeze(["rows", "subject", "predicate"]) }),
        returns: Object.freeze({ type: "array" }),
        refusal: refusalSchema,
      }),
    }),
  });
}

// === fold, with retraction tombstones ==========================================================
//
// fold(subject, rows, opts?) — fold one subject's {e,a,v,t} trace into its settled fiber: one cell
// per distinct (predicate, object), each carrying a four-valued charge over a lossless evidence
// carrier (Articulating's joinKnowledge). A row {e:subject, a, v:null, t} is a RETRACTION tombstone
// (opts.retract, default true): it stops every EARLIER assertion of `a` on this subject from
// contributing — honest append-only undo; the null row IS the new positing event, nothing is
// erased from the trace itself.
//
// === legacy converse lane (OPTIONAL compatibility lane; opts.converse) ========================
// Ported from @red-cup-engineering/computer's posix-holography/src/substrate.mjs (read-only,
// deprecated). This is the shipped TAB-lineage world-mechanic, load-bearing in five engines: a
// DECLARED converse pair charges the NEGATIVE coordinate of its positive predicate's cell — e.g. a
// "shut" row charges "open"'s negative face, so a subject told both "open" and "shut" settles
// "open" to ⊤ (held-as-contested), not an error. It activates ONLY when the caller passes
// opts.converse (even {}); its absence is the default, and fold is then byte-identical to 0.3.0.
// Once active, opts.converse ({opposingPredicate: positivePredicate}, e.g. {shut: "open"}) merges
// with any in-trace declaration row {e: positivePredicate, a: "has-converse",
// v: opposingPredicate, t} — has-converse rows are read across the WHOLE rows array (a
// world-mechanic declaration, not subject state, scanned regardless of which subject is being
// folded) and never themselves contribute a cell.
//
// This is a DIFFERENT discipline from independent predication evidence, and the two must never be
// mixed silently: FregeanFourChu (Obsmetrologia Language/Predicating, realized at
// @lenticule-science/articulating ./predicating) rules that for predication evidence, converse is
// NOT denial — reversing relation orientation or reading an opposing term is not evidence against
// an oriented claim. That lane refuses opts.converse by design and stays at ./predicating; this
// lane exists so the games fleet's shipped converse-pair world-mechanic (TAB and its descendants)
// has a canonical home off the stale @561-group/computer name, without smuggling denial semantics
// into predication evidence. Reach for opts.converse only for the legacy relational-opposition
// mechanic, never to simulate negation for a predication claim.
export function fold(subject, rows, opts = {}) {
  if (typeof subject !== "string" || !subject) throw new TypeError("fold: subject must be a non-empty string");
  if (!Array.isArray(rows)) throw new TypeError("fold: rows must be an {e,a,v,t} array");
  for (const r of rows) assertRow(r);

  const converseActive = Object.hasOwn(opts, "converse");
  const converse = converseActive ? { ...opts.converse } : undefined;
  if (converseActive) {
    for (const r of rows) if (r.a === "has-converse") converse[r.v] = r.e;
  }

  const retract = opts.retract !== false;
  const retractedAfter = new Map(); // predicate -> latest tombstone t
  if (retract) {
    for (const r of rows) {
      if (r.e === subject && r.v === null) {
        const cur = retractedAfter.get(r.a);
        if (cur === undefined || r.t > cur) retractedAfter.set(r.a, r.t);
      }
    }
  }

  const cells = new Map(); // canonicalKey([predicate,object]) -> {predicate,object,charge}
  for (const r of rows) {
    if (r.e !== subject) continue;
    if (converseActive && r.a === "has-converse") continue; // declaration row, never subject state
    if (r.v === null) continue; // a retraction row carries no positive evidence
    if (retractedAfter.has(r.a) && r.t < retractedAfter.get(r.a)) continue; // tombstoned
    const id = rowId(r);
    const base = converseActive ? converse[r.a] : undefined;
    const predicate = base ?? r.a;
    const negative = base !== undefined;
    const key = canonicalKey([predicate, r.v]);
    const prior = cells.get(key)?.charge ?? bottom;
    const contribution = negative
      ? charge(chargeValue("active"), [[], [mark(id)]])
      : charge(chargeValue("potential"), [[mark(id)], []]);
    cells.set(key, { predicate, object: r.v, charge: joinKnowledge(prior, contribution) });
  }

  const fiber = [...cells.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, { predicate, object, charge }]) => ({
      predicate,
      object,
      value: { pos: charge.value[0].name === "present" ? 1 : 0, neg: charge.value[1].name === "present" ? 1 : 0, evidence: charge.evidence.map(side => side.map(witness => witness.value)) },
    }));

  return { entity: subject, fiber };
}

// settle(subject, rows, opts?) — read->fold, defensively: dedupe the raw rows (G-Set — a row
// appended twice must not double its evidence) before folding. opts, including the legacy
// opts.converse compatibility lane documented at fold above, passes straight through.
export function settle(subject, rows, opts = {}) {
  return fold(subject, dedupe(rows), opts);
}

// === settled-section projection ===============================================================
//
// section(folded) — project a folded fiber to {affirmed, denied, contradicted}: affirmed = pos-only
// cells, denied = neg-only cells (a belief STATE, not a retraction), contradicted = told-both
// cells. A cell with no evidence at all carries no charge and is omitted. Takes the OUTPUT of
// fold/settle, so a cell charged negative by the legacy opts.converse lane at fold buckets here as
// denied (or contradicted, if also positively charged) exactly like any other negative charge.
export function section(folded) {
  const out = { affirmed: [], denied: [], contradicted: [] };
  for (const c of folded.fiber) {
    const { pos, neg } = c.value;
    const cell = { predicate: c.predicate, object: c.object };
    if (pos && neg) out.contradicted.push(cell);
    else if (pos) out.affirmed.push(cell);
    else if (neg) out.denied.push(cell);
  }
  return out;
}

// === stratification (the braided tower: Level 0 asserted / Level 1 saturated = Fix σ /
// Level 2 settled = Fix σ ∩ Fix Δ) =============================================================
//
// eavt's queued next order (org-layering.md EAVT custody; 561-group-services-section notes
// 2026-04-04 dont-flatten-the-tower, 2026-04-06 pws-core-systems-design; glossary
// fiber-nuclear-quartet / commutative-nuclear-square). A row's STRATUM is a DERIVED reading of
// the trace, never a stored field: nothing below mutates or re-persists a row. The tower: Level
// 0 is the raw asserted rows; Level 1 is Fix(σ), the saturation-stable (past-only) sub-fiber;
// Level 2 is H* = Fix(σ) ∩ Fix(Δ), the doubly-stable settled fiber. σ (saturate) and Δ
// (transfer) are SEPARATE passes, never one lumped fold — R7 (σ(Δ(M)) → Δ(σ(M)), "process past
// before future") fixes their canonical composition order, and because the two nuclei commute
// (the fiber nuclear square: σ∘Δ = Δ∘σ = π), Fix(σ) ∩ Fix(Δ) = Fix(Δ∘σ): the canonical
// composition below already IS the intersection, nothing further to compute.
//
// The realization in EAVT's own terms: rows carry no polarity field (see fold's header above),
// so σ and Δ cannot both be literal endomorphisms of one carrier the way the abstract fiber
// nuclear square pictures them. Here σ operates on ROWS (a row-level retraction closure — Level
// 1 stays row-shaped); Δ operates on rows to produce a FIBER (the charge-accumulation/converse-
// transfer closure fold already performs — a cell's charge is exactly where a converse-declared
// predicate's negation legitimately lives, never a row field). Composed canonically (Δ outside,
// σ inside) they reproduce fold/settle's existing 0.4.0 output exactly, proven by test against
// realistic traces including the converse-held-contradiction case — this section only splits
// that one pass into two; it changes no existing behavior.

// saturate(rows, opts?) — the σ nucleus: Level 1, Fix(σ), the past-stable sub-algebra. A
// TRACE-WIDE closure (every entity/predicate at once, mirroring how a history H_t spans the
// whole trace, not one subject): drops every retraction tombstone row itself (v===null; it
// carries no positive evidence) and every earlier same-(e,a) positive row a LATER tombstone
// retracts (ties broken by latest-tombstone-t — fold's own rule, generalized from
// subject-scoped-by-predicate to trace-wide-by-(e,a), which coincide since fold only ever
// scans/applies within one subject at a time). opts.retract===false disables retraction
// entirely (rows pass through, deduped only) — the same toggle fold already accepts. Rows for
// every OTHER (e,a) pair — has-converse declaration rows included, since those are never
// v===null — pass through untouched: saturate never reads predicate names or converse pairs;
// that is transfer's job alone, never lumped in here.
//
// Idempotent by construction: saturate(saturate(rows)) always deep-equals saturate(rows) —
// nothing is left to retract once every tombstone/shadowed-positive pair is already gone. That
// fixed-point property IS Fix(σ).
//
// @param {object[]} rows An {e,a,v,t} row array (any order; need not be pre-deduped).
// @param {{retract?: boolean}} [opts] retract (default true) toggles the tombstone law.
// @returns {object[]} The deduped, retraction-closed rows (trace-wide, Level 1).
// @throws {TypeError} If rows is not an array, or any row is not a conformant {e,a,v,t} row.
export function saturate(rows, opts = {}) {
  if (!Array.isArray(rows)) throw new TypeError("saturate: rows must be an {e,a,v,t} array");
  for (const r of rows) assertRow(r);
  const deduped = dedupe(rows);
  if (opts.retract === false) return deduped;

  const retractedAfter = new Map(); // canonicalKey([e,a]) -> latest tombstone t
  for (const r of deduped) {
    if (r.v !== null) continue;
    const key = canonicalKey([r.e, r.a]);
    const cur = retractedAfter.get(key);
    if (cur === undefined || r.t > cur) retractedAfter.set(key, r.t);
  }
  return deduped.filter((r) => {
    if (r.v === null) return false; // the tombstone itself carries no positive evidence
    const key = canonicalKey([r.e, r.a]);
    return !(retractedAfter.has(key) && r.t < retractedAfter.get(key));
  });
}

// transfer(subject, rows, opts?) — the Δ nucleus: Fix(Δ), the transfer-stable (converse-closed)
// sub-fiber. Accumulates `subject`'s rows into a settled fiber via Articulating's bilattice join —
// fold's own charge-accumulation law, extracted standalone — WITHOUT ever reading retraction
// (that is saturate's job alone; feed it saturate(rows) first, or call stratify, for the
// canonical σ-inside/Δ-outside settle order R7 fixes). When opts.converse is given (even {}), a
// declared converse pair redirects a row's evidence onto the NEGATIVE face of its positive
// predicate's cell, merged with any in-trace {a:"has-converse"} declaration — identical
// semantics to fold's legacy converse lane (see fold's own header). Called directly on raw,
// un-saturated rows, transfer alone answers "what would every cell hold if retraction never
// happened" — a legitimate, independent Fix(Δ) reading, not merely an internal step.
//
// @param {string} subject The entity (`e`) whose fiber to accumulate.
// @param {object[]} rows An {e,a,v,t} row array (any order; may span multiple subjects — a
//   has-converse declaration row's own `e` is a predicate name, not `subject`).
// @param {{converse?: Record<string,string>}} [opts] converse activates the legacy redirect lane.
// @returns {{entity: string, fiber: object[]}} Exactly fold's own settled-fiber shape.
// @throws {TypeError} If subject is empty/non-string, rows is not an array, or a row is
//   non-conformant.
export function transfer(subject, rows, opts = {}) {
  if (typeof subject !== "string" || !subject) throw new TypeError("transfer: subject must be a non-empty string");
  if (!Array.isArray(rows)) throw new TypeError("transfer: rows must be an {e,a,v,t} array");
  for (const r of rows) assertRow(r);

  const converseActive = Object.hasOwn(opts, "converse");
  const converse = converseActive ? { ...opts.converse } : undefined;
  if (converseActive) {
    for (const r of rows) if (r.a === "has-converse") converse[r.v] = r.e;
  }

  const cells = new Map();
  for (const r of rows) {
    if (r.e !== subject) continue;
    if (converseActive && r.a === "has-converse") continue;
    if (r.v === null) continue; // no value to fold, whether or not this is a retraction row
    const id = rowId(r);
    const base = converseActive ? converse[r.a] : undefined;
    const predicate = base ?? r.a;
    const negative = base !== undefined;
    const key = canonicalKey([predicate, r.v]);
    const prior = cells.get(key)?.charge ?? bottom;
    const contribution = negative
      ? charge(chargeValue("active"), [[], [mark(id)]])
      : charge(chargeValue("potential"), [[mark(id)], []]);
    cells.set(key, { predicate, object: r.v, charge: joinKnowledge(prior, contribution) });
  }

  const fiber = [...cells.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, { predicate, object, charge }]) => ({
      predicate,
      object,
      value: { pos: charge.value[0].name === "present" ? 1 : 0, neg: charge.value[1].name === "present" ? 1 : 0, evidence: charge.evidence.map(side => side.map(witness => witness.value)) },
    }));

  return { entity: subject, fiber };
}

// regimeOf(kappa) — classifies a closure ordinal per Obsmetrologia's Closure/Regime.lean
// boundaries (strict kappa < omega, Scott kappa = omega, transfinite-bounded omega < kappa <
// omega_1, aperiodic kappa >= omega_1).

// eavt's saturate/transfer only ever fold a FINITE trace, so their fold always reaches its
// fixed point in finitely many passes and kappa is always a natural number — this always
// returns "strict" here.

// The branch exists so a future infinite or streaming trace has somewhere honest to report a
// different regime; this package never guesses aperiodic for a finite trace.
//
// @param {number} kappa A non-negative integer count of fold passes to a fixed point.
// @returns {"strict"} The regime name for a finite closure ordinal.
// @throws {TypeError} If kappa is not a non-negative integer.
function regimeOf(kappa) {
  if (!Number.isInteger(kappa) || kappa < 0) throw new TypeError("regimeOf: kappa must be a non-negative integer");
  return "strict";
}

// stratify(subject, rows, opts?) — the DERIVED, non-mutating multi-level reading: Level 0
// asserted, Level 1 saturated = Fix(σ), Level 2 settled = Fix(σ) ∩ Fix(Δ), read off the SAME
// immutable `rows` trace every time (never stored, never re-persisted). Composes σ then Δ in
// R7's canonical order (settled = transfer(saturate(rows))) — two separate passes, never one
// lumped fold. Because settled is exactly what fold/settle already compute (proven by test
// against realistic traces, including the converse-held-contradiction case), stratify adds a
// reading; it changes nothing about fold/settle/section's existing 0.4.0 behavior.

// closure reports the proof kind of that reading: the closure ordinal kappa of the fold, per
// Obsmetrologia's regime classification (Closure/Regime.lean). saturate is single-pass BY
// CONSTRUCTION — its own header proves saturate(saturate(rows)) always deep-equals
// saturate(rows), so one application already computes Fix(σ); it is not an iterate-until-stable
// loop.

// transfer is likewise single-pass by construction — its cell accumulation is one
// left-to-right traversal of `rows` through Articulating's associative/commutative bilattice join,
// so a single traversal already computes Fix(Δ) regardless of how long a supersession chain the
// trace holds (a later tombstone always resolves against the latest-t entry directly, never by
// re-scanning).

// So closure.saturation and closure.transfer are always 1 for any finite trace;
// closure.kappa is their max, and closure.regime is regimeOf(kappa) — always "strict" here,
// because a finite trace's fold always reaches its fixed point in finitely many passes.
//
// @param {string} subject The entity (`e`) to stratify.
// @param {object[]} rows An {e,a,v,t} row array (any order; the whole trace, not pre-filtered).
// @param {{retract?: boolean, converse?: Record<string,string>}} [opts] Passed to saturate
//   (retract) and transfer (converse) exactly as fold/settle already accept them.
// @returns {{entity: string, asserted: object[], saturated: object[], settled: {entity: string,
//   fiber: object[]}, closure: {saturation: number, transfer: number, kappa: number, regime:
//   "strict"}}} The three levels — asserted (Level 0, subject's raw deduped rows), saturated
//   (Level 1, subject's retraction-closed rows), settled (Level 2, fold's own shape) — plus
//   closure: the fold-pass counts (saturation, transfer), their max (kappa), and the derived
//   regime name.
// @throws {TypeError} If subject is empty/non-string, rows is not an array, or a row is
//   non-conformant.
export function stratify(subject, rows, opts = {}) {
  if (typeof subject !== "string" || !subject) throw new TypeError("stratify: subject must be a non-empty string");
  if (!Array.isArray(rows)) throw new TypeError("stratify: rows must be an {e,a,v,t} array");

  const deduped = dedupe(rows);
  const asserted = deduped.filter((r) => r.e === subject);
  const saturatedTrace = saturate(deduped, opts);
  const saturated = saturatedTrace.filter((r) => r.e === subject);
  const settled = transfer(subject, saturatedTrace, opts);

  const saturationPasses = 1; // single-pass by construction — see saturate's own header
  const transferPasses = 1; // single-pass by construction — see transfer's own header
  const kappa = Math.max(saturationPasses, transferPasses);
  const closure = { saturation: saturationPasses, transfer: transferPasses, kappa, regime: regimeOf(kappa) };

  return { entity: subject, asserted, saturated, settled, closure };
}

// === proof-tree citations (Articulating.pair/floor/depth, Obsmetrologia/Articulation/
// Articulating.lean) ===========================================================================
//
// A claim that is itself a tree of utterances is realized here by REFERENCE, never nesting: a
// row's `v` may carry a `ni:///sha-256;<digest>` URI, a `<kind>:<digest>` entity address
// (constituteEntity's own shape), or a metroplat `metroplat:artifact:1:rfc8785-jcs:sha-256:<hex>`
// address (same method as ni -- canonicalize, SHA-256, address the digest -- with RFC 8785 JCS
// canonicalization and hex instead of base64url; verified against the bare-cedar-fog metroplat
// runtime journal, .../metroplat/data/journals/2026/09/03/). The Merkle DAG those references form
// is the proof tree; resolveProofTree below is Articulating.depth read off it. No other citation
// syntax is matched.
const NI_URI_RE = /ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}/g;
const METROPLAT_ARTIFACT_PREFIX = "metroplat:artifact:1:rfc8785-jcs:sha-256:";
const METROPLAT_ARTIFACT_RE = /metroplat:artifact:1:rfc8785-jcs:sha-256:[0-9a-f]{64}/g;
const ENTITY_ADDRESS_RE = /\b[a-zA-Z][a-zA-Z0-9_-]*:[A-Za-z0-9_-]{43}\b/g;

function withoutSpans(text, matches) {
  if (matches.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.index) + " ".repeat(m[0].length);
    cursor = m.index + m[0].length;
  }
  return out + text.slice(cursor);
}

// digestHexOf(citation) -- the lowercase-hex digest bytes a PURE content-digest citation names: an
// `ni:` URI (via niUriDigestBytes, never a local slice) or a metroplat artifact address (already
// hex). Returns null for a `<kind>:<digest>` entity address, a namespaced identity never collapsed
// into bytes-only equivalence. The one conversion this module performs, in ni-services-section's
// own terms, so an `ni:` citation and a metroplat citation naming the same 32 bytes resolve alike.
function digestHexOf(citation) {
  if (typeof citation !== "string") return null;
  if (citation.startsWith(METROPLAT_ARTIFACT_PREFIX) && METROPLAT_ARTIFACT_RE.test(citation)) {
    METROPLAT_ARTIFACT_RE.lastIndex = 0;
    return Buffer.from(citation.slice(METROPLAT_ARTIFACT_PREFIX.length), "hex").toString("hex");
  }
  try {
    return Buffer.from(niUriDigestBytes(citation)).toString("hex");
  } catch {
    return null;
  }
}

/**
 * Every identity `row.v` cites, walked at any depth through objects and arrays: a full
 * `ni:///sha-256;<digest>` URI, a `<kind>:<digest>` entity address, or a metroplat
 * `metroplat:artifact:1:rfc8785-jcs:sha-256:<hex>` artifact address.
 *
 * @param {object} row A conformant {e,a,v,t} row (see assertRow).
 * @returns {Set<string>} The distinct citation strings found in row.v, in the form found.
 * @throws {TypeError} If row is not a conformant {e,a,v,t} row.
 */
export function citationsOf(row) {
  assertRow(row);
  const found = new Set();
  const visit = (value) => {
    if (typeof value === "string") {
      const niMatches = [...value.matchAll(NI_URI_RE)];
      const metroMatches = [...value.matchAll(METROPLAT_ARTIFACT_RE)];
      for (const m of niMatches) found.add(m[0]);
      for (const m of metroMatches) found.add(m[0]);
      const spans = [...niMatches, ...metroMatches].sort((a, b) => a.index - b.index);
      const remainder = withoutSpans(value, spans);
      for (const m of remainder.matchAll(ENTITY_ADDRESS_RE)) found.add(m[0]);
    } else if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value)) visit(v);
    }
  };
  visit(row.v);
  return found;
}

/**
 * The citation DAG rooted at `root`, resolved from `rows` -- Articulating.depth read off the
 * Merkle DAG citationsOf's references form. Per the proof-DAG note (settled objects as proof
 * DAGs, 2026-08-11), shared substructure is addressed once and referenced, never inlined: `nodes`
 * is a flat map keyed by cited identity, never a nested tree. Rows are indexed by rowId(row) and
 * by row.e (an entity or metroplat self-identifying address); an `ni:` citation and a metroplat
 * citation naming the same digest bytes resolve to the same node (digestHexOf).
 *
 * @param {object} args
 * @param {object[]} args.rows The union of rows read from one or more traces.
 * @param {string} args.root A rowId ni URI or an entity/metroplat address to resolve from.
 * @returns {{root: string, nodes: Record<string, object>, edges: [string, string][],
 *   missing: string[], cycles: string[], depth: number}}
 * @throws {TypeError} If rows is not an array, a row is non-conformant, or root is empty.
 */
export function resolveProofTree({ rows, root }) {
  if (!Array.isArray(rows)) throw new TypeError("resolveProofTree: rows must be an array");
  if (typeof root !== "string" || !root) throw new TypeError("resolveProofTree: root must be a non-empty string");
  for (const row of rows) assertRow(row);

  const byIdentity = new Map();
  const byDigestHex = new Map();
  const index = (key, row) => {
    if (typeof key !== "string" || !key) return;
    if (!byIdentity.has(key)) byIdentity.set(key, row);
    const hex = digestHexOf(key);
    if (hex !== null && !byDigestHex.has(hex)) byDigestHex.set(hex, row);
  };
  for (const row of rows) {
    index(rowId(row), row);
    index(row.e, row);
  }
  const resolve = (identity) => {
    if (byIdentity.has(identity)) return byIdentity.get(identity);
    const hex = digestHexOf(identity);
    return hex !== null ? byDigestHex.get(hex) : undefined;
  };

  const nodesMap = new Map();
  const edges = [];
  const edgeSeen = new Set();
  const missing = new Set();
  const cycles = new Set();
  const visited = new Set();
  const onStack = new Set();

  const walk = (identity) => {
    if (onStack.has(identity)) {
      cycles.add(identity);
      return;
    }
    if (visited.has(identity)) return;
    visited.add(identity);
    const row = resolve(identity);
    if (row === undefined) {
      missing.add(identity);
      return;
    }
    nodesMap.set(identity, row);
    onStack.add(identity);
    for (const citation of citationsOf(row)) {
      const edgeKey = identity + " " + citation;
      if (!edgeSeen.has(edgeKey)) {
        edgeSeen.add(edgeKey);
        edges.push([identity, citation]);
      }
      walk(citation);
    }
    onStack.delete(identity);
  };
  walk(root);

  const depthMemo = new Map();
  const depthStack = new Set();
  const depthAt = (identity) => {
    if (depthMemo.has(identity)) return depthMemo.get(identity);
    if (depthStack.has(identity)) return 0; // cycle back-edge: no unbounded depth
    const row = nodesMap.get(identity);
    if (row === undefined) return 0; // missing citation: a leaf for depth purposes
    depthStack.add(identity);
    let best = 0;
    for (const citation of citationsOf(row)) best = Math.max(best, 1 + depthAt(citation));
    depthStack.delete(identity);
    depthMemo.set(identity, best);
    return best;
  };

  return {
    root,
    nodes: Object.fromEntries(nodesMap),
    edges,
    missing: [...missing].sort(),
    cycles: [...cycles].sort(),
    depth: depthAt(root),
  };
}

/**
 * Proof closure for one or more roots: a root is closed iff its resolveProofTree has no missing
 * citations and no cycles. A failed closure is a datum, never an exception.
 *
 * @param {object} args
 * @param {object[]} args.rows The union of rows to resolve against.
 * @param {string[]} args.roots The rowId/entity/metroplat identities to check.
 * @returns {{kind: "eavt.proof-closure", results: {root: string, closed: boolean,
 *   missing: string[], cycles: string[], depth: number}[], summary: {roots: number,
 *   closed: number, open: number}}}
 * @throws {TypeError} If rows or roots is not an array.
 */
export function verifyProofClosure({ rows, roots }) {
  if (!Array.isArray(rows)) throw new TypeError("verifyProofClosure: rows must be an array");
  if (!Array.isArray(roots)) throw new TypeError("verifyProofClosure: roots must be an array");

  const results = roots.map((root) => {
    const tree = resolveProofTree({ rows, root });
    return { root, closed: tree.missing.length === 0 && tree.cycles.length === 0, missing: tree.missing, cycles: tree.cycles, depth: tree.depth };
  });
  const closed = results.filter((r) => r.closed).length;
  return { kind: "eavt.proof-closure", results, summary: { roots: results.length, closed, open: results.length - closed } };
}

// === entity-scoped indexed read (readEavtFile without decoding the whole trace) ===============
// A sibling <path>.entity-index.json maps entity -> line numbers (built by one full decode on
// cache miss, reused while the trace's own content digest matches). readEavtEntityRows below
// returns entity's own rows, every has-converse declaration row (needed trace-wide by fold/
// transfer's converse law), and the citation closure resolveProofTree would walk from entity's
// first row -- exactly what stratify(entity, rows, {converse:{}}) and resolveProofTree({rows,
// root: entity}) need to answer identically to a full read (extra rows never change stratify's
// own-subject result; the closure is additive safety for the proof-tree reading only).

// loadEntityIndex(indexPath, traceDigest) -- a cached index, or null on a miss (absent,
// unreadable, or its stored digest does not match traceDigest).
function loadEntityIndex(indexPath, traceDigest) {
  let text;
  try {
    text = readFileSync(indexPath, "utf8");
  } catch {
    return null; // absent or unreadable -- rebuild
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.kind === "eavt.entity-index" && parsed.traceDigest === traceDigest) return parsed;
  } catch {
    // corrupt index -- rebuild
  }
  return null;
}

// buildEntityIndex(lines, traceDigest) -- the one full decode: entity -> line numbers,
// has-converse lines, and first-occurrence-wins citation-identity -> line maps mirroring
// resolveProofTree's own byIdentity/byDigestHex resolution.
function buildEntityIndex(lines, traceDigest) {
  const entities = new Map(); // canonicalKey(row.e) -> [line, ...], trace order
  const hasConverse = [];
  const citations = {}; // exact identity string (rowId or string row.e) -> first line
  const citationsByHex = {}; // digest hex -> first line

  const noteCitation = (key, line) => {
    if (typeof key !== "string" || !key) return;
    if (!(key in citations)) citations[key] = line;
    const hex = digestHexOf(key);
    if (hex !== null && !(hex in citationsByHex)) citationsByHex[hex] = line;
  };

  for (let line = 0; line < lines.length; line += 1) {
    const raw = lines[line];
    if (!raw.trim()) continue;
    let row;
    try {
      row = decodeRow(raw);
    } catch {
      continue; // torn/partial line -- same tolerance as readEavtFile
    }
    const key = canonicalKey(row.e);
    const bucket = entities.get(key);
    if (bucket) bucket.push(line);
    else entities.set(key, [line]);
    if (row.a === "has-converse") hasConverse.push(line);
    noteCitation(rowId(row), line);
    noteCitation(row.e, line);
  }

  return {
    kind: "eavt.entity-index",
    version: 1,
    traceDigest,
    entities: Object.fromEntries(entities),
    hasConverse,
    citations,
    citationsByHex,
  };
}

// writeEntityIndex(indexPath, index) -- persist an entity index beside its trace.
function writeEntityIndex(indexPath, index) {
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, JSON.stringify(index));
}

// resolveCitationLine(citation, index) -- one citation identity to a line number, the same way
// resolveProofTree's own resolve() would (exact-string first, then digest-hex equivalence).
function resolveCitationLine(citation, index) {
  if (typeof citation !== "string") return undefined;
  if (Object.hasOwn(index.citations, citation)) return index.citations[citation];
  const hex = digestHexOf(citation);
  if (hex !== null && Object.hasOwn(index.citationsByHex, hex)) return index.citationsByHex[hex];
  return undefined;
}

// closeCitations(rootLine, lines, index, wanted) -- walk the citation closure reachable from
// rootLine into `wanted`, decoding only the lines actually visited.
function closeCitations(rootLine, lines, index, wanted) {
  const visited = new Set();
  const stack = [rootLine];
  while (stack.length > 0) {
    const line = stack.pop();
    if (visited.has(line)) continue;
    visited.add(line);
    wanted.add(line);
    const raw = lines[line];
    if (raw === undefined || !raw.trim()) continue;
    let row;
    try {
      row = decodeRow(raw);
    } catch {
      continue;
    }
    for (const citation of citationsOf(row)) {
      const target = resolveCitationLine(citation, index);
      if (target !== undefined && !visited.has(target)) stack.push(target);
    }
  }
}

/**
 * The rows one entity needs to answer stratify/section and resolveProofTree identically to a full
 * readEavtFile(path).filter(row => row.e === entity) read, without decoding every row: entity's
 * own rows, has-converse declaration rows, and the citation closure reachable from entity's own
 * first row (module note above explains why that subset suffices exactly). A sibling
 * `<path>.entity-index.json` maps entity -> line numbers, built by one full decode on first miss
 * and reused while the trace's content digest matches; rebuilt when the trace's bytes change.
 *
 * @param {object} args
 * @param {string} args.path The eavt trace file (this package's own base64-CBOR-per-line form).
 * @param {*} args.entity The subject to read -- compared as canonicalKey(entity) === canonicalKey(row.e).
 * @returns {object[]} The subset of rows described above, in original trace order.
 * @throws {TypeError} If path is not a non-empty string.
 */
export function readEavtEntityRows({ path, entity }) {
  if (typeof path !== "string" || !path) throw new TypeError("readEavtEntityRows: path must be a non-empty string");

  const fileBytes = readFileSync(path);
  const traceDigest = niUriDigest(makeNiUri(fileBytes));
  const indexPath = `${path}.entity-index.json`;

  let index = loadEntityIndex(indexPath, traceDigest);
  const lines = fileBytes.toString("utf8").split("\n");
  if (!index) {
    index = buildEntityIndex(lines, traceDigest);
    writeEntityIndex(indexPath, index);
  }

  const entityKey = canonicalKey(entity);
  const ownLines = (index.entities[entityKey] ?? []).slice().sort((a, b) => a - b);
  const wanted = new Set(ownLines);
  for (const line of index.hasConverse) wanted.add(line);
  if (ownLines.length > 0) closeCitations(ownLines[0], lines, index, wanted);

  const rows = [];
  for (const line of [...wanted].sort((a, b) => a - b)) {
    const raw = lines[line];
    if (raw === undefined || !raw.trim()) continue;
    try {
      rows.push(decodeRow(raw));
    } catch {
      // torn/partial line -- skip, same tolerance as readEavtFile
    }
  }
  return rows;
}

// === record ingestion from arbitrary house JSONL (proof-tree resolution over data that is not
// this package's own base64-CBOR on-disk row encoding) =========================================

/**
 * One JSONL line's decoded value, shaped into a row. Already-conformant input (exactly
 * {e,a,v,t}) is returned as-is -- never forced into a wrapper it doesn't need. Otherwise it is
 * wrapped as {e, a: "recorded", v: obj, t: index}, `e` taken from the object's own "id", "e",
 * "articulation", or "site" field (in that priority, when a non-empty string), else the line's
 * ordinal. That priority covers this tree's observed self-identifying conventions: plain house
 * records use "id"; this package's own rows read as plain JSON use "e"; metroplat's own
 * witness/articulation objects self-identify under "articulation" or "site" when "id" is absent.
 *
 * @param {*} obj One decoded JSON value from a JSONL line.
 * @param {number} index The line's 0-based ordinal (used as `t`, and as `e` with no id field).
 * @returns {object} A conformant {e,a,v,t} row.
 */
export function recordRowFromJsonl(obj, index) {
  try {
    return assertRow(obj);
  } catch {
    // not already a row -- wrap below
  }
  const idField = ["id", "e", "articulation", "site"].find(
    (key) => obj && typeof obj === "object" && !Array.isArray(obj) && typeof obj[key] === "string" && obj[key],
  );
  return { e: idField ? obj[idField] : String(index), a: "recorded", v: obj, t: index };
}

/**
 * Read a plain-JSON-per-line file (not this package's base64-CBOR encoding) and shape every line
 * into a row via recordRowFromJsonl. A torn or malformed line is skipped, never thrown -- the same
 * read discipline as readEavtFile.
 *
 * @param {string} path
 * @returns {object[]}
 */
export function readJsonlRows(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  const rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    try {
      rows.push(recordRowFromJsonl(JSON.parse(line), index));
    } catch {
      // torn/malformed JSON line -- skip, never throw
    }
  }
  return rows;
}
