/**
 * The one implementation of the schema-assertion trace: a JSON Schema document
 * unfolded into append-only EAVT pointer-cell rows ({ e, a, v, t }), merged by
 * content identity, cohered cell by cell, and folded back into a schema.
 *
 * Both faces of the package consume this module: the positional API exported
 * from `index.mts` (and so from `dist/index.mjs`) and the request/response
 * operations under `scripts/` (unfold-schema, fold-schema-assertions, ...).
 * It is plain JavaScript with a sibling `.d.mts` so that the scripts keep
 * working without a build, exactly as `assert-keyword-values.mjs` does.
 *
 * Entities are `<base>#<json-pointer>`; the attribute is the key (object
 * member name or array index) under that pointer; a composite value is carried
 * as an empty `{}` or `[]` whose members are further rows. The representation
 * is deliberately not conflated with `$id`, file, digest or RMN coordinates.
 */
import { createHash } from "node:crypto";
import {
  canonical,
  freezeJson,
  isJsonRecord,
  isJsonValue,
  requireJsonValue,
} from "@red-cup-engineering/json-services-section";
import { DRAFT_2020_12 } from "./schema-vocabulary.mjs";

const immutable = (value) => Object.freeze(value);
const escapePointer = (part) => part.replaceAll("~", "~0").replaceAll("/", "~1");
const hexDigest = (text) => createHash("sha256").update(text, "utf8").digest("hex");

function schemaRecord(value, what) {
  if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object`);
  return value;
}

function own(target, key, value) {
  // Keys such as "__proto__" are data here, never prototype assignment.
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

export function assertSchemaAssertion(value) {
  if (!isJsonRecord(value)) throw new TypeError("schema assertion must be a JSON object");
  const { e, a, v, t } = value;
  if (typeof e !== "string" || e === "") throw new TypeError("schema assertion e must be a non-empty string");
  if (typeof a !== "string" || a === "") throw new TypeError("schema assertion a must be a non-empty string");
  if (!isJsonValue(v)) throw new TypeError("schema assertion v must be a JSON value");
  if (typeof t !== "string" || t === "") throw new TypeError("schema assertion t must be a non-empty string");
  return immutable({ e, a, v, t });
}

export function schemaAssertionId(assertion) {
  return hexDigest(canonical(assertSchemaAssertion(assertion)));
}

export function parseSchemaAssertions(content) {
  const out = [];
  for (const [index, line] of content.split("\n").entries()) {
    if (line.trim() === "") continue;
    try {
      out.push(assertSchemaAssertion(JSON.parse(line)));
    } catch (error) {
      throw new TypeError(`line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return out;
}

export function serializeSchemaAssertions(assertions) {
  return assertions.length === 0
    ? ""
    : `${assertions.map((row) => canonical(assertSchemaAssertion(row))).join("\n")}\n`;
}

export function mergeSchemaAssertions(...traces) {
  const rows = new Map();
  for (const row of traces.flat().map(assertSchemaAssertion)) rows.set(schemaAssertionId(row), row);
  return [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, row]) => row);
}

/** Unfold a schema into the historical EAVT pointer-cell representation. */
export function unfoldSchema(schema, options, legacyBase = "") {
  const opts = typeof options === "string" ? { base: legacyBase, t: options } : options;
  if (!opts?.t) throw new TypeError("unfoldSchema: assertion time is required");
  const admitted = schemaRecord(requireJsonValue(schema, "schema"), "schema");
  const rows = [];
  const walk = (node, pointer) => {
    if (node === null || typeof node !== "object") return;
    const entries = Array.isArray(node)
      ? node.map((item, index) => [String(index), item])
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key === "") throw new TypeError("unfoldSchema: object keys must be non-empty");
      const container = item !== null && typeof item === "object";
      const carried = Array.isArray(item) ? [] : container ? {} : item;
      rows.push(immutable({ e: `${opts.base ?? ""}#${pointer}`, a: key, v: carried, t: opts.t }));
      if (container) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(admitted, "");
  return Object.freeze(rows);
}

function pointerOf(entity) {
  const hashAt = entity.indexOf("#");
  return hashAt < 0 ? entity : entity.slice(hashAt + 1);
}

export function foldSchema(assertions) {
  const nodes = new Map([["", {}]]);
  const depth = (pointer) => (pointer === "" ? 0 : pointer.split("/").length - 1);
  const rows = assertions.map(assertSchemaAssertion).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of rows) {
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new TypeError(`foldSchema: no node at pointer ${JSON.stringify(pointer)}`);
    let materialized = row.v;
    if (row.v !== null && typeof row.v === "object") {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    if (Array.isArray(parent)) parent[Number(row.a)] = materialized;
    else own(parent, row.a, materialized);
  }
  return schemaRecord(freezeJson(requireJsonValue(nodes.get("") ?? {}, "folded schema")), "folded schema");
}

export function cohereSchemaAssertions(assertions) {
  const cells = new Map();
  for (const row of assertions.map(assertSchemaAssertion)) {
    const key = `${canonical(row.e)}\0${row.a}`;
    cells.set(key, [...(cells.get(key) ?? []), row]);
  }
  const accepted = [];
  const contradictions = [];
  for (const rows of cells.values()) {
    const values = new Map(rows.map((row) => [canonical(row.v), row.v]));
    if (values.size > 1) {
      contradictions.push(immutable({
        e: rows[0].e,
        a: rows[0].a,
        values: Object.freeze([...values.values()]),
        assertions: Object.freeze([...rows]),
      }));
    } else accepted.push(rows.reduce((left, right) => (left.t >= right.t ? left : right)));
  }
  contradictions.sort((left, right) => `${left.e}\0${left.a}`.localeCompare(`${right.e}\0${right.a}`));
  return immutable({
    schema: contradictions.length === 0 ? foldSchema(accepted) : null,
    contradictions: Object.freeze(contradictions),
  });
}

export const foldSchemaAssertions = cohereSchemaAssertions;

export function projectSchemaAssertions(assertions, options) {
  const result = cohereSchemaAssertions(assertions);
  if (result.schema === null) return result;
  const claimed = result.schema.$id;
  if (typeof claimed === "string" && claimed !== options.id) {
    throw new TypeError(`projectSchemaAssertions: claimed $id ${JSON.stringify(claimed)} does not match ${JSON.stringify(options.id)}`);
  }
  const { $schema: _dialect, $id: _id, ...rest } = result.schema;
  return immutable({
    schema: schemaRecord(freezeJson({ $schema: DRAFT_2020_12, $id: options.id, ...rest }), "projected schema"),
    contradictions: Object.freeze([]),
  });
}

export function schemaAssertionTriple(assertion) {
  const row = assertSchemaAssertion(assertion);
  return immutable({ s: row.e, p: row.a, o: row.v });
}

export function schemaAssertionEavt(assertion) {
  const row = assertSchemaAssertion(assertion);
  return Object.freeze([row.e, row.a, row.v, row.t]);
}

export function schemaAssertionEavtId(assertion) {
  return hexDigest(canonical(assertSchemaAssertion(assertion)));
}
