/**
 * @module csl-projection
 * One source record's JSON to a CSL-JSON item by a CSL projection: data
 * naming, for each CSL variable, the rule that reads it from the record
 * (`csl-projection.schema.json`). A bibliographic source is added by writing
 * its projection, not a projection script.
 */

import { isObjectRecord as isRecord } from "@red-cup-engineering/json-services-section";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import projectionSchema from "./csl-projection.schema.json" with { type: "json" };
import {
  bareDoi,
  cslDate,
  cslDateFromIsoString,
  cslName,
  cslNames,
  cslString as str,
  stripUndefinedCslFields,
  toCslType,
} from "./csl-json.mjs";

export { projectionSchema };

/** Admit a CSL projection: `{ ok: true, value }` or `{ ok: false, errors }`. */
export function admitCslProjection(projection) {
  const { ok, errors } = validateSchemaInstance({ schema: projectionSchema, instance: projection });
  return ok ? Object.freeze({ ok, value: projection }) : Object.freeze({ ok, errors });
}

/** Read a dot path; a segment ending in `[]` maps the rest of the path over an array. */
export function readPath(record, path) {
  const [head, ...rest] = path.split(".");
  if (head.endsWith("[]")) {
    const list = record?.[head.slice(0, -2)];
    if (!Array.isArray(list)) return undefined;
    const values = rest.length === 0 ? list : list.map((entry) => readPath(entry, rest.join(".")));
    return values.flat().filter((value) => value !== undefined && value !== null);
  }
  const value = record?.[head];
  return rest.length === 0 ? value : readPath(value, rest.join("."));
}

const words = (value, separator) => (Array.isArray(value) ? value : separator ? String(value ?? "").split(separator) : [value]);
const text = (value) => str(Array.isArray(value) ? value[0] : value)?.replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim() || undefined;

function names(value, rule) {
  if (value === undefined) return undefined;
  const entries = typeof value === "string" ? words(value.replace(/\.$/u, ""), rule.split).map((name) => name.trim()).filter(Boolean) : [value].flat();
  return cslNames(entries.map((entry) => {
    if (isRecord(entry)) {
      if (rule.literal && str(entry[rule.literal])) return cslName({ literal: str(entry[rule.literal]) });
      return cslName({ family: rule.family ? str(entry[rule.family]) : undefined, given: rule.given ? str(entry[rule.given]) : undefined });
    }
    const initials = rule.initials ? String(entry).match(/^(.+)\s+(\p{Lu}{1,4})$/u) : null;
    return initials ? { family: initials[1], given: initials[2] } : entry;
  }));
}

function cslType(value, rule) {
  const aliases = rule.aliases ?? {};
  const types = words(value, rule.split)
    .map((word) => str(word)?.trim().toLowerCase())
    .filter((word) => word !== undefined && word in aliases)
    .map((word) => aliases[word]);
  return toCslType((rule.prefer ?? []).find((type) => types.includes(type)) ?? types[0], {});
}

const KINDS = Object.freeze({
  text,
  title: (value) => text(value)?.replace(/\.$/u, ""),
  names,
  date: (value) => cslDateFromIsoString(Array.isArray(value) ? value[0] : value),
  year: (value) => cslDate(Number(Array.isArray(value) ? value[0] : value)),
  doi: (value) => bareDoi(Array.isArray(value) ? value[0] : value),
  type: cslType,
  join: (value, rule) => {
    const unique = [...new Set([value].flat().map(text).filter(Boolean))];
    return unique.length > 0 ? unique.join(rule.separator ?? "; ") : undefined;
  },
});

function fill(template, record) {
  let missing = false;
  const filled = template.replace(/\{([^}]+)\}/gu, (_, path) => {
    const value = str(readPath(record, path));
    if (value === undefined) missing = true;
    return value ?? "";
  });
  return missing ? undefined : filled;
}

function read(record, rule) {
  if (typeof rule === "string") return text(readPath(record, rule));
  if (rule.first) {
    for (const option of rule.first) {
      const value = read(record, option);
      if (value !== undefined && !(Array.isArray(value) && value.length === 0)) return value;
    }
    return undefined;
  }
  const raw = "value" in rule ? rule.value : rule.template ? fill(rule.template, record) : readPath(record, rule.path);
  if (raw === undefined || raw === null) return undefined;
  return rule.as ? KINDS[rule.as](raw, rule) : "value" in rule ? raw : text(raw);
}

/**
 * Project one source record to a CSL-JSON item by an admitted projection.
 *
 * @param {Readonly<Record<string, unknown>>} record
 * @param {Readonly<Record<string, unknown>>} projection
 * @returns {object} the frozen CSL-JSON item, carrying only the variables the record supplied.
 * @throws {TypeError} when record is not a record or the projection is not admitted.
 */
export function projectCslItem(record, projection) {
  if (!isRecord(record)) throw new TypeError("projectCslItem requires a source record object");
  const admitted = admitCslProjection(projection);
  if (!admitted.ok) throw new TypeError(`projectCslItem: projection refused: ${admitted.errors.map((e) => `${e.pointer} ${e.message}`).join("; ")}`);
  const item = Object.fromEntries(Object.entries(projection).map(([variable, rule]) => [variable, read(record, rule)]));
  // CSL requires a type; a record whose own type words alias to none is a `document`.
  if ("type" in projection && item.type === undefined) item.type = toCslType(undefined, {});
  return Object.freeze(stripUndefinedCslFields(item));
}
