import { parseLines, serializeLines } from "@red-cup-engineering/computer-data-engine/json";
import { assertRow } from "./eavt.mjs";

/**
 * Parses a strict EAVT JSON-lines wire document.
 * @param {string} content JSON-lines text containing only exact EAVT objects.
 * @returns {object[]} Admitted EAVT rows.
 * @throws {TypeError} When any nonblank line is not an admitted EAVT row.
 */
export function parseEavtJsonLines(content) {
  return parseLines(content).map((value) => assertRow(value));
}

/**
 * Serializes admitted EAVT rows as canonical JSON-lines wire bytes.
 * @param {readonly object[]} rows EAVT rows.
 * @returns {string} Canonical JSON-lines text.
 * @throws {TypeError} When a row is not admitted.
 */
export function serializeEavtJsonLines(rows) {
  return serializeLines(rows.map((row) => assertRow(row)));
}

/**
 * Explicitly converts the retired four-tuple JSON-lines wire form to EAVT objects.
 * @param {readonly unknown[]} tuple A legacy `[e,a,v,t]` tuple.
 * @returns {object} An admitted EAVT row.
 * @throws {TypeError} When the tuple is not exactly four JSON values.
 */
export function convertLegacyEavtTuple(tuple) {
  if (!Array.isArray(tuple) || tuple.length !== 4) throw new TypeError("legacy EAVT tuple must be exactly [e,a,v,t]");
  return assertRow({ e: tuple[0], a: tuple[1], v: tuple[2], t: tuple[3] });
}
