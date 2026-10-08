#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import contract from "../schemas/require-json-value.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { isJsonValue } from "./is-json-value.mjs";
/** Where a value first stops being JSON data, as a JSONPath, and what stands there; searched only
 * once admission has refused, so admission itself stays one pass. */
function jsonDefectOf(value) {
  const ancestors = new Set();
  const stack = [{ item: value, path: "$" }];
  while (stack.length > 0) {
    const { item, path, leave } = stack.pop();
    if (leave) { ancestors.delete(item); continue; }
    if (item === null || typeof item === "boolean" || typeof item === "string") continue;
    if (typeof item === "number") { if (Number.isFinite(item)) continue; return { path, found: String(item) }; }
    const array = Array.isArray(item);
    if (typeof item !== "object" || (!array && Object.getPrototypeOf(item) !== Object.prototype))
      return { path, found: item === undefined ? "undefined" : typeof item === "object" ? item.constructor?.name ?? "object" : typeof item };
    if (ancestors.has(item)) return { path, found: "a cycle" };
    ancestors.add(item);
    stack.push({ item, leave: true });
    if (array) {
      for (let index = item.length - 1; index >= 0; index -= 1) {
        if (!Object.hasOwn(item, index)) return { path: `${path}[${index}]`, found: "a hole" };
        stack.push({ item: item[index], path: `${path}[${index}]` });
      }
    } else for (const [key, child] of Object.entries(item).reverse()) stack.push({ item: child, path: `${path}.${key}` });
  }
  return { path: "$", found: "a non-JSON value" };
}

/** Admit one raw JSON value; a refusal names the admitting context and where the value stops being JSON. */
export function requireJsonValue(value, context = "value") {
  if (isJsonValue(value)) return value;
  const { path, found } = jsonDefectOf(value);
  throw new TypeError(`${context}: not a JSON value (${found} at ${path})`);
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(requireJsonValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
