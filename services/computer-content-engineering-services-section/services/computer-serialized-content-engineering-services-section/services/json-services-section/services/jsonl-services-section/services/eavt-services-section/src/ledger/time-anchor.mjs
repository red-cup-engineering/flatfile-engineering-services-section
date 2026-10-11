/**
 * ledger/time-anchor - OpenTimestamps/RFC-3161 as externally verifiable T.
 *
 * This is a structural model, not an OpenTimestamps calendar client and not an
 * RFC-3161 TSA implementation. The attestation is a deterministic commitment
 * over the witness hash, calendar, authority, and attested time.
 */

import {
  timeAnchorCarrier,
  timeAnchorReadingCarrier,
  timeAnchorReadingSchema,
  timeAnchorSchema,
  timestampedWitnessCarrier,
  timestampedWitnessSchema,
} from "./time-anchor-schema.mjs";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { eavtId, eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

export {
  timeAnchorCarrier,
  timeAnchorReadingCarrier,
  timeAnchorReadingSchema,
  timeAnchorSchema,
  timestampedWitnessCarrier,
  timestampedWitnessSchema,
} from "./time-anchor-schema.mjs";


function commitmentPayload(witnessHash) {
  return requireJsonValue({ kind: "relating.ledger.time-anchor.commitment", witnessHash }, "time-anchor commitment");
}

function attestationPayload(anchor) {
  return requireJsonValue({
    kind: anchor.kind,
    standard: anchor.standard,
    calendar: anchor.calendar,
    authority: anchor.authority,
    witnessHash: anchor.witnessHash,
    witnessTime: anchor.witnessTime,
    attestedTime: anchor.attestedTime,
    commitment: anchor.commitment,
  }, "time-anchor attestation payload");
}

export function anchorWitnessTime(row, input) {
  const witness = eavtRecord(row);
  const witnessHash = eavtId(witness);
  const base = Object.freeze({
    kind: "relating.ledger.time-anchor.anchor",
    standard: "opentimestamps/rfc3161.structural",
    calendar: input.calendar,
    authority: input.authority,
    witnessHash,
    witnessTime: witness.t,
    attestedTime: input.attestedTime,
    commitment: semanticId(commitmentPayload(witnessHash)),
  });
  const anchor = timeAnchorCarrier.assert(Object.freeze({
    ...base,
    digest: semanticId(attestationPayload(base)),
  }), "time anchor");
  return timestampedWitnessCarrier.assert(Object.freeze({
    kind: "relating.ledger.time-anchor.timestamped-witness",
    witness,
    anchor,
  }), "timestamped witness");
}

export function verifyTimestampedWitness(value) {
  try {
    timestampedWitnessCarrier.assert(value, "timestamped witness");
    const witnessHash = eavtId(value.witness);
    const anchor = value.anchor;
    const expectedBase = Object.freeze({
      kind: anchor.kind,
      standard: anchor.standard,
      calendar: anchor.calendar,
      authority: anchor.authority,
      witnessHash: anchor.witnessHash,
      witnessTime: anchor.witnessTime,
      attestedTime: anchor.attestedTime,
      commitment: anchor.commitment,
    });
    return anchor.witnessHash === witnessHash &&
      canonical(anchor.witnessTime) === canonical(value.witness.t) &&
      anchor.commitment === semanticId(commitmentPayload(witnessHash)) &&
      anchor.digest === semanticId(attestationPayload(expectedBase));
  } catch {
    return false;
  }
}

export function timestampedWitnessToDatom(value) {
  const reading = timeAnchorReadingCarrier.assert(Object.freeze({
    kind: "relating.ledger.time-anchor.reading",
    standard: "opentimestamps/rfc3161.structural",
    anchor: value.anchor,
    verified: verifyTimestampedWitness(value),
  }), "time-anchor reading");
  return Object.freeze([value.witness.e, value.witness.a, value.witness.v, value.witness.t, reading]);
}

export function externallyAnchoredTime(value) {
  if (!verifyTimestampedWitness(value)) throw new Error("externallyAnchoredTime: invalid time anchor");
  return value.anchor.attestedTime;
}

function compareDatetime(left, right) {
  const l = Date.parse(left);
  const r = Date.parse(right);
  if (Number.isFinite(l) && Number.isFinite(r)) return l - r;
  return left.localeCompare(right);
}

export function anchoredTimeMonotone(values) {
  let prior;
  for (const value of values) {
    if (!verifyTimestampedWitness(value)) return false;
    const current = value.anchor.attestedTime;
    if (prior !== undefined && compareDatetime(prior, current) > 0) return false;
    prior = current;
  }
  return true;
}
