import { createTypeSystem, defineType } from "./type-system.mjs";
import { compileJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { canonicalCborToNiUri, encodeCanonical } from "@red-cup-engineering/cbor-services-section";
const identify = (value) => canonicalCborToNiUri(encodeCanonical(value));
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const refused = (kind, message) => Object.freeze({ ok: false, refusal: Object.freeze({ kind, message }) });
const schemaShape = { anyOf: [{ type: "boolean" }, { type: "object" }] };
const documentShape = compileJsonSchema({
    type: "object", required: ["version", "identity", "types"], additionalProperties: false,
    properties: {
        version: { const: 1 }, identity: { type: "string", minLength: 1 },
        types: { type: "array", items: {
                type: "object", required: ["id", "name", "description", "schema", "references", "parentIds"], additionalProperties: false,
                properties: {
                    id: { type: "string", minLength: 1 }, name: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 },
                    schema: schemaShape, references: { type: "array", items: schemaShape },
                    parentIds: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
                },
            } },
    },
});
/** Serialize every declaration and referenced schema; canonical order makes catalog insertion order irrelevant. */
export function typeSystemDocument(system) {
    const checked = createTypeSystem(system.types);
    if (!checked.ok)
        return checked;
    try {
        const types = Object.freeze(checked.value.types.map(type => Object.freeze({
            id: type.id, name: type.name, description: type.description, schema: type.schema,
            references: Object.freeze([...type.references].sort((a, b) => order(identify(a), identify(b)))),
            parentIds: Object.freeze([...type.parentIds].sort(order)),
        })).sort((a, b) => order(a.id, b.id)));
        const identity = identify({ version: 1, types });
        return Object.freeze({ ok: true, value: Object.freeze({ version: 1, identity, types }) });
    }
    catch (error) {
        return refused("invalid-type-system-document", error instanceof Error ? error.message : String(error));
    }
}
/**
 * Reconstitute one local catalog from portable declarations. All schemas pass the
 * existing type admission boundary, and all parents resolve to that catalog's
 * declarations. This admits data; it grants no execution or effect capability.
 */
export function admitTypeSystemDocument(input) {
    const shape = documentShape.validate(input);
    if (!shape.valid)
        return refused("invalid-type-system-document", shape.issues.map(issue => `${issue.path || "/"} ${issue.message}`).join("; "));
    const document = input;
    const declarations = new Map();
    for (const type of document.types) {
        if (declarations.has(type.id))
            return refused("invalid-type-system-document", `duplicate type ${type.id}`);
        declarations.set(type.id, type);
    }
    for (const type of document.types) {
        if (type.parentIds.some(id => !declarations.has(id)))
            return refused("invalid-type-system-document", `type ${type.id} has an unresolved parent`);
    }
    const admitted = new Map();
    const pending = new Map(declarations);
    while (pending.size > 0) {
        let progressed = false;
        for (const [id, type] of pending) {
            if (!type.parentIds.every(parent => admitted.has(parent)))
                continue;
            const result = defineType({ ...type, parents: type.parentIds.map(parent => admitted.get(parent)) });
            if (!result.ok)
                return refused("invalid-type-system-document", `type ${id}: ${result.refusal.message}`);
            admitted.set(id, result.value);
            pending.delete(id);
            progressed = true;
        }
        if (!progressed)
            return refused("invalid-type-system-document", "type inheritance contains a cycle");
    }
    const catalog = createTypeSystem([...admitted.values()]);
    if (!catalog.ok)
        return catalog;
    const reconstructed = typeSystemDocument(catalog.value);
    if (!reconstructed.ok)
        return reconstructed;
    if (document.identity !== reconstructed.value.identity)
        return refused("type-system-identity-mismatch", "type declarations do not match their advertised content identity");
    return catalog;
}
