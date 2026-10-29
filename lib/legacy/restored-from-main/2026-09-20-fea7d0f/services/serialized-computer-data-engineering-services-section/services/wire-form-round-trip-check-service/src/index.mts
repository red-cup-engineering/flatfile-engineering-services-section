/**
 * Generic lossless round-trip checks for named wire-form readings of EAVT
 * witness rows and ordered witness logs.
 */
import { asEntry as eavtRecord, type WitnessJournalEntry as EAVTRecord } from "@red-cup-engineering/eavt/row";
import { canonical, type JsonValue } from "@red-cup-engineering/json-services-section";

export type WitnessRow = EAVTRecord;
export type WitnessLog = readonly WitnessRow[];

export interface ReadingDescriptor {
  readonly id: string;
}

export interface Reading<Wire> extends ReadingDescriptor {
  readonly toWire: (witness: WitnessRow) => Wire;
  readonly fromWire: (wire: Wire) => WitnessRow;
}

export interface LogReadingDescriptor {
  readonly id: string;
}

export interface LogReading<Wire> extends LogReadingDescriptor {
  readonly toWire: (witnessLog: WitnessLog) => Wire;
  readonly fromWire: (wire: Wire) => WitnessLog;
}

function assertNonEmptyId(id: string, context: string): void {
  if (typeof id !== "string" || id.length < 1) {
    throw new TypeError(`${context}: id must be a non-empty string`);
  }
}

function witnessLogRecord(log: WitnessLog): WitnessLog {
  return Object.freeze(log.map((row) => eavtRecord(row)));
}

export function sameWitness(left: WitnessRow, right: WitnessRow): boolean {
  return canonical(eavtRecord(left) as unknown as JsonValue) === canonical(eavtRecord(right) as unknown as JsonValue);
}

export function sameWitnessLog(left: WitnessLog, right: WitnessLog): boolean {
  return canonical(witnessLogRecord(left) as unknown as JsonValue) === canonical(witnessLogRecord(right) as unknown as JsonValue);
}

export function isReadingIso<Wire>(reading: Reading<Wire>, witness: WitnessRow): boolean {
  assertNonEmptyId(reading.id, "reading");
  return sameWitness(reading.fromWire(reading.toWire(witness)), witness);
}

export function isLogReadingIso<Wire>(reading: LogReading<Wire>, witnessLog: WitnessLog): boolean {
  assertNonEmptyId(reading.id, "log reading");
  return sameWitnessLog(reading.fromWire(reading.toWire(witnessLog)), witnessLog);
}

export function readingsHopLosslessly<FromWire, ToWire>(
  from: Reading<FromWire>,
  to: Reading<ToWire>,
  witness: WitnessRow,
): boolean {
  const pivot = from.fromWire(from.toWire(witness));
  return sameWitness(to.fromWire(to.toWire(pivot)), witness);
}

export function logReadingsHopLosslessly<FromWire, ToWire>(
  from: LogReading<FromWire>,
  to: LogReading<ToWire>,
  witnessLog: WitnessLog,
): boolean {
  const pivot = from.fromWire(from.toWire(witnessLog));
  return sameWitnessLog(to.fromWire(to.toWire(pivot)), witnessLog);
}

export function readingAsLogReading<Wire>(reading: Reading<Wire>): LogReading<Wire> {
  return Object.freeze({
    id: reading.id,
    toWire: (witnessLog: WitnessLog): Wire => {
      if (witnessLog.length !== 1) throw new TypeError(`${reading.id}: 1-block reading requires exactly one witness row`);
      return reading.toWire(witnessLog[0]!);
    },
    fromWire: (wire: Wire): WitnessLog => Object.freeze([reading.fromWire(wire)]),
  });
}

const registeredReadings = new Map<string, Reading<unknown>>();
const registeredLogReadings = new Map<string, LogReading<unknown>>();

export function registerReading<Wire>(reading: Reading<Wire>): Reading<Wire> {
  assertNonEmptyId(reading.id, "reading");
  registeredReadings.set(reading.id, reading as Reading<unknown>);
  return reading;
}

export function registerLogReading<Wire>(reading: LogReading<Wire>): LogReading<Wire> {
  assertNonEmptyId(reading.id, "log reading");
  registeredLogReadings.set(reading.id, reading as LogReading<unknown>);
  return reading;
}

export function readingById(id: string): Reading<unknown> | undefined {
  return registeredReadings.get(id);
}

export function logReadingById(id: string): LogReading<unknown> | undefined {
  return registeredLogReadings.get(id);
}

export function readings(): readonly Reading<unknown>[] {
  return Object.freeze([...registeredReadings.values()]);
}

export function logReadings(): readonly LogReading<unknown>[] {
  return Object.freeze([...registeredLogReadings.values()]);
}
