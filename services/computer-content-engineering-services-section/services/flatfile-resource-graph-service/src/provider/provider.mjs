import { admit, defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";

function established(result) {
  if (result.ok) return result.value;
  throw new TypeError(`flatfile type declaration refused: ${result.refusal.message}`);
}

function assertAdmitted(type, value, label) {
  const result = admit(type, value);
  if (result.ok) return result.value;
  throw new TypeError(`${label} ${result.refusal.issues.map((issue) => `${issue.path || "/"} ${issue.message}`).join("; ")}`);
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const nonEmptyStringSchema = Object.freeze({ type: "string", pattern: "\\S" });

const providerCellValueSchema = Object.freeze({
  type: "object",
  required: ["subject", "predicate", "object"],
  properties: { subject: nonEmptyStringSchema, predicate: nonEmptyStringSchema, object: nonEmptyStringSchema, polarity: {}, evidence: {} },
});

const resourceGraphValueSchema = Object.freeze({
  type: "object",
  required: ["resource", "observedAt", "cells"],
  properties: {
    resource: nonEmptyStringSchema,
    focus: { anyOf: [nonEmptyStringSchema, { type: "null" }] },
    observedAt: { type: "string", format: "date-time" },
    cells: { type: "array", items: providerCellValueSchema },
    diagnostics: { anyOf: [{ type: "array", items: {} }, { type: "null" }] },
  },
});

/** The authored cell declaration admitted into the immutable provider carrier. */
const providerCellDeclaration = {
  $id: "urn:red-cup-engineering:schema:flatfile:provider-cell:1",
  ...providerCellValueSchema,
};

/** The authored resource graph declaration admitted into the immutable provider carrier. */
const resourceGraphDeclaration = {
  $id: "urn:red-cup-engineering:schema:flatfile:resource-graph:1",
  ...resourceGraphValueSchema,
};

/** The authored provider outcome declaration admitted into the immutable provider carrier. */
const providerOutcomeDeclaration = {
  $id: "urn:red-cup-engineering:schema:flatfile:provider-outcome:1",
  type: "object",
  required: ["resources"],
  properties: {
    resources: { type: "array", items: resourceGraphValueSchema },
    diagnostics: { anyOf: [{ type: "array", items: {} }, { type: "null" }] },
  },
};

/** The shared carrier that validates provider observation cells. */
export const providerCellType = established(defineType({ id: "urn:red-cup-engineering:schema:flatfile:provider-cell:1", name: "flatfile provider cell", description: "One provider-observed resource relation.", parents: [], schema: providerCellDeclaration }));

/** The immutable public schema for provider observation cells. */
export const providerCellSchema = providerCellType.schema;

/** The shared carrier that validates provider resource graphs. */
export const resourceGraphType = established(defineType({ id: "urn:red-cup-engineering:schema:flatfile:resource-graph:1", name: "flatfile resource graph", description: "One provider observation of one resource.", parents: [], schema: resourceGraphDeclaration }));

/** The immutable public schema for provider resource graphs. */
export const resourceGraphSchema = resourceGraphType.schema;

/** The shared carrier that validates provider outcomes for every flatfile face. */
export const providerOutcomeType = established(defineType({ id: "urn:red-cup-engineering:schema:flatfile:provider-outcome:1", name: "flatfile provider outcome", description: "A finite set of resource observations from one provider.", parents: [], schema: providerOutcomeDeclaration }));

/** The immutable public schema for provider outcomes. */
export const providerOutcomeSchema = providerOutcomeType.schema;

/**
 * A provider owns acquisition of its native resource kind. FARS standardizes
 * only the provider's graph-bearing observation outcome, never the upstream
 * carrier the provider had to understand.
 */
export function defineProvider({ id, observe }) {
  nonEmptyString(id, "provider.id");
  if (typeof observe !== "function") throw new TypeError("provider.observe must be a function");
  return Object.freeze({ id, observe });
}

export function validateResourceGraph(value, label = "resource graph") {
  assertAdmitted(resourceGraphType, value, label);
  const resource = value.resource;
  const focus = value.focus ?? resource;
  const observedAt = value.observedAt;
  const cells = value.cells.map((cell, index) => {
    return Object.freeze({
      subject: cell.subject,
      predicate: cell.predicate,
      object: cell.object,
      ...(hasOwn(cell, "polarity") ? { polarity: cell.polarity } : {}),
      ...(hasOwn(cell, "evidence") ? { evidence: cell.evidence } : {}),
    });
  });
  const diagnostics = value.diagnostics ?? [];
  if (!Array.isArray(diagnostics)) throw new TypeError(`${label}.diagnostics must be an array when present`);
  return Object.freeze({ resource, focus, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([...diagnostics]) });
}

export function validateProviderOutcome(value, providerId) {
  assertAdmitted(providerOutcomeType, value, `${providerId} outcome`);
  const diagnostics = value.diagnostics ?? [];
  return Object.freeze({
    resources: Object.freeze(value.resources.map((resource, index) => validateResourceGraph(resource, `${providerId}.resources[${index}]`))),
    diagnostics: Object.freeze([...diagnostics]),
  });
}
