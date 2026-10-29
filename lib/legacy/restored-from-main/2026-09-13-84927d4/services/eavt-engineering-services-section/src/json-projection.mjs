import { requireJsonValue } from "@red-cup-engineering/computer-data-engine/json";
import { assertRow } from "./eavt.mjs";

const escapePointer = (part) => part.replace(/~/g, "~0").replace(/\//g, "~1");
const unescapePointer = (part) => part.replace(/~1/g, "/").replace(/~0/g, "~");
const isContainer = (value) => value !== null && typeof value === "object";

/**
 * Projects a JSON value to strict EAVT rows addressed by JSON Pointer.
 * @param {unknown} value JSON value to project.
 * @param {{readonly base?: string, readonly t: unknown}} options Address and witness time.
 * @returns {object[]} Admitted EAVT rows.
 * @throws {TypeError} When input is not JSON or has an empty object key.
 */
export function unfoldJson(value, options) {
  const source = requireJsonValue(value, "JSON projection value");
  const time = requireJsonValue(options?.t, "JSON projection time");
  const rows = [];
  const walk = (node, pointer) => {
    if (!isContainer(node)) return;
    const entries = Array.isArray(node) ? node.map((item, index) => [String(index), item]) : Object.entries(node);
    for (const [key, item] of entries) {
      if (key.length === 0) throw new TypeError("unfoldJson: object keys must be non-empty");
      const materialized = Array.isArray(item) ? [] : isContainer(item) ? {} : item;
      rows.push(assertRow({ e: `${options?.base ?? ""}#${pointer}`, a: key, v: materialized, t: time }));
      if (isContainer(item)) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(source, "");
  return rows;
}

/**
 * Reconstructs a JSON value from JSON-Pointer-addressed EAVT rows.
 * @param {readonly object[]} rows EAVT rows created by unfoldJson.
 * @returns {unknown} Reconstructed JSON value.
 * @throws {TypeError} When rows do not describe an object/array tree.
 */
export function foldJson(rows) {
  const pointerOf = (entity) => {
    if (typeof entity !== "string") throw new TypeError("foldJson: EAVT entity must be a JSON Pointer string");
    const hash = entity.indexOf("#");
    return hash < 0 ? entity : entity.slice(hash + 1);
  };
  const depth = (pointer) => pointer === "" ? 0 : pointer.split("/").length - 1;
  const nodes = new Map([["", {}]]);
  const admitted = rows.map(assertRow).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of admitted) {
    if (typeof row.a !== "string") throw new TypeError("foldJson: EAVT attribute must be a string");
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new TypeError(`foldJson: no node at pointer ${JSON.stringify(pointer)}`);
    const key = Array.isArray(parent) ? Number(row.a) : row.a;
    if (Array.isArray(parent) && (!Number.isInteger(key) || key < 0)) throw new TypeError("foldJson: array attribute must be a non-negative integer");
    let materialized = row.v;
    if (isContainer(row.v)) {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    parent[key] = materialized;
  }
  return requireJsonValue(nodes.get("") ?? {}, "folded JSON");
}

export { unescapePointer };
