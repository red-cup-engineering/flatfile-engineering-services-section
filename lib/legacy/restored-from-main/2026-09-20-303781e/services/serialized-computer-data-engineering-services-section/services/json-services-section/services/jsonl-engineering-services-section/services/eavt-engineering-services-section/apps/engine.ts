/** A small, total EAVT engine. Values are JSON; rows are immutable facts. */
import { canonicalJson, isJson, type Json } from "../../../../../src/json.mjs";
import { decodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
export type { Json } from "../../../../../src/json.mjs";
export interface Cell extends Readonly<Record<string, Json>> { readonly e: Json; readonly a: Json; readonly v: Json; }
export interface Row extends Cell { readonly t: Json; }
export interface AddressedRow extends Row { readonly id: string; }
export interface Store { read(path: string): readonly string[]; append(path: string, line: string): void; }
export type Request =
  | { readonly operation: "validate"; readonly row: unknown } | { readonly operation: "encode"; readonly row: unknown }
  | { readonly operation: "decode"; readonly line: string } | { readonly operation: "read"; readonly path: string }
  | { readonly operation: "append"; readonly path: string; readonly row: unknown } | { readonly operation: "entities"; readonly rows: readonly unknown[] }
  | { readonly operation: "current"; readonly rows: readonly unknown[] }
  | { readonly operation: "latest"; readonly rows: readonly unknown[]; readonly attributes: readonly Json[] }
  | { readonly operation: "relations"; readonly rows: readonly unknown[]; readonly attribute: Json; readonly value?: Json }
  | { readonly operation: "constitute"; readonly kind: string; readonly attributes: Json; readonly t: Json }
  | { readonly operation: "settle"; readonly entity: Json; readonly rows: readonly unknown[] }
  | { readonly operation: "filter-consent"; readonly audience: string; readonly rows: readonly unknown[] }
  | { readonly operation: "relation-nerve"; readonly attribute: Json; readonly rows: readonly unknown[] };
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const key = (value: Json): string => canonicalJson(value);
const compare = (left: Json, right: Json): number => key(left).localeCompare(key(right));
export function row(value: unknown): Row {
  if (!isRecord(value) || Object.keys(value).length !== 4 || !["e", "a", "v", "t"].every((field) => field in value) || !isJson(value.e) || !isJson(value.a) || !isJson(value.v) || !isJson(value.t)) throw new TypeError("EAVT row must be exactly JSON {e,a,v,t}");
  return Object.freeze({ e: value.e, a: value.a, v: value.v, t: value.t });
}
/** Canonical JSON is the interchange carrier: one row, one line, one reversible transform. */
export const encode = (value: unknown): string => key(row(value));
export function decode(line: string): Row {
  try {
    const fact = row(JSON.parse(line));
    if (line !== encode(fact)) throw new TypeError("EAVT line is not canonical");
    return fact;
  } catch {
    try { return row(decodeCanonical(Buffer.from(line, "base64"))); }
    catch { throw new TypeError("EAVT line is not a canonical JSON or CBOR row"); }
  }
}
export const identify = (value: unknown): string => encode(value);
export const unique = (values: readonly unknown[]): readonly Row[] => [...new Map(values.map((value) => { const fact = row(value); return [identify(fact), fact] as const; })).values()];
export const entities = (values: readonly unknown[]): readonly Json[] => unique(values).reduce<readonly Json[]>((found, fact) => found.some((entity) => key(entity) === key(fact.e)) ? found : [...found, fact.e], []);
/** Retain multivalued facts after their latest strictly later cell retraction. */
export function current(values: readonly unknown[]): readonly Row[] {
  const facts = unique(values); const tombstones = new Map<string, Json>();
  const cellKey = (fact: Row): string => key([fact.e, fact.a]);
  const later = (left: Json, right: Json): boolean => typeof left === "number" && typeof right === "number" ? left > right : typeof left === "string" && typeof right === "string" ? left > right : false;
  for (const fact of facts) if (fact.v === null) { const cell = cellKey(fact); const prior = tombstones.get(cell); if (prior === undefined || later(fact.t, prior)) tombstones.set(cell, fact.t); }
  return facts.filter((fact) => { const tombstone = tombstones.get(cellKey(fact)); return fact.v !== null && (tombstone === undefined || !later(tombstone, fact.t)); });
}
/** Pure latest-value lens; only attributes named by the caller are single-valued. */
export function latest(values: readonly unknown[], attributes: readonly Json[]): readonly Row[] {
  const functional = new Set(attributes.map(key)); const facts = unique(values); const maximum = new Map<string, Row>();
  for (const fact of facts) if (functional.has(key(fact.a))) { const cell = `${key(fact.e)}\u0000${key(fact.a)}`; const prior = maximum.get(cell); if (!prior || compare(fact.t, prior.t) >= 0) maximum.set(cell, fact); }
  return facts.filter((fact) => !functional.has(key(fact.a)) || maximum.get(`${key(fact.e)}\u0000${key(fact.a)}`) === fact);
}
export const relations = (values: readonly unknown[], attribute: Json, value?: Json): readonly Row[] => unique(values).filter((fact) => key(fact.a) === key(attribute) && (value === undefined || key(fact.v) === key(value)));
/** A null value retracts its entity/attribute cell; all other rows affirm it. */
export function settle(values: readonly unknown[], entity: Json): { readonly entity: Json; readonly affirmed: readonly Cell[]; readonly denied: readonly Cell[]; readonly contradicted: readonly Cell[] } {
  const facts = unique(values).filter((fact) => key(fact.e) === key(entity)); const positive = facts.filter((fact) => fact.v !== null);
  const denied = facts.filter((fact) => fact.v === null).map(({ e, a }) => ({ e, a, v: null })); const deniedKeys = new Set(denied.map(({ e, a }) => `${key(e)}\u0000${key(a)}`));
  const affirmed = positive.map(({ e, a, v }) => ({ e, a, v })); return Object.freeze({ entity, affirmed, denied, contradicted: affirmed.filter(({ e, a }) => deniedKeys.has(`${key(e)}\u0000${key(a)}`)) });
}
export function consent(values: readonly unknown[], audience: string): { readonly rows: readonly Row[]; readonly withheld: number } {
  const facts = unique(values); const choices = latest(facts.filter((fact) => fact.a === "consent"), ["consent"]);
  const admitted = new Set(choices.filter((fact) => fact.v === "public" || (Array.isArray(fact.v) && fact.v.includes(audience))).map((fact) => key(fact.e))); const rows = facts.filter((fact) => admitted.has(key(fact.e))); return Object.freeze({ rows, withheld: facts.length - rows.length });
}
export function constitute(kind: string, attributes: Json, t: Json): { readonly address: string; readonly genesis: Row } {
  if (!/^[^:]+$/.test(kind) || !isRecord(attributes)) throw new TypeError("kind must be a nonempty noun and attributes a JSON object"); const address = `${kind}:${Buffer.from(encode({ e: null, a: "constituted", v: attributes, t })).toString("base64url")}`; return Object.freeze({ address, genesis: row({ e: address, a: "constituted", v: attributes, t }) });
}
export function relationNerve(values: readonly unknown[], attribute: Json): { readonly vertices: number; readonly edges: number; readonly components: number; readonly cycles: number } {
  const edges = relations(values, attribute); const parent = new Map<string, string>(); const find = (node: string): string => { const root = parent.get(node) ?? node; if (root === node) { parent.set(node, node); return node; } const result = find(root); parent.set(node, result); return result; };
  for (const fact of edges) { const a = find(`e:${key(fact.e)}`); const b = find(`v:${key(fact.v)}`); if (a !== b) parent.set(a, b); } const components = new Set([...parent.keys()].map(find)).size; return Object.freeze({ vertices: parent.size, edges: edges.length, components, cycles: edges.length - parent.size + components });
}
export function execute(request: Request, store: Store): Json {
  switch (request.operation) {
    case "validate": return row(request.row); case "encode": return { line: encode(request.row) }; case "decode": return decode(request.line);
    case "read": return store.read(request.path).filter(Boolean).flatMap((line) => { try { return [decode(line)]; } catch { return []; } }); case "append": { const line = encode(request.row); store.append(request.path, line); return { path: request.path, line }; }
    case "entities": return entities(request.rows); case "current": return current(request.rows); case "latest": return latest(request.rows, request.attributes); case "relations": return relations(request.rows, request.attribute, request.value); case "constitute": return constitute(request.kind, request.attributes, request.t); case "settle": return settle(request.rows, request.entity); case "filter-consent": return consent(request.rows, request.audience); case "relation-nerve": return relationNerve(request.rows, request.attribute);
  }
}
