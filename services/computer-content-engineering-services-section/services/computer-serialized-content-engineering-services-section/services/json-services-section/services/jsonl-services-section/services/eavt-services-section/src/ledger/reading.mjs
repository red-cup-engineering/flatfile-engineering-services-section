/**
 * ledger/reading - RWIL coherence kernel.
 *
 * A Reading is an isomorphism between one RWIL witness row and one wire form.
 * A LogReading is the same law over an ordered witness log: the higher-block /
 * sliding-window case. Coherence says two readings commute because both
 * round-trip through the shared witness pivot. This generalizes the ActivityPub
 * outbox/log proof without depending on any downstream protocol package.
 */

import {
  coherenceReportCarrier,
  coherenceReportSchema,
  logCoherenceReportCarrier,
  logCoherenceReportSchema,
  logReadingDescriptorCarrier,
  logReadingDescriptorSchema,
  readingDescriptorCarrier,
  readingDescriptorSchema,
} from "./reading-schema.mjs";
import { canonical } from "@red-cup-engineering/json-services-section";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";
export {
  coherenceReportCarrier,
  coherenceReportSchema,
  logCoherenceReportCarrier,
  logCoherenceReportSchema,
  logReadingDescriptorCarrier,
  logReadingDescriptorSchema,
  readingDescriptorCarrier,
  readingDescriptorSchema,
} from "./reading-schema.mjs";

function witnessLogRecord(log) {
  return Object.freeze(log.map((row) => eavtRecord(row)));
}

export function sameWitness(left, right) {
  return canonical(eavtRecord(left)) === canonical(eavtRecord(right));
}

export function sameWitnessLog(left, right) {
  return canonical(witnessLogRecord(left)) === canonical(witnessLogRecord(right));
}

/** A reading is an isomorphism on `witness` when decoding its encoding returns the same row. */
export function isReadingIso(reading, witness) {
  readingDescriptorCarrier.assert({ id: reading.id }, "reading");
  return sameWitness(reading.fromWire(reading.toWire(witness)), witness);
}

export function isLogReadingIso(reading, witnessLog) {
  logReadingDescriptorCarrier.assert({ id: reading.id }, "log reading");
  return sameWitnessLog(reading.fromWire(reading.toWire(witnessLog)), witnessLog);
}

/** Encoding through `from` then `to` returns the witness unchanged. */
export function readingsHopLosslessly(
  from,
  to,
  witness,
) {
  const pivot = from.fromWire(from.toWire(witness));
  return sameWitness(to.fromWire(to.toWire(pivot)), witness);
}

export function logReadingsHopLosslessly(
  from,
  to,
  witnessLog,
) {
  const pivot = from.fromWire(from.toWire(witnessLog));
  return sameWitnessLog(to.fromWire(to.toWire(pivot)), witnessLog);
}

/**
 * Check that two readings are isomorphisms on `witness`, and that each route
 * through the shared witness pivot returns to the same row.
 */
export function cohere(
  left,
  right,
  witness,
) {
  readingDescriptorCarrier.assert({ id: left.id }, "left reading");
  readingDescriptorCarrier.assert({ id: right.id }, "right reading");
  const leftIso = isReadingIso(left, witness);
  const rightIso = isReadingIso(right, witness);
  const leftToRight = readingsHopLosslessly(left, right, witness);
  const rightToLeft = readingsHopLosslessly(right, left, witness);
  return coherenceReportCarrier.assert(Object.freeze({
    kind: "relating.ledger.coherence",
    left: left.id,
    right: right.id,
    witness: eavtRecord(witness),
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  }), "coherence report");
}

/**
 * Check that two higher-block readings are isomorphisms on an ordered witness
 * log, and that each route through the shared log pivot returns to the same log.
 */
export function cohereLog(
  left,
  right,
  witnessLog,
) {
  logReadingDescriptorCarrier.assert({ id: left.id }, "left log reading");
  logReadingDescriptorCarrier.assert({ id: right.id }, "right log reading");
  const admittedLog = witnessLogRecord(witnessLog);
  const leftIso = isLogReadingIso(left, admittedLog);
  const rightIso = isLogReadingIso(right, admittedLog);
  const leftToRight = logReadingsHopLosslessly(left, right, admittedLog);
  const rightToLeft = logReadingsHopLosslessly(right, left, admittedLog);
  return logCoherenceReportCarrier.assert(Object.freeze({
    kind: "relating.ledger.log-coherence",
    left: left.id,
    right: right.id,
    witnessLog: admittedLog,
    leftIso,
    rightIso,
    leftToRight,
    rightToLeft,
    ok: leftIso && rightIso && leftToRight && rightToLeft,
  }), "log coherence report");
}

export function assertCoherent(
  left,
  right,
  witness,
) {
  const report = cohere(left, right, witness);
  if (!report.ok) {
    throw new Error(`RWIL readings do not cohere: ${left.id} <-> ${right.id}`);
  }
  return report;
}

export function assertLogCoherent(
  left,
  right,
  witnessLog,
) {
  const report = cohereLog(left, right, witnessLog);
  if (!report.ok) {
    throw new Error(`RWIL log readings do not cohere: ${left.id} <-> ${right.id}`);
  }
  return report;
}

/** A 1-block reading lifted to a log reading over exactly one witness row. */
export function readingAsLogReading(reading) {
  return Object.freeze({
    id: reading.id,
    toWire: (witnessLog) => {
      if (witnessLog.length !== 1) throw new TypeError(`${reading.id}: 1-block reading requires exactly one witness row`);
      return reading.toWire(witnessLog[0]);
    },
    fromWire: (wire) => Object.freeze([reading.fromWire(wire)]),
  });
}

const registeredReadings = new Map();
const registeredLogReadings = new Map();

export function registerReading(reading) {
  readingDescriptorCarrier.assert({ id: reading.id }, "reading");
  registeredReadings.set(reading.id, reading);
  return reading;
}

export function registerLogReading(reading) {
  logReadingDescriptorCarrier.assert({ id: reading.id }, "log reading");
  registeredLogReadings.set(reading.id, reading);
  return reading;
}

export function readingById(id) {
  return registeredReadings.get(id);
}

export function logReadingById(id) {
  return registeredLogReadings.get(id);
}

export function readings() {
  return Object.freeze([...registeredReadings.values()]);
}

export function logReadings() {
  return Object.freeze([...registeredLogReadings.values()]);
}
