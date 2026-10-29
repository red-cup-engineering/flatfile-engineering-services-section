import { validateJsonSchemaInstance } from "@red-cup-engineering/computer-data-engine/validation";

/**
 * The JSON Schema services section's thin composed verb surface: named
 * re-exports of its fabricated operations, composed by exact pin from
 * @red-cup-engineering/validate-json-schema-instance-service. Carries no
 * logic of its own. The section's own richer schema algebra (createSchema,
 * validateInstance, schemaCorpus, and the assertion/EAVT recovery API)
 * remains exported separately from dist/index.mjs.
 */
export { validateJsonSchemaInstance };
