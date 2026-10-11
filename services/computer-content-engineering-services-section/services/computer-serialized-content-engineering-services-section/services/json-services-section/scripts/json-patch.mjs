/** RFC 6902 pure document transformations; no remote write or persistent state.
 * The result is a JSON option: root removal means present:false, never null. */
import { canonicalizeJson } from "./canonical-json.mjs";
import { TRANSFORMATION_ENVELOPE } from "./json-transformations.mjs";
import { parseJsonPointer, resolveJsonPointerParts } from "./resolve-json-pointer.mjs";
import { equalJson } from "./json-equality.mjs";

export const JSON_PATCH_MAX_OPERATIONS = 128;
const own = (value, key) => Object.hasOwn(value, key);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const set = (object, key, value) => Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true });
class JsonPatchError extends TypeError {
  constructor(code, message, operation) { super(message); this.code = code; this.operation = operation; }
}
const fail = (code, message, operation) => { throw new JsonPatchError(code, message, operation); };

// Generic JSON nesting is physical nesting, including arrays whose contents
// happen to spell a SEN pair. Keep the carrier bounded independently of codecs.
function bounded(value) {
  const admitted = canonicalizeJson(value, TRANSFORMATION_ENVELOPE);
  const pending = [[admitted.value, 0]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (node !== null && typeof node === "object") {
      if (depth >= TRANSFORMATION_ENVELOPE.maxDepth) throw new TypeError("JSON patch document exceeds depth 64");
      for (const child of Object.values(node)) pending.push([child, depth + 1]);
    }
  }
  return admitted;
}
function request(body, keys) {
  if (!record(body) || keys.some(key => !own(body, key)) || Object.keys(body).some(key => !keys.includes(key))) throw new TypeError(`request requires exactly ${keys.join(", ")}`);
  return JSON.parse(bounded(body).text);
}
function parts(pointer, operation) {
  try { return parseJsonPointer(pointer, { allowFragment: false }); }
  catch { return fail("invalid-pointer", "patch path/from must be RFC 6901 string pointers", operation); }
}
function read(state, tokens, operation) {
  if (!state.present) return fail("missing-target", "target document is absent", operation);
  const value = resolveJsonPointerParts(state.value, tokens);
  if (value === undefined) return fail("missing-target", "target location must exist", operation);
  return value;
}
function parent(state, tokens, operation) {
  const target = read(state, tokens.slice(0, -1), operation);
  if (target === null || typeof target !== "object") return fail("invalid-parent", "target parent must be an object or array", operation);
  return target;
}
function indexOf(array, key, add, operation) {
  if (add && key === "-") return array.length;
  if (!/^(0|[1-9][0-9]*)$/u.test(key)) return fail("invalid-index", "array index must be a canonical nonnegative integer", operation);
  const index = Number(key);
  if (!Number.isSafeInteger(index) || index > array.length || (!add && index === array.length)) return fail("missing-target", "array index is outside its bounds", operation);
  return index;
}
function add(state, tokens, value, operation) {
  if (tokens.length === 0) { state.present = true; state.value = value; return; }
  const target = parent(state, tokens, operation); const key = tokens.at(-1);
  if (Array.isArray(target)) target.splice(indexOf(target, key, true, operation), 0, value);
  else set(target, key, value);
}
function remove(state, tokens, operation) {
  const value = read(state, tokens, operation);
  if (tokens.length === 0) { state.present = false; delete state.value; return value; }
  const target = parent(state, tokens, operation); const key = tokens.at(-1);
  if (Array.isArray(target)) target.splice(indexOf(target, key, false, operation), 1);
  else delete target[key];
  return value;
}
function operationOf(value, index) {
  if (!record(value) || !own(value, "op") || !["add", "remove", "replace", "move", "copy", "test"].includes(value.op) || !own(value, "path")) return fail("invalid-operation", "operation requires a supported op and path", index);
  const path = parts(value.path, index);
  if (["add", "replace", "test"].includes(value.op) && !own(value, "value")) return fail("missing-value", "operation requires its value member", index);
  let from;
  if (["move", "copy"].includes(value.op)) {
    if (!own(value, "from")) return fail("missing-from", "operation requires its from member", index);
    from = parts(value.from, index);
  }
  // RFC 6902 ignores operation members it does not define.
  return { ...value, path, from };
}
function execute(body) {
  if (!Array.isArray(body.patch)) return fail("invalid-patch", "patch must be an array of operations");
  if (body.patch.length > JSON_PATCH_MAX_OPERATIONS) throw new TypeError("patch exceeds 128 operations");
  const state = { present: true, value: body.value };
  for (let index = 0; index < body.patch.length; index++) {
    const op = operationOf(body.patch[index], index);
    switch (op.op) {
      case "add": add(state, op.path, op.value, index); break;
      case "remove": remove(state, op.path, index); break;
      case "replace": read(state, op.path, index); remove(state, op.path, index); add(state, op.path, op.value, index); break;
      case "test": if (!equalJson(read(state, op.path, index), op.value)) fail("test-failed", "target does not equal the test value", index); break;
      case "move": {
        const value = read(state, op.from, index);
        if (op.from.length < op.path.length && op.from.every((token, i) => token === op.path[i])) fail("move-into-descendant", "a location cannot be moved into its child", index);
        remove(state, op.from, index); add(state, op.path, value, index); break;
      }
      case "copy": {
        const value = JSON.parse(JSON.stringify(read(state, op.from, index)));
        add(state, op.path, value, index); break;
      }
    }
    // Stop expansion after every operation, including copies, before the next
    // operation can multiply it again. Failed mutations touched only our copy.
    if (state.present && ["add", "replace", "move", "copy"].includes(op.op)) bounded(state.value);
  }
  return bounded(state.present ? { present: true, value: state.value } : { present: false }).value;
}
export function applyJsonPatch(body) {
  return execute(request(body, ["value", "patch"]));
}
export function checkJsonPatch(body) {
  const input = request(body, ["value", "patch"]);
  try { const result = execute(input); return { applicable: true, operations: input.patch.length, present: result.present }; }
  catch (error) {
    if (!(error instanceof JsonPatchError)) throw error;
    return { applicable: false, error: { code: error.code, message: error.message, ...(error.operation === undefined ? {} : { operation: error.operation }) } };
  }
}

/** Deterministic positional/object diff, not a minimal-patch optimization. */
export function createJsonPatch(body) {
  const { before, after } = request(body, ["before", "after"]);
  const patch = []; const pending = [[before, after, ""]];
  const escape = key => key.replaceAll("~", "~0").replaceAll("/", "~1");
  function emit(op) {
    if (patch.length >= JSON_PATCH_MAX_OPERATIONS) throw new TypeError("generated patch exceeds 128 operations");
    patch.push(op);
  }
  while (pending.length) {
    const [left, right, path] = pending.pop();
    if (equalJson(left, right)) continue;
    if (record(left) && record(right)) {
      for (const key of Object.keys(left).sort()) if (!own(right, key)) emit({ op: "remove", path: `${path}/${escape(key)}` });
      for (const key of Object.keys(right).sort()) if (!own(left, key)) emit({ op: "add", path: `${path}/${escape(key)}`, value: right[key] });
      for (const key of Object.keys(right).sort().reverse()) if (own(left, key)) pending.push([left[key], right[key], `${path}/${escape(key)}`]);
    } else if (Array.isArray(left) && Array.isArray(right)) {
      for (let i = left.length - 1; i >= right.length; i--) emit({ op: "remove", path: `${path}/${i}` });
      for (let i = left.length; i < right.length; i++) emit({ op: "add", path: `${path}/-`, value: right[i] });
      for (let i = Math.min(left.length, right.length) - 1; i >= 0; i--) pending.push([left[i], right[i], `${path}/${i}`]);
    } else emit({ op: "replace", path, value: right });
  }
  return bounded(patch).value;
}
