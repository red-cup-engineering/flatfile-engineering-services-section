#!/usr/bin/env node
import { isJsonValue } from "@red-cup-engineering/json-services-section/is-json-value";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["admit-row"].input;
export const outputSchema = contracts["admit-row"].output;

// An admitted row is an immutable value: its fields are frozen copies, so a row admitted once is
// admitted for good and everything that is a function of its content (its identity, its encoding)
// is computed once per row rather than on every pass over a log.
const admitted = new WeakSet();

const frozenJson = (value) => (value === null || typeof value !== "object" ? value : deepFreeze(structuredClone(value)));

function deepFreeze(value) {
  for (const child of Object.values(value)) if (child !== null && typeof child === "object") deepFreeze(child);
  return Object.freeze(value);
}

/** Whether `value` is a row eavtRow admitted (and so an immutable value). */
export const isAdmittedRow = (value) => admitted.has(value);

/** Compute `derive(row)` once per admitted row; any other value is derived afresh. */
export function memoizeOnRow(derive) {
  const memo = new WeakMap();
  return (fact) => {
    if (!admitted.has(fact)) return derive(fact);
    if (!memo.has(fact)) memo.set(fact, derive(fact));
    return memo.get(fact);
  };
}

export function eavtRow(value) {
  if (admitted.has(value)) return value;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 4
  ) {
    throw new TypeError("EAVT row must be exactly {e,a,v,t}");
  }
  for (const key of ["e", "a", "v", "t"]) {
    if (!Object.hasOwn(value, key))
      throw new TypeError(`EAVT row field "${key}" is required`);
    if (!isJsonValue(value[key]))
      throw new TypeError(`EAVT row field "${key}" must be JSON`);
  }
  const fact = Object.freeze({ e: frozenJson(value.e), a: frozenJson(value.a), v: frozenJson(value.v), t: frozenJson(value.t) });
  admitted.add(fact);
  return fact;
}
export const row = eavtRow;
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    JSON.stringify(eavtRow(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
}
