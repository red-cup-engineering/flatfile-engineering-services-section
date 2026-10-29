import type { Tm } from "@red-cup-engineering/relation-model-notation/types";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export function step(term: Tm): readonly Tm[];
export function dev(term: Tm): Tm;
export function normalize(term: Tm): Tm;
export function evaluate(term: Tm): Tm;
export { evaluate as eval };
export function evaluateRunTerm(runTerm: Tm, input: JsonValue): JsonValue;
