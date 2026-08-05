import { canonical } from "@red-cup-engineering/json-file-codec-service";

function same(left, right) { return canonical(left) === canonical(right); }
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

/**
 * Differentiate two JSON data forms.
 *
 * Output is an immutable ordered list of `{path, kind, before?, after?}`
 * records. Object fields recurse; arrays and scalar values are atomic values.
 */
export function differentiateData(before, after) {
  const changes = [];
  differentiate(before, after, "", changes);
  return Object.freeze(changes);
}
