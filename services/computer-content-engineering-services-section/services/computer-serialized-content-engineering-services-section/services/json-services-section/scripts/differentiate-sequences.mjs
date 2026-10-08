import { equalJson } from "./json-equality.mjs";

/** Differentiate two ordered JSON-value sequences using a longest common subsequence. */
export function differentiateSequences(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) throw new TypeError("before and after must be arrays");
  const table = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
  for (let left = before.length - 1; left >= 0; left -= 1) for (let right = after.length - 1; right >= 0; right -= 1) table[left][right] = equalJson(before[left], after[right]) ? table[left + 1][right + 1] + 1 : Math.max(table[left + 1][right], table[left][right + 1]);
  const changes = []; let left = 0, right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && equalJson(before[left], after[right])) { changes.push(Object.freeze({ kind: "equal", beforeIndex: left, afterIndex: right, value: before[left] })); left += 1; right += 1; }
    else if (right < after.length && (left >= before.length || table[left][right + 1] >= table[left + 1][right])) { changes.push(Object.freeze({ kind: "insert", afterIndex: right, value: after[right] })); right += 1; }
    else { changes.push(Object.freeze({ kind: "delete", beforeIndex: left, value: before[left] })); left += 1; }
  }
  return Object.freeze(changes);
}

/** Differentiate the `before` and `after` sequence values of a command request. */
export function main(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request) || !("before" in request) || !("after" in request)) {
    throw new TypeError("request must be a JSON object containing before and after");
  }
  return differentiateSequences(request.before, request.after);
}

export const operation = Object.freeze({
  name: "differentiate-sequences", description: "differentiate sequences.",
  operation: main,
  inputSchema: {"type": "object", "required": ["before", "after"]},
  outputSchema: {"type": "array"},
});
