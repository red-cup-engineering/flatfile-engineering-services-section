import { requireJsonValue } from "./json.mjs";

/** Admit once, then freeze every composite while preserving shared children. */
export function immutableJsonValue(value) {
  requireJsonValue(value, "immutable JSON value");
  const visited = new Set();
  const freeze = (child) => {
    if (child === null || typeof child !== "object" || visited.has(child)) return child;
    visited.add(child);
    for (const nested of Object.values(child)) freeze(nested);
    return Object.freeze(child);
  };
  return freeze(value);
}
