import { requireJsonValue } from "./core.mjs";

// JSON values are acyclic by definition, so recursion reaches every carried
// child without the identity bookkeeping needed for arbitrary object graphs.
export function immutableJsonValue(value) {
  requireJsonValue(value, "immutable JSON value");
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutableJsonValue(child);
  return Object.freeze(value);
}
