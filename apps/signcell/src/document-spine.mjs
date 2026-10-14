/**
 * The portable document spine: native cells and explicit navigation geometry.
 * This is data admission. A spine asserts neither settlement nor issuer authority;
 * the producing SignCraft operation retains and admits that proof separately.
 */
import { address, cellSchema, cellSet, evidenceOf, valueOf } from "./cell.mjs";
import { retainedCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

export const DOCUMENT_SPINE_KIND = "signcell.document-spine";
const fail = (message) => { throw new TypeError(`documentSpine: ${message}`); };
const record = (value, keys, role) => {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join() !== [...keys].sort().join())
    fail(`${role} must have exactly ${keys.join(", ")}`);
};
const edges = (input, keys, endpoints, addresses, role) => {
  if (!Array.isArray(input)) fail(`${role} must be an array`);
  const seen = new Set();
  return input.map((edge) => {
    record(edge, keys, role);
    for (const key of endpoints)
      if (typeof edge[key] !== "string" || !addresses.has(edge[key]))
        fail(`${role} ${key} must resolve to a cell address`);
    const identity = semanticId(edge);
    if (seen.has(identity)) fail(`${role} contains a repeated edge`);
    seen.add(identity);
    return edge;
  });
};

/** Own native cells, every witness and explicit value, and the supplied geometry.
 * Address ordering is only the cell-set normal form; it is never document order.
 */
export function documentSpine({ cells, order = [], references = [] } = {}) {
  if (!Array.isArray(cells)) fail("cells must be an array");
  const admitted = cellSet(cells);
  const addresses = admitted.map((cell) => ({ key: address(cell), cell }));
  const keys = new Set(addresses.map(({ key }) => key));
  const body = retainedCarrier({
    kind: DOCUMENT_SPINE_KIND,
    version: 1,
    cells: admitted,
    addresses,
    order: edges(order, ["before", "after"], ["before", "after"], keys, "order"),
    references: edges(references, ["from", "to", "predicate"], ["from", "to"], keys, "reference"),
    valuationSites: admitted.map((cell) => ({
      address: address(cell), value: valueOf(cell), evidence: evidenceOf(cell),
    })),
  });
  return retainedCarrier({ ...body, identity: semanticId(body) });
}

/** Rebuild received coordinates from native cells; verify the complete commitment.
 * Neither a declared kind nor a supplied identity substitutes for reconstruction.
 */
export function admitDocumentSpine(input) {
  try {
    record(input, ["kind", "version", "identity", "cells", "addresses", "order", "references", "valuationSites"], "spine");
    if (input.kind !== DOCUMENT_SPINE_KIND || input.version !== 1) fail("unsupported spine kind or version");
    const value = documentSpine(input);
    if (input.identity !== value.identity || semanticId(input) !== semanticId(value))
      fail("identity or derived coordinates differ from the native cells and geometry");
    return Object.freeze({ ok: true, value });
  } catch (error) {
    return Object.freeze({ ok: false, refusal: Object.freeze({
      kind: "invalid-document-spine",
      message: error instanceof Error ? error.message : String(error),
    }) });
  }
}

const addressSchema = { type: "string", minLength: 1 };
const edgeSchema = (keys) => ({
  type: "object", required: keys, additionalProperties: false,
  properties: Object.fromEntries(keys.map((key) => [key, key === "predicate" ? {} : addressSchema])),
});
/** Wire shape only: admission also verifies native identities and every endpoint. */
export const documentSpineSchema = retainedCarrier({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/signcell/document-spine.schema.json",
  title: "DocumentSpine", type: "object", additionalProperties: false,
  required: ["kind", "version", "identity", "cells", "addresses", "order", "references", "valuationSites"],
  properties: {
    kind: { const: DOCUMENT_SPINE_KIND }, version: { const: 1 }, identity: addressSchema,
    cells: { type: "array", items: cellSchema },
    addresses: { type: "array", items: {
      type: "object", required: ["key", "cell"], additionalProperties: false,
      properties: { key: addressSchema, cell: cellSchema },
    } },
    order: { type: "array", items: edgeSchema(["before", "after"]) },
    references: { type: "array", items: edgeSchema(["from", "to", "predicate"]) },
    valuationSites: { type: "array", items: {
      type: "object", required: ["address", "value", "evidence"], additionalProperties: false,
      properties: { address: addressSchema, value: cellSchema.properties.value, evidence: {
        type: "object", required: ["for", "against"], additionalProperties: false,
        properties: { for: cellSchema.properties.for, against: cellSchema.properties.against, value: cellSchema.properties.value },
      } },
    } },
  },
});
