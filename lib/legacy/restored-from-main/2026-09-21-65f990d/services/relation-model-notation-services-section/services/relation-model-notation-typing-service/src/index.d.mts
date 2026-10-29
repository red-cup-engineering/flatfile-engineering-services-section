import type { Tm, Ty } from "@red-cup-engineering/relation-model-notation/types";

export function tyEqual(left: Ty, right: Ty): boolean;
export function judgeRmn(context: readonly Ty[], term: Tm, expected?: Ty): Ty | boolean | null;
export function inferTy(context: readonly Ty[], term: Tm): Ty | null;
export function checkTy(context: readonly Ty[], term: Tm, type: Ty): boolean;
export const hasTy: typeof checkTy;
export function termSize(term: Tm): number;
export function termUses(term: Tm): readonly string[];
export function isClosed(term: Tm): boolean;
