/**
 * carriers/kernel/realize - the forgetful functor from schema fragments to structural types.
 *
 * A JSON Schema is a predicate on the universe of JSON values. `realize` keeps
 * the structural skeleton and FORGETS the refinement predicates (minLength,
 * pattern, minimum, format, if/then/else) that have no image among structural
 * types — which is exactly what makes it canonical and choice-free, a function.
 * Its adjoint (type → schema) is free and must *choose* refinements, which is why
 * schema-as-source-of-truth is the computable direction.
 *
 *   allOf  → intersection (∧)        anyOf/oneOf → union (∨)
 *   properties+required → product    items/prefixItems → array/tuple
 *   enum/const → literals            $ref/$defs → named fixpoint (never inlined)
 *   minLength, pattern, format, …    → forgotten (residual stays in the schema)
 *
 * @packageDocumentation
 */
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import {
  array,
  intersection,
  literal,
  neverType,
  objectType,
  primitive,
  ref,
  tuple,
  union,
  unknownType,

} from "./structural-type.mjs";

/** The trailing name of a `$ref` JSON pointer (e.g. `#/$defs/Foo` → `Foo`). */
function refName(pointer) {
  const parts = pointer.split("/").filter((p) => p !== "" && p !== "#");
  return parts.length === 0 ? pointer : (parts[parts.length - 1]);
}

export function realizeType(typeName) {
  switch (typeName) {
    case "string": return primitive("string");
    case "number":
    case "integer": return primitive("number");
    case "boolean": return primitive("boolean");
    case "null": return primitive("null");
    case "array": return array(unknownType);
    case "object": return objectType([], unknownType);
    default: return unknownType;
  }
}

function realizeArray(schema) {
  const prefix = schema["prefixItems"];
  if (Array.isArray(prefix)) return tuple(prefix.map((item) => realize(item)));
  const items = schema["items"];
  return array(items === undefined ? unknownType : realize(items));
}

export function realizeObject(schema) {
  const properties = isJsonRecord(schema["properties"]) ? schema["properties"] : {};
  const required = new Set(Array.isArray(schema["required"]) ? schema["required"].filter((r) => typeof r === "string") : []);
  const fields = Object.entries(properties)
    .map(([name, sub]) => Object.freeze({ name, type: realize(sub), optional: !required.has(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const additional = schema["additionalProperties"];
  const rest = additional === undefined || additional === true
    ? null
    : additional === false
      ? null
      : realize(additional);
  return objectType(fields, rest);
}

/** Realize a JSON Schema document into its structural type. */
export function realize(schema) {
  if (schema === true) return unknownType;
  if (schema === false) return neverType;
  if (!isJsonRecord(schema)) return unknownType;

  if (typeof schema["$ref"] === "string") {
    // Intra-document refs (`#/$defs/X`) become named fixpoints resolved within this
    // schema's own generated declaration. A cross-document ref (a carrier `$id` in
    // ANOTHER schema) has no in-document definition to name, so the forgetful functor
    // forgets it to `unknown`; the schema still records the real `$ref` for the
    // schema registry and the manifold wiring graph. (A registry-aware codegen could
    // later emit a cross-file `import type` instead of forgetting.)
    const reference = schema["$ref"];
    return reference.startsWith("#") ? ref(refName(reference)) : unknownType;
  }
  if ("const" in schema) return literal(schema["const"]);
  if (Array.isArray(schema["enum"])) return union(schema["enum"].map((value) => literal(value)));

  if (Array.isArray(schema["allOf"])) return intersection(schema["allOf"].map((s) => realize(s)));
  if (Array.isArray(schema["anyOf"])) return union(schema["anyOf"].map((s) => realize(s)));
  if (Array.isArray(schema["oneOf"])) return union(schema["oneOf"].map((s) => realize(s)));

  const type = schema["type"];
  if (Array.isArray(type)) {
    return union(type.filter((t) => typeof t === "string").map((t) => realizeMemberType(t, schema)));
  }
  if (typeof type === "string") return realizeMemberType(type, schema);

  // No explicit type: infer from structural keywords.
  if (isJsonRecord(schema["properties"]) || "required" in schema || "additionalProperties" in schema) return realizeObject(schema);
  if ("items" in schema || "prefixItems" in schema) return realizeArray(schema);
  return unknownType;
}

function realizeMemberType(typeName, schema) {
  if (typeName === "object") return realizeObject(schema);
  if (typeName === "array") return realizeArray(schema);
  return realizeType(typeName);
}

/** The named structural types of a schema's `$defs`/`definitions` block. */
export function realizeDefs(schema) {
  const out = new Map();
  if (!isJsonRecord(schema)) return out;
  for (const key of ["$defs", "definitions"]) {
    const defs = schema[key];
    if (!isJsonRecord(defs)) continue;
    for (const [name, sub] of Object.entries(defs)) out.set(name, realize(sub));
  }
  return out;
}
