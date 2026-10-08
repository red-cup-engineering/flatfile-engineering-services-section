/**
 * settling/carrier — ranked-readings carriers.
 *
 * A small helper: wrap a list of readings with its Natural rank, and select a
 * sub-kind of readings into its own ranked carrier. Used by the gap and
 * consistency analyses to bundle and partition their per-cell readings.
 */
import { count } from "@red-cup-engineering/exact-number-data-service/exact-number";
/** Wrap readings with their count as rank. */
export const rankedReadings = (kind, readings) => Object.freeze({
    kind,
    readings: Object.freeze([...readings]),
    rank: count(readings),
});
/** Select a sub-kind of readings into its own ranked carrier. */
export const selectRankedReadings = (kind, readings, select) => rankedReadings(kind, readings.filter(select));
