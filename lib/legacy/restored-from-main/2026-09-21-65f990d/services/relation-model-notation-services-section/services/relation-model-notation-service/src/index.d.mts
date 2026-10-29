import type { ChargeValueName, EffectCell, GeneratorName, Tm, Ty } from "./types.mjs";

export type { ChargeValueName, EffectCell, GeneratorName, Tm, Ty } from "./types.mjs";
export { TmSchema, TySchema } from "./schema.mjs";
export { isTerm } from "./validator.mjs";

export type RmnAtomConstraint = "natural" | "text" | "boolean" | "effect-cell" | "ni-sha-256";
export type RmnForm = Readonly<{
  atoms?: Readonly<Record<number, RmnAtomConstraint>>;
  binders?: readonly number[];
  termLists?: readonly number[];
  terms?: readonly number[];
  types?: readonly number[];
}>;
export const RMN_FORMS: Readonly<Record<string, RmnForm>>;

export function validateEffectCell(cell: unknown): EffectCell;
export function validateRmnType(type: unknown): Ty;
export function validateRmnTerm(term: unknown): Tm;
export function mapRmnTerm(term: Tm, visit: (term: Tm, depth: number) => Tm, depth?: number): Tm;
export function mapRmnImmediate(term: Tm, map: (term: Tm, slot: number, listIndex?: number) => Tm): Tm;
export function isRmnValue(term: Tm): boolean;
export function rmnListHeadTail(term: Tm): "empty" | { head: Tm; tail: Tm } | undefined;
export function shiftRmn(delta: number, cutoff: number, term: Tm): Tm;
export function substituteRmn(index: number, replacement: Tm, term: Tm): Tm;
export function instantiateRmn(body: Tm, value: Tm): Tm;

export const ty: Readonly<{
  base(): Ty;
  effect(): Ty;
  arrow(domain: Ty, codomain: Ty): Ty;
  prod(left: Ty, right: Ty): Ty;
  unit(): Ty;
  list(element: Ty): Ty;
}>;

export const chargeValueNames: readonly ChargeValueName[];
export function isChargeValueName(value: string): value is ChargeValueName;
export function generatorNameOfTerm(term: Tm): GeneratorName | undefined;
export function chargeNameOfTerm(term: Tm): ChargeValueName | undefined;
export function boolOfTerm(term: Tm): boolean | undefined;

export const tm: Readonly<{
  var(index: number): Tm;
  lam(body: Tm): Tm;
  app(fn: Tm, arg: Tm): Tm;
  pair(left: Tm, right: Tm): Tm;
  fst(value: Tm): Tm;
  snd(value: Tm): Tm;
  star(): Tm;
  mark(surface: string): Tm;
  effect(cell: EffectCell): Tm;
  charge(name: ChargeValueName): Tm;
  bool(value: boolean): Tm;
  fromCharge(value: Tm): Tm;
  generator(name: GeneratorName): Tm;
  negate(value: Tm): Tm;
  conflate(value: Tm): Tm;
  negConf(value: Tm): Tm;
  joinK(left: Tm, right: Tm): Tm;
  meetK(left: Tm, right: Tm): Tm;
  joinT(left: Tm, right: Tm): Tm;
  meetT(left: Tm, right: Tm): Tm;
  leK(left: Tm, right: Tm): Tm;
  leT(left: Tm, right: Tm): Tm;
  settle(target: Tm, seed: Tm): Tm;
  field(key: string, object: Tm): Tm;
  consArray(element: Tm, array: Tm): Tm;
  reverseArray(array: Tm): Tm;
  append(left: Tm, right: Tm): Tm;
  coincide(left: Tm, right: Tm): Tm;
  cond(test: Tm, then: Tm, otherwise: Tm): Tm;
  fold(combine: Tm, initial: Tm, list: Tm): Tm;
}>;

export function rename(renameIndex: (index: number) => number, term: Tm): Tm;
export function subst(substitute: (index: number) => Tm, term: Tm): Tm;
export function inst(body: Tm, value: Tm): Tm;
