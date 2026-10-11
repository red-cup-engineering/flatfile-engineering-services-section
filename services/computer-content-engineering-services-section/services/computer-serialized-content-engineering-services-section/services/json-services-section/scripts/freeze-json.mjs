#!/usr/bin/env node
const { readFileSync: readInput } = globalThis.process?.getBuiltinModule?.("node:fs") ?? {};
import contract from "../schemas/freeze-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { requireJsonValue } from "./require-json-value.mjs";
/** Deep-freeze admitted JSON without consuming the host call stack.
 * `rejectCycles` also refuses cycles in non-index array extras; ordinary JSON
 * cycles are always refused by admission. The default retains shared API behavior. */
export function freezeJson(value, { rejectCycles = false } = {}) {
  requireJsonValue(value);
  const seen = new Set(), ancestors = new Set();
  const pending = [{value, exit: false}];
  while (pending.length > 0) {
    const frame = pending.pop(), current = frame.value;
    if (current === null || typeof current !== "object") continue;
    if (frame.exit) {
      ancestors.delete(current);
      seen.add(current);
      Object.freeze(current);
      continue;
    }
    // The shared freezer historically tolerated cycles in non-index extras.
    // EAVT's snapshot contract instead refused them before row admission.
    if (ancestors.has(current)) {
      if (rejectCycles) throw new TypeError("JSON values must not contain cycles");
      continue;
    }
    if (seen.has(current)) continue;
    ancestors.add(current);
    pending.push({value: current, exit: true});
    const children = Object.values(current);
    for (let index = children.length - 1; index >= 0; index--)
      pending.push({value: children[index], exit: false});
  }
  return value;
}

// Plain JSON data needs no native recursive clone. Preserve aliases within each field and create own data properties
// (assignment would interpret an own "__proto__" key as a prototype setter).
/** Copy one JSON snapshot. `inputAlreadyAdmitted` is for consumers that have already run
 * requireJsonValue/isJsonValue on this exact input: it avoids rereading accessors
 * before taking the snapshot. The default validates both input and result. */
export function copyJson(value, { inputAlreadyAdmitted = false } = {}) {
  if (!inputAlreadyAdmitted) requireJsonValue(value);
  if (value === null || typeof value !== "object") return requireJsonValue(value);
  const inspected = new Set(), inspect = [value];
  let plain = true;
  while (inspect.length > 0 && plain) {
    const source = inspect.pop();
    if (source === null || typeof source !== "object") {
      if (typeof source === "function" || typeof source === "symbol") plain = false;
      continue;
    }
    if (inspected.has(source)) continue;
    inspected.add(source);
    if (!Array.isArray(source) && Object.getPrototypeOf(source) !== Object.prototype) {
      plain = false;
      break;
    }
    for (const key of Object.keys(source)) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (!Object.hasOwn(descriptor, "value")) { plain = false; break; }
      inspect.push(descriptor.value);
    }
  }
  // JSON admission ignores non-index array properties. Retain the previous
  // structured-clone behavior for unusual JS extras and accessors, including
  // clone refusals, prototypes and aliases across those extras.
  if (!plain) return requireJsonValue(structuredClone(value));
  const copies = new Map(), pending = [];
  const copy = (source) => {
    if (source === null || typeof source !== "object") return source;
    if (copies.has(source)) return copies.get(source);
    const target = Array.isArray(source) ? new Array(source.length) : {};
    copies.set(source, target);
    pending.push([source, target]);
    return target;
  };
  const result = copy(value);
  while (pending.length > 0) {
    const [source, target] = pending.pop();
    for (const key of Object.keys(source)) Object.defineProperty(target, key, {
      value: copy(source[key]), enumerable: true, writable: true, configurable: true,
    });
  }
  return requireJsonValue(result);
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(freezeJson(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
