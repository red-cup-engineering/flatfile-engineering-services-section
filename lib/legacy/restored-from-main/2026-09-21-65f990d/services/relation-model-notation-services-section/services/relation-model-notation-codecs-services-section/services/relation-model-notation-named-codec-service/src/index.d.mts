import type { Tm } from "@red-cup-engineering/relation-model-notation/types";

export type NamedPart = string | boolean | NamedTm | readonly NamedTm[];
export type NamedTm = readonly [string, ...NamedPart[]];
export function namedString(value: string): NamedTm;
export function namedArray(items: readonly NamedTm[]): NamedTm;
export function namedObject(entries: ReadonlyArray<readonly [string, NamedTm]>): NamedTm;
export function namedBool(value: boolean): NamedTm;
export function namedGenerator(name: string): NamedTm;
export function compileNamedRmn(surface: NamedTm): Tm;
export function parseNamedRmn(source: string): Tm;
export function canonicalNamedRmn(term: Tm): string;
export function digestNamedRmn(term: Tm): string;
