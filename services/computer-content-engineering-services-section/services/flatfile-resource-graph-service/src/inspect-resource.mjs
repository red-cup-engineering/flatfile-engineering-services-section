import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { admit, defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { composeProviders, queryRelations, serializeComposition } from "./provider/compositor.mjs";
import { defineProvider, validateProviderOutcome } from "./provider/provider.mjs";

function established(result) {
  if (result.ok) return result.value;
  throw new TypeError(`flatfile type declaration refused: ${result.refusal.message}`);
}

function assertAdmitted(type, value, label) {
  const result = admit(type, value);
  if (result.ok) return result.value;
  throw new TypeError(`${label} ${result.refusal.issues.map((issue) => `${issue.path || "/"} ${issue.message}`).join("; ")}`);
}

const inspectResourceInputType = established(defineType({
  id: "urn:red-cup-engineering:schema:flatfile:inspect-resource-input:1",
  name: "flatfile inspect-resource input",
  description: "A resource, its FERN graph, and supplied provider observations.",
  parents: [],
  schema: {
  type: "object",
  additionalProperties: false,
  required: ["fernPath", "resource", "observations"],
  properties: {
    fernPath: { type: "string", minLength: 1 },
    resource: {
      type: "object",
      additionalProperties: false,
      required: ["path", "content"],
      properties: { path: { type: "string", minLength: 1 }, content: { type: "string" } },
    },
    observations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["provider", "outcome"],
        properties: {
          provider: { type: "string", pattern: "\\S" },
          outcome: {
            type: "object", required: ["resources"], properties: {
              resources: { type: "array", items: { type: "object", required: ["resource", "observedAt", "cells"], properties: {
                resource: { type: "string", pattern: "\\S" }, focus: { anyOf: [{ type: "string", pattern: "\\S" }, { type: "null" }] }, observedAt: { type: "string", format: "date-time" },
                cells: { type: "array", items: { type: "object", required: ["subject", "predicate", "object"], properties: { subject: { type: "string", pattern: "\\S" }, predicate: { type: "string", pattern: "\\S" }, object: { type: "string", pattern: "\\S" }, polarity: {}, evidence: {} } } },
                diagnostics: { anyOf: [{ type: "array", items: {} }, { type: "null" }] },
              } } }, diagnostics: { anyOf: [{ type: "array", items: {} }, { type: "null" }] },
            },
          },
        },
      },
    },
  },
  },
}));

/** The single public admission schema for a FeltOS flatfile inspection request. */
export const inspectFlatfileResourceInputSchema = inspectResourceInputType.schema;

const inspectResourceOutputType = established(defineType({
  id: "urn:red-cup-engineering:schema:flatfile:inspect-resource-output:1",
  name: "flatfile inspect-resource output",
  description: "The inspection, provider composition, and selected occurrences for one resource.",
  parents: [],
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["inspection", "composition", "occurrences"],
    properties: {
      inspection: { type: "object" },
      composition: { type: "object" },
      occurrences: { type: "array", items: { type: "object" } },
    },
  },
}));

/** The single public output schema for a FeltOS flatfile inspection. */
export const inspectFlatfileResourceOutputSchema = inspectResourceOutputType.schema;

/** Admit and freeze one serializable flatfile inspection request. */
export function admitFlatfileInspectionRequest(input) {
  let snapshot;
  try {
    snapshot = JSON.parse(canonicalJson(input));
  } catch (error) {
    throw new TypeError(`inspect-resource input must be serializable: ${error.message}`);
  }
  assertAdmitted(inspectResourceInputType, snapshot, "inspect-resource input");
  return Object.freeze({
    fernPath: snapshot.fernPath,
    resource: Object.freeze({ path: snapshot.resource.path, content: snapshot.resource.content }),
    observations: Object.freeze(snapshot.observations.map((observation, index) => {
      if (observation === null || typeof observation !== "object" || Array.isArray(observation)) throw new TypeError(`inspect-resource observations[${index}] must be an object`);
      return Object.freeze({ provider: observation.provider, outcome: observation.outcome });
    })),
  });
}

function selectedProviders(input) {
  const ids = new Set();
  let selectedCount = 0;
  const providers = input.observations.map(({ provider, outcome }, index) => {
    const defined = defineProvider({ id: provider, observe: () => outcome });
    if (ids.has(defined.id)) throw new TypeError(`duplicate provider id: ${defined.id}`);
    ids.add(defined.id);
    const admitted = validateProviderOutcome(outcome, `inspect-resource observations[${index}]`);
    const selected = Object.freeze(admitted.resources.filter((graph) => graph.resource === input.resource.path));
    selectedCount += selected.length;
    return defineProvider({ id: defined.id, observe: () => Object.freeze({ resources: selected, diagnostics: admitted.diagnostics }) });
  });
  if (selectedCount === 0) {
    throw new TypeError(`inspect-resource: no provider graph matches ${input.resource.path}`);
  }
  return Object.freeze(providers);
}

/**
 * Compose the supplied provider observations for one admitted inspection request.
 * Pure: the contract inspection of the resource itself (a code operation) is supplied
 * by the caller to `assembleFlatfileInspection`.
 * @param {ReturnType<typeof admitFlatfileInspectionRequest>} snapshot An admitted inspection request.
 * @returns {Promise<{composition: object, occurrences: readonly object[]}>} Provider composition and selected evidence projections.
 * @throws {Error} When provider outcomes, identities, or selected resource graphs are invalid.
 */
export async function composeFlatfileInspectionEvidence(snapshot) {
  const composed = await composeProviders(selectedProviders(snapshot));
  return Object.freeze({ composition: serializeComposition(composed), occurrences: queryRelations(composed) });
}

/**
 * Join a contract inspection with composed evidence and admit the result against the output schema.
 * @param {object} inspection The contract inspection of the resource.
 * @param {{composition: object, occurrences: readonly object[]}} evidence Output of `composeFlatfileInspectionEvidence`.
 */
export function assembleFlatfileInspection(inspection, { composition, occurrences }) {
  const output = Object.freeze({ inspection, composition, occurrences });
  assertAdmitted(inspectResourceOutputType, output, "inspect-resource output");
  return output;
}
