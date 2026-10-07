#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readFileSync } from "node:fs";
import { eavtRow } from "@red-cup-engineering/eavt/admit-row";
import {
  inferTy,
  isClosed,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
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

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(seavtRow(JSON.parse(readCarrierInput(0, "utf8")))) + "\n",
  );
