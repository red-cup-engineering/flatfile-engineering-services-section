#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readFileSync } from "node:fs";
import { eavtRow } from "@red-cup-engineering/eavt-services-section/admit-row";
import {
  inferTy,
  isClosed,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { jsonToTerm, termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitCell, address as cellAddress } from "@red-cup-engineering/signcell/cell";
import { isAbsoluteSeavtClock } from "./clock.mjs";
export { isAbsoluteSeavtClock, compareAbsoluteSeavtClocks, sourceClocksVisibleAt } from "./clock.mjs";
export const inputSchema = {
  type: "object",
  properties: {
    e: { type: "array" },
    a: { type: "array" },
    v: { type: "array" },
    t: {},
  },
  required: ["e", "a", "v", "t"],
  additionalProperties: false,
};
export const outputSchema = {
  type: "object",
  properties: {
    e: { type: "array" },
    a: { type: "array" },
    v: { type: "array" },
    t: {},
  },
  required: ["e", "a", "v", "t"],
  additionalProperties: false,
};
export function seavtRow(value) {
  const row = eavtRow(value);
  for (const key of ["e", "a", "v"]) {
    if (!Array.isArray(row[key]))
      throw new TypeError(`SEAVT row field "${key}" must be an SEN JSON array`);
    try {
      if (inferTy([], row[key]) === null || !isClosed(row[key])) throw Error();
    } catch {
      throw new TypeError(
        `SEAVT row field "${key}" must be a closed, inferable SEN term`,
      );
    }
  }
  return row;
}
/** One SEAVT row from its coordinates: e, a and v are notation terms, t the time. */
export function seavt(entity, attribute, value, time) {
  return seavtRow({ e: entity, a: attribute, v: value, t: time });
}

/** One SEAVT row from JSON coordinates, admitted into the notation through the
 * JSON bridge: the form a boundary that receives plain JSON writes. */
export function seavtOfJson(entity, attribute, value, time) {
  return seavt(jsonToTerm(entity), jsonToTerm(attribute), jsonToTerm(value), time);
}

/**
 * The native SignCell -> SCA -> SEN -> SEAVT projection.
 *
 * SignCell owns the semantic triple and both evidence sides; its SCA address
 * names the TRIPLE, so that address remains stable as witnesses accumulate.
 * SEN is the admitted typed-JSON expression of that same cell; SEAVT places
 * its presentation at the original observed/received time.
 *
 * This is a pure VIEW over an already-owned SignCell. It does not create
 * another truth judgment, database, journal, signer or economic fact.
 * Raw source bytes remain retained in their original custody: never convert
 * bytes or a provider's JSON claim into authenticated truth by projection.
 */
export function seavtOfSignCell(input, observedAt) {
  if (!isAbsoluteSeavtClock(observedAt))
    throw new TypeError("SignCell SEAVT observation requires an absolute source/receiver clock");
  const admitted = admitCell(input);
  // The carrier and evidence are kept ENTIRE: not a hand-picked parallel
  // schema that could quietly drop opposing evidence, epistemic valuation,
  // source identity, or exact financial units.
  return seavtOfJson(cellAddress(admitted), "signcell:cell", admitted, observedAt);
}

/** Recover the exact original SignCell (and FOUR evidence) from its SEN/SEAVT
 * presentation, rejecting an invented or mismatched SCA subject. */
export function signCellOfSeavt(input) {
  const row = seavtRow(input);
  if (!isAbsoluteSeavtClock(row.t) || termToJson(row.a) !== "signcell:cell")
    throw new TypeError("native SignCell SEAVT coordinate and source clock required");
  const identity = termToJson(row.e);
  if (typeof identity !== "string")
    throw new TypeError("SCA SignCell address coordinate required");
  const admitted = admitCell(termToJson(row.v));
  if (cellAddress(admitted) !== identity)
    throw new RangeError("SCA SignCell address differs from the SEN/SEAVT subject");
  return admitted;
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(seavtRow(JSON.parse(readCarrierInput(0, "utf8")))) + "\n",
  );
