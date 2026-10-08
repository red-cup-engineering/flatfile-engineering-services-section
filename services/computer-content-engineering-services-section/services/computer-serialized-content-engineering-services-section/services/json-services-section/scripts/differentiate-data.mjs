import { equalJson } from "./json-equality.mjs";

const same = equalJson;
function pathOf(path, key) { return path === "" ? key : `${path}.${key}`; }
function differentiate(before, after, path, changes) {
  if (same(before, after)) return;
  const beforeRecord = before !== null && typeof before === "object" && !Array.isArray(before);
  const afterRecord = after !== null && typeof after === "object" && !Array.isArray(after);
  if (beforeRecord && afterRecord) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      if (!(key in before)) changes.push(Object.freeze({ path: pathOf(path, key), kind: "added", after: after[key] }));
      else if (!(key in after)) changes.push(Object.freeze({ path: pathOf(path, key), kind: "removed", before: before[key] }));
      else differentiate(before[key], after[key], pathOf(path, key), changes);
    }
    return;
  }
  changes.push(Object.freeze({ path, kind: "changed", before, after }));
}

/** Differentiate two JSON data forms into an immutable ordered change list. */
export function differentiateData(before, after) {
  const changes = [];
  differentiate(before, after, "", changes);
  return Object.freeze(changes);
}

/** Differentiate the `before` and `after` JSON values of a command request. */
export function main(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request) || !("before" in request) || !("after" in request)) {
    throw new TypeError("request must be a JSON object containing before and after");
  }
  return differentiateData(request.before, request.after);
}

export const operation = Object.freeze({
  name: "differentiate-data", description: "differentiate data.",
  operation: main,
  inputSchema: {"type": "object", "required": ["before", "after"]},
  outputSchema: {"type": "array"},
});
