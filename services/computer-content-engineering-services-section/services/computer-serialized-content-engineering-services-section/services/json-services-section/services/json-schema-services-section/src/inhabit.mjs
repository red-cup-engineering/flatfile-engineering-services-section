/**
 * schema/inhabit — deterministic inhabitants of a schema (the semantics sampled).
 *
 * `structural.mts` states what a schema means as a set of values; this module
 * produces elements of that set. Generation is seeded and fully deterministic
 * (same seed, same schema, same inhabitant — replayable receipts, no ambient
 * randomness), walks the JSON Schema itself so constraint vocabulary
 * (`const`, `enum`, bounds, `required`) is respected rather than forgotten by
 * the structural functor, and reports unsatisfiable or unsupported shapes as
 * obstruction values, never exceptions. The generator proposes; the schema
 * contract's own validator remains the oracle — callers reject any sample the
 * contract refuses, so soundness rests on the validator, not on this walker.
 */

import { isObjectRecord } from "@red-cup-engineering/json-services-section";

  

/** xorshift32 — small, deterministic, dependency-free. */
function rng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 0x100000000;
  };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz-./:0123456789";

const isRecord = isObjectRecord;

function pick(walk, items) {
  return items[Math.floor(walk.random() * items.length) % items.length];
}

function inhabitString(walk, schema) {
  const min = typeof schema["minLength"] === "number" ? schema["minLength"] : 0;
  const length = Math.max(min, Math.floor(walk.random() * 6));
  let out = "";
  for (let index = 0; index < length; index += 1) out += ALPHABET[Math.floor(walk.random() * ALPHABET.length)];
  return out;
}

function inhabitNumber(walk, schema, integer) {
  const min = typeof schema["minimum"] === "number" ? schema["minimum"] : 0;
  const max = typeof schema["maximum"] === "number" ? schema["maximum"] : min + 16;
  const raw = min + walk.random() * Math.max(0, max - min);
  return integer ? Math.floor(raw) : Math.round(raw * 8) / 8;
}

function resolveRef(walk, ref) {
  if (!ref.startsWith("#/")) return undefined;
  let node = walk.root;
  for (const segment of ref.slice(2).split("/")) {
    if (!isRecord(node)) return undefined;
    node = node[segment];
  }
  return node;
}

function inhabitAt(walk, schema, depth) {
  if (schema === true || schema === undefined) return { ok: true, value: pick(walk, [0, "x", true, null, {}]) };
  if (schema === false) return { ok: false, obstruction: "schema `false` has no inhabitants" };
  if (!isRecord(schema)) return { ok: false, obstruction: "unsupported non-object schema node" };
  if (depth < 0) return { ok: false, obstruction: "recursion budget exhausted" };

  if (typeof schema["$ref"] === "string") {
    const target = resolveRef(walk, schema["$ref"]);
    if (target === undefined) return { ok: false, obstruction: `unresolved $ref ${schema["$ref"]}` };
    return inhabitAt(walk, target, depth - 1);
  }
  if ("const" in schema) return { ok: true, value: schema["const"] };
  if (Array.isArray(schema["enum"]) && schema["enum"].length > 0) return { ok: true, value: pick(walk, schema["enum"]) };
  for (const key of ["anyOf", "oneOf"]) {
    const members = schema[key];
    if (Array.isArray(members) && members.length > 0) return inhabitAt(walk, pick(walk, members), depth - 1);
  }

  const type = Array.isArray(schema["type"]) ? pick(walk, schema["type"]) : schema["type"];
  switch (type) {
    case "null": return { ok: true, value: null };
    case "boolean": return { ok: true, value: walk.random() < 0.5 };
    case "string": return { ok: true, value: inhabitString(walk, schema) };
    case "number": return { ok: true, value: inhabitNumber(walk, schema, false) };
    case "integer": return { ok: true, value: inhabitNumber(walk, schema, true) };
    case "array": {
      const min = typeof schema["minItems"] === "number" ? schema["minItems"] : 0;
      const max = typeof schema["maxItems"] === "number" ? schema["maxItems"] : min + 2;
      const itemsRaw = schema["items"];
      // Tuple positions: draft-07 `items: [...]` or draft-2020 `prefixItems`.
      const prefix = Array.isArray(itemsRaw) ? itemsRaw
        : Array.isArray(schema["prefixItems"]) ? schema["prefixItems"] : [];
      const restSchema = Array.isArray(itemsRaw) ? schema["additionalItems"] : itemsRaw;
      const count = Math.min(Math.max(min, prefix.length, Math.floor(walk.random() * 3)), Math.max(max, prefix.length));
      const items = [];
      for (let index = 0; index < count; index += 1) {
        const itemSchema = index < prefix.length ? prefix[index] : restSchema;
        if (index >= prefix.length && (itemSchema === false || itemSchema === undefined)) break;
        const item = inhabitAt(walk, itemSchema, depth - 1);
        if (!item.ok) return item;
        items.push(item.value);
      }
      return { ok: true, value: items };
    }
    case "object": {
      const out = {};
      const properties = isRecord(schema["properties"]) ? schema["properties"] : {};
      const required = new Set(Array.isArray(schema["required"]) ? schema["required"] : []);
      for (const [name, propertySchema] of Object.entries(properties)) {
        if (!required.has(name) && walk.random() < 0.4) continue;
        const property = inhabitAt(walk, propertySchema, depth - 1);
        if (!property.ok) return required.has(name) ? property : { ok: true, value: out };
        out[name] = property.value;
      }
      for (const name of required) {
        if (!(name in out)) return { ok: false, obstruction: `required property ${name} has no schema` };
      }
      return { ok: true, value: out };
    }
    case undefined:
      return { ok: true, value: pick(walk, [0, "x", true, null]) };
    default:
      return { ok: false, obstruction: `unsupported type ${String(type)}` };
  }
}

/** Produce one deterministic inhabitant proposal for a JSON Schema. */
export function inhabit(schema, options = {}) {
  const root = isRecord(schema) ? schema : {};
  return inhabitAt({ random: rng(options.seed ?? 1), root }, schema, options.depth ?? 6);
}

/** Produce up to `count` distinct validated inhabitants: proposals from `inhabit`
 *  filtered by the caller's oracle (the schema contract's own validator), with
 *  rejected proposals counted rather than hidden. */
export function inhabitants(
  schema,
  oracle,
  count,
  options = {},
) {
  const values = [];
  const obstructions = [];
  let rejected = 0;
  const baseSeed = options.seed ?? 1;
  const attempts = Math.max(count * 8, 8);
  const baseDepth = options.depth ?? 6;
  for (let attempt = 0; attempt < attempts && values.length < count; attempt += 1) {
    // Escalate the recursion budget across retries so recursive schemas that
    // overrun the base budget still yield inhabitants deterministically.
    const judgment = inhabit(schema, { ...options, seed: baseSeed + attempt * 0x1f3, depth: baseDepth + Math.floor(attempt / Math.max(count, 1)) * 4 });
    if (!judgment.ok) { obstructions.push(judgment.obstruction); continue; }
    if (!oracle(judgment.value)) { rejected += 1; continue; }
    values.push(judgment.value);
  }
  return Object.freeze({ values: Object.freeze(values), rejected, obstructions: Object.freeze(obstructions.slice(0, 8)) });
}
