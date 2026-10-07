/**
 * vault-note-schema/src/diataxis-coverage-schema - JSON Schema contracts for
 * the Diataxis coverage surface and classification objects that
 * `./diataxis.mjs` computes. Relocated verbatim from metroplat's
 * `src/integrations/knowledge-vaults/schema.mts`.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const diataxisModeNameSchema = { enum: ["tutorial", "how-to", "explanation", "reference"] };

export const diataxisCoverageSurfaceContract = schemaFrom({
  $id: "vault-note-schema/diataxis/coverage-surface",
  title: "DiataxisCoverageSurface",
  description: "Admitted documentation loci whose fibers are Diataxis modes.",
  type: "object",
  required: ["kind", "id", "items"],
  properties: {
    kind: { const: "diataxis.coverage.surface" },
    id: { type: "string", minLength: 1 },
    requiredModes: {
      type: "array",
      items: diataxisModeNameSchema,
    },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "id", "mode"],
        properties: {
          kind: { const: "diataxis.coverage.item" },
          id: { type: "string", minLength: 1 },
          mode: diataxisModeNameSchema,
          title: { type: "string", minLength: 1 },
          source: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
});

export const diataxisCoverageClassificationContract = schemaFrom({
  $id: "vault-note-schema/diataxis/coverage-classification",
  title: "DiataxisCoverageClassification",
  description: "The finite coverage classification over admitted Diataxis documentation loci.",
  type: "object",
  required: ["kind", "surface", "itemCount", "requiredModes", "coveredModes", "missingModes", "modes", "diagonal", "offDiagonal", "judgment"],
  properties: {
    kind: { const: "diataxis.coverage.classification" },
    surface: { type: "string", minLength: 1 },
    itemCount: { type: "integer", minimum: 0 },
    requiredModes: { type: "array", items: diataxisModeNameSchema },
    coveredModes: { type: "array", items: diataxisModeNameSchema },
    missingModes: { type: "array", items: diataxisModeNameSchema },
    modes: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "mode", "reading", "application", "cognition", "count", "loci"],
        properties: {
          kind: { const: "diataxis.coverage.mode-classification" },
          mode: diataxisModeNameSchema,
          reading: { enum: readingFamilies.knowledge },
          application: { type: "boolean" },
          cognition: { type: "boolean" },
          count: { type: "integer", minimum: 0 },
          loci: { type: "array", items: { type: "string", minLength: 1 } },
        },
        additionalProperties: false,
      },
    },
    diagonal: { type: "object" },
    offDiagonal: { type: "object" },
    judgment: {
      type: "object",
      required: ["kind", "surface", "requiredModes", "diagonalComplete", "offDiagonalComplete"],
      properties: {
        kind: { enum: ["diataxis.coverage:witness", "diataxis.coverage-obstruction"] },
        surface: { type: "string", minLength: 1 },
        requiredModes: { type: "array", items: diataxisModeNameSchema },
        itemCount: { type: "integer", minimum: 0 },
        missingModes: { type: "array", items: diataxisModeNameSchema },
        diagonalComplete: { type: "boolean" },
        offDiagonalComplete: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});
