#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import contract from "../schemas/freeze-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { requireJsonValue } from "./require-json-value.mjs";
/** Deep-freeze one admitted JSON value while preserving shared children. */
export function freezeJson(value) {
  requireJsonValue(value);
  const visited = new Set();
  const pending = [value];
  while (pending.length) {
    const child = pending.pop();
    if (child === null || typeof child !== "object" || visited.has(child)) continue;
    visited.add(child);
    for (const nested of Object.values(child)) pending.push(nested);
    Object.freeze(child);
  }
  return value;
}

/** Copy admitted JSON without consuming the host call stack. Preserve shared
 * children, negative zero and own property names; never retain mutable input. */
export function copyJson(value) {
  requireJsonValue(value);
  if (value === null || typeof value !== "object") return value;
  const copies = new Map();
  const root = Array.isArray(value) ? [] : {};
  copies.set(value, root);
  const pending = [value];
  while (pending.length) {
    const source = pending.pop(), target = copies.get(source);
    for (const key of Object.keys(source)) {
      let child = source[key];
      if (child !== null && typeof child === "object") {
        if (!copies.has(child)) {
          if (!Array.isArray(child) && Object.getPrototypeOf(child) !== Object.prototype) requireJsonValue(child);
          copies.set(child, Array.isArray(child) ? [] : {});
          pending.push(child);
        }
        child = copies.get(child);
      } else requireJsonValue(child);
      Object.defineProperty(target, key, {value: child, enumerable: true, writable: true, configurable: true});
    }
  }
  requireJsonValue(root);
  return root;
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(freezeJson(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
