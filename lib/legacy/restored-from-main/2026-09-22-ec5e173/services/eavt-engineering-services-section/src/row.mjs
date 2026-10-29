// witness-journal-entry-service — pure entry law.
//
// A witness-journal entry is SEAVT (Semiotic EAVT). E, A, and V are closed,
// inferable Relation Model Notation terms carried directly as JSON arrays; T
// is stored time. The generic JSON constructor below is a separate EAVT
// utility, not a source format for semantic claims. An entry carries no
// charge (a charge is a
// reading, a projection computed over entries by the state service, never a
// field stored on one entry) and no stored trace (a trace is an entry's
// ordinal in its journal, computed by the log service at read time, never
// carried by the entry itself). This module only builds and validates
// entries; it performs no I/O and knows nothing about a journal's append
// order.
//
// `seavt` is the strict constructor. `entry`/`isEntry` describe only the
// general JSON EAVT shape, including its optional predicate hook.

import { isJsonValue, canonical } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { EAVT_ROW_PROFILE, SEAVT_PROFILE } from "./profile.mjs";
import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy, isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";

function isEavtShape(value) {
  return Array.isArray(value) && value.length === EAVT_ROW_PROFILE.coordinates.length && value.every(isJsonValue);
}

function eavtRecord(row) {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  return Object.freeze({ e: row.e, a: row.a, v: row.v, t: row.t });
}

/**
 * @typedef {{ readonly e: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue,
 *             readonly a: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue,
 *             readonly v: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue,
 *             readonly t: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue }} WitnessJournalEntry
 */

/**
 * @typedef {{ readonly e: readonly unknown[], readonly a: readonly unknown[], readonly v: readonly unknown[],
 *             readonly t: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue }} Seavt
 */

/**
 * @typedef {{ readonly e: readonly unknown[], readonly a: readonly unknown[], readonly v: readonly unknown[],
 *             readonly t: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue }} SeavtReadout
 */

function present(value) {
  return value !== undefined;
}

/**
 * Assert that a value is shaped like a witness-journal entry: an object with
 * present, JSON-valued `e`, `a`, `v`, `t`, or the four-element tuple spelling
 * `[e, a, v, t]`. Throws a `TypeError` naming the first law it breaks.
 *
 * @param {unknown} value
 */
/** Admit the canonical generic EAVT object spelling used by the typed engine.
 * Tuple compatibility is intentionally left to `asEntry`. */
export function eavtRow(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || Object.keys(value).length !== EAVT_ROW_PROFILE.required.length
    || !EAVT_ROW_PROFILE.required.every((field) => Object.hasOwn(value, field))) {
    throw new TypeError("EAVT row must be exactly JSON {e,a,v,t}");
  }
  assertValidEntry(value);
  return eavtRecord(value);
}

export function assertValidEntry(value) {
  if (Array.isArray(value)) {
    if (value.length !== 4) {
      throw new TypeError("witness-journal entry: tuple spelling must have exactly four parts [e, a, v, t]");
    }
    if (!isEavtShape(value)) {
      throw new TypeError("witness-journal entry: tuple parts must all be JSON values");
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    throw new TypeError("witness-journal entry: must be an object with e, a, v, t or a four-element tuple");
  }
  for (const field of EAVT_ROW_PROFILE.required) {
    if (!present(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" is required`);
    }
    if (!isJsonValue(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" must be a JSON value`);
    }
  }
}

/**
 * Whether a value is shaped like a witness-journal entry (object or tuple
 * spelling). Never throws.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEntry(value) {
  try {
    assertValidEntry(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a valid tuple-or-object row into the canonical `{e, a, v, t}`
 * entry record. Throws if the row is not entry-shaped.
 *
 * @param {unknown} row
 * @returns {WitnessJournalEntry}
 */
export function asEntry(row) {
  assertValidEntry(row);
  return /** @type {WitnessJournalEntry} */ (eavtRecord(/** @type {any} */ (row)));
}

/**
 * Build one witness-journal entry, subject-predicate-object-time.
 *
 * `predicateIsValid`, if supplied, is consulted after presence/JSON-value
 * checks — the seam a future RMN-term checker plugs into without this
 * package needing to depend on the notation section.
 *
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} subject
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} predicate
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} object
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} time
 * @param {{ readonly predicateIsValid?: (predicate: import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue) => boolean }} [options]
 * @returns {WitnessJournalEntry}
 */
export function entry(subject, predicate, object, time, options = {}) {
  const candidate = { e: subject, a: predicate, v: object, t: time };
  assertValidEntry(candidate);
  if (options.predicateIsValid !== undefined && !options.predicateIsValid(predicate)) {
    throw new TypeError("witness-journal entry: predicate (A) failed the supplied RMN-term check");
  }
  return /** @type {WitnessJournalEntry} */ (eavtRecord(candidate));
}

/**
 * Whether two entries are the same witness by canonical content, irrespective
 * of field order or tuple-vs-object spelling.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
export function sameEntry(left, right) {
  return canonical(/** @type {any} */ (asEntry(left))) === canonical(/** @type {any} */ (asEntry(right)));
}

function assertSeavtCoordinate(field, coordinate) {
  if (!SEAVT_PROFILE.directRmnCoordinates.includes(field)) throw new TypeError(`SEAVT row: unknown semantic coordinate "${field}"`);
  if (!Array.isArray(coordinate)) {
    throw new TypeError(`SEAVT row: field "${field}" must be an RMN JSON array`);
  }
  try {
    const type = inferTy([], coordinate);
    if (type === null || !isClosed(coordinate)) {
      throw new TypeError("not a closed, inferable term");
    }
    return type;
  } catch {
    throw new TypeError(`SEAVT row: field "${field}" must be a closed, inferable RMN term`);
  }
}

/**
 * Assert that a row belongs to SEAVT. E, A, and
 * V must be closed, inferable RMN terms carried directly as JSON arrays. T
 * deliberately remains caller-supplied JSON/time material.
 *
 * `assertValidEntry` remains a separate generic compatibility law.
 *
 * @param {unknown} value
 */
export function assertValidSeavt(value) {
  const row = asEntry(value);
  assertSeavtCoordinate("e", row.e);
  assertSeavtCoordinate("a", row.a);
  assertSeavtCoordinate("v", row.v);
}

/**
 * Whether a value belongs to SEAVT. Never throws.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSeavt(value) {
  try {
    assertValidSeavt(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a SEAVT row to its source record. E/A/V remain their direct RMN
 * terms; `readSeavt` returns that same semantic row.
 *
 * @param {unknown} row
 * @returns {Seavt}
 */
export function asSeavt(row) {
  assertValidSeavt(row);
  return /** @type {Seavt} */ (asEntry(row));
}

/**
 * Build one SEAVT source row. It does not store identity, charge, or trace.
 * Semantic identity is earned separately by `identifySeavtSemanticContent`.
 *
 * @param {readonly unknown[]} entity
 * @param {readonly unknown[]} attribute
 * @param {readonly unknown[]} value
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} time
 * @returns {Seavt}
 */
export function seavt(entity, attribute, value, time) {
  return asSeavt(entry(entity, attribute, value, time));
}

/**
 * Pure strict-profile readout. Direct RMN coordinates need no source codec;
 * no identity is decoded and the source row is not mutated.
 *
 * @param {unknown} row
 * @returns {SeavtReadout}
 */
export function readSeavt(row) {
  return asSeavt(row);
}

/**
 * Identify one strict SEAVT witness under explicit custody.
 *
 * E/A/V enter as their direct, typed RMN coordinates. Time and custody remain
 * separate witness material. No FOUR charge is inferred or stored here.
 *
 * General JSON EAVT has no path through this function: `asSeavt` must first
 * admit all three semantic coordinates.
 *
 * @param {unknown} row
 * @param {import("../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs").JsonValue} custody
 */
export function identifySeavtSemanticContent(row, custody) {
  if (!isJsonValue(custody)) {
    throw new TypeError("SEAVT semantic content: custody witness must be a JSON value");
  }
  const source = asSeavt(row);
  const immutable = (value) => {
    const copy = structuredClone(value);
    const freeze = (node) => {
      if (node !== null && typeof node === "object") {
        for (const member of Object.values(node)) freeze(member);
        Object.freeze(node);
      }
      return node;
    };
    return freeze(copy);
  };
  const witness = immutable({
    kind: "witness-journal.seavt.time-custody-witness",
    version: 1,
    time: source.t,
    custody,
  });
  const witnessTerm = jsonToTerm(witness);
  const witnessType = inferTy([], witnessTerm);
  if (witnessType === null) {
    throw new TypeError("SEAVT semantic content: time/custody witness did not infer an RMN type");
  }
  const witnessIdentity = identifyNormalizedSemanticContent({
    objectKind: "witness-journal.seavt.time-custody-witness",
    semanticType: witnessType,
    term: witnessTerm,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  const material = Object.freeze({
    kind: "witness-journal.seavt.semantic-content",
    version: 3,
    coordinates: Object.freeze({ e: source.e, a: source.a, v: source.v }),
    witness,
  });
  const term = jsonToTerm(material);
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    throw new TypeError("SEAVT semantic content: admitted witness material did not infer an RMN type");
  }
  const identity = identifyNormalizedSemanticContent({
    objectKind: "witness-journal.seavt",
    semanticType,
    term,
    witnessRoot: witnessIdentity.token,
  });
  return Object.freeze({ ...identity, source, material, witnessIdentity });
}
