import { createTypeSystem, defineType, type DataType, type Result, type TypeSystem } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`actor/resource declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/**
 * Executable form of specifications/actor.schema.json.  An Actor is admitted
 * independently of a role, session, or transport projection.
 */
export const actorType = established(defineType({
  id: "https://schemas.561.group/computer/actor.schema.json",
  name: "Actor",
  description: "A bearer that can produce an effect only through an admitted capability and an explicitly authorized resource.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/actor.schema.json",
    type: "object",
    required: ["kind", "address", "capabilities", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "actor" },
      address: { type: "string", minLength: 1 },
      capabilities: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));

/** Executable form of specifications/resource.schema.json. */
export const resourceType = established(defineType({
  id: "https://schemas.561.group/computer/resource.schema.json",
  name: "Resource",
  description: "An addressable, classed, provenance-carrying resource.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/resource.schema.json",
    type: "object",
    required: ["kind", "address", "resourceClass", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "resource" },
      address: { type: "string", minLength: 1 },
      resourceClass: { type: "string", minLength: 1 },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));

/** The canonical executable base declarations for every typed computer system. */
export const actorResourceTypes: readonly DataType[] = Object.freeze([actorType, resourceType]);
export const actorResourceTypeSystem: TypeSystem = established(createTypeSystem(actorResourceTypes));
