/**
 * carriers/kernel/registry - the schema registry keyed by `$id` (carrier identity).
 *
 * A carrier's identity is its schema `$id` (the bare descent path, e.g.
 * `relating/articulating/utterance`; see the refactor decision note). An action
 * names its domain/codomain carriers by `$ref`-ing that `$id` in
 * `domainSchema`/`codomainSchema`. Cross-package, those `$ref`s point at carriers
 * defined in *other* packages — so something must resolve a `$id` string to the
 * schema document it names. This registry is that resolver: register schemas by
 * their `$id`, then `resolve` a `$ref` to the document it denotes.
 *
 * A `$ref` is a URI-reference. Two shapes occur here:
 *   - intra-document JSON pointer — `#/$defs/Token` — resolved against a base doc;
 *   - a carrier `$id`, optionally with a pointer — `relating/articulating/utterance`
 *     or `relating/articulating/utterance#/$defs/Token` — resolved through the map.
 * The registry is pure (no I/O): a loader populates it from disk elsewhere, so a
 * standalone clone needs only `node` to use it.
 *
 * @packageDocumentation
 */
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { resolveJsonPointer } from "@red-cup-engineering/json-services-section/resolve-json-pointer";

/** A schema registry: resolve a carrier `$ref` to the schema document it names. */

/** The `$id` of a schema document, or undefined if it declares none. */
export function schemaId(schema) {
  if (typeof schema === "object" && schema !== null && (schema).kind === "schema-contract") {
    return (schema).id;
  }
  if (!isJsonRecord(schema)) return undefined;
  const id = schema["$id"];
  return typeof id === "string" && id !== "" ? id : undefined;
}

function schemaDocument(schema) {
  return typeof schema === "object" && schema !== null && (schema).kind === "schema-contract"
    ? (schema).schema
    : schema;
}


/**
 * Build a schema registry keyed by `$id`, optionally seeded with schemas.
 *
 * @example
 * ```ts
 * import { schemaRegistry } from "@red-cup-engineering/relating";
 *
 * const registry = schemaRegistry([{ $id: "example/doc", type: "string" }]);
 * registry.resolve("example/doc")?.["$id"]; // "example/doc"
 * ```
 */
export function schemaRegistry(initial = []) {
  const byId = new Map();

  const register = (schema) => {
    const id = schemaId(schema);
    if (id === undefined) throw new TypeError("schemaRegistry.register: schema has no string $id");
    byId.set(id, schemaDocument(schema));
    return id;
  };

  for (const schema of initial) register(schema);

  const get = (id) => byId.get(id);

  const resolve = (ref, base) => {
    if (ref.startsWith("#")) return base === undefined ? undefined : resolveJsonPointer(base, ref);
    const hash = ref.indexOf("#");
    const id = hash < 0 ? ref : ref.slice(0, hash);
    const pointer = hash < 0 ? "" : ref.slice(hash);
    const doc = byId.get(id);
    if (doc === undefined) return undefined;
    return pointer === "" ? doc : resolveJsonPointer(doc, pointer);
  };

  const standalone = (id) => {
    const definitions = {};
    const visited = new Set();
    const schemaMapKeywords = new Set(["$defs", "properties", "patternProperties", "dependentSchemas"]);
    const schemaKeywords = new Set([
      "additionalItems", "additionalProperties", "contains", "contentSchema", "else", "if", "not",
      "propertyNames", "then", "unevaluatedItems", "unevaluatedProperties",
    ]);
    const schemaArrayKeywords = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
    const pointerSegment = (value) => value.replaceAll("~", "~0").replaceAll("/", "~1");
    const localReference = (owner, fragment = "") => `#/$defs/${pointerSegment(owner)}${fragment}`;
    const splitReference = (reference) => {
      const hash = reference.indexOf("#");
      return hash < 0 ? [reference, ""] : [reference.slice(0, hash), reference.slice(hash)];
    };
    const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

    const visit = (owner) => {
      if (visited.has(owner)) return;
      const document = byId.get(owner);
      if (document === undefined) throw new TypeError(`schemaRegistry.standalone: cannot resolve carrier ${owner}`);
      visited.add(owner);
      definitions[owner] = rewriteSchema(document, owner, true);
    };

    const rewriteReference = (reference, owner) => {
      const document = byId.get(owner);
      if (reference.startsWith("#")) {
        if (document === undefined || resolve(reference, document) === undefined) {
          throw new TypeError(`schemaRegistry.standalone: cannot resolve carrier reference ${reference}`);
        }
        return localReference(owner, reference.slice(1));
      }
      const [target, fragment] = splitReference(reference);
      if (resolve(reference) === undefined) {
        throw new TypeError(`schemaRegistry.standalone: cannot resolve carrier reference ${reference}`);
      }
      visit(target);
      return localReference(target, fragment === "" ? "" : fragment.slice(1));
    };

    const rewriteSchemaMap = (value, owner) => record(value)
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteSchema(item, owner)]))
      : value;
    const rewriteSchemaArray = (value, owner) => Array.isArray(value)
      ? value.map((item) => rewriteSchema(item, owner))
      : value;
    const rewriteSchema = (value, owner, documentRoot = false) => {
      if (!record(value)) return value;
      const rewritten = {};
      for (const [key, item] of Object.entries(value)) {
        if (documentRoot && key === "$id") continue;
        if (key === "$ref" && typeof item === "string") rewritten[key] = rewriteReference(item, owner);
        else if (schemaMapKeywords.has(key)) rewritten[key] = rewriteSchemaMap(item, owner);
        else if (key === "items") rewritten[key] = Array.isArray(item) ? rewriteSchemaArray(item, owner) : rewriteSchema(item, owner);
        else if (schemaKeywords.has(key)) rewritten[key] = rewriteSchema(item, owner);
        else if (schemaArrayKeywords.has(key)) rewritten[key] = rewriteSchemaArray(item, owner);
        else if (key === "dependencies" && record(item)) {
          rewritten[key] = Object.fromEntries(Object.entries(item).map(([name, dependency]) => [
            name,
            record(dependency) ? rewriteSchema(dependency, owner) : dependency,
          ]));
        } else rewritten[key] = item;
      }
      return rewritten;
    };

    const root = byId.get(id);
    if (root === undefined || !isJsonRecord(root)) throw new TypeError(`schemaRegistry.standalone: cannot resolve carrier ${id}`);
    visit(id);
    const dialect = root.$schema;
    return Object.freeze({
      ...(typeof dialect === "string" ? { $schema: dialect } : {}),
      $ref: localReference(id),
      $defs: definitions,
    });
  };

  return Object.freeze({ register, get, resolve, standalone, ids: () => Object.freeze([...byId.keys()]) });
}
