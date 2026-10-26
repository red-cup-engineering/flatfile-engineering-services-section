import { rationalParts } from "@red-cup-engineering/exact-number-data-service/exact-number";

/** Preserve the original resource-flow wire spelling of a shared exact rational. */
export function resourceRatioString(value) {
  const [numerator, denominator] = rationalParts(value);
  return denominator === 1n ? String(numerator) : `${numerator}/${denominator}`;
}
