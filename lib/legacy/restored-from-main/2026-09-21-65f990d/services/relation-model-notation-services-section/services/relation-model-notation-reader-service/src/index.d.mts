import type { Tm } from "@red-cup-engineering/relation-model-notation/types";

export const RMN_JSON: "application/rmn+json; charset=utf-8";
export function isRelationalTerm(value: unknown): value is Tm;
export function parseRmn(source: string): Tm;
export function settleRmn(term: Tm): Tm;
export function extractRelationalScripts(html: string): string[];
export function htmlIsRelational(html: string): boolean;
export function settleRelationalHtml(html: string): Tm[];
export function sessionIsRelational(messages: readonly unknown[]): boolean;
export function settleRelationalSession(messages: readonly unknown[]): Tm[];
