import { type CatalogRefusal, type Result, type TypeSystem } from "./type-system.mjs";
import { type JsonSchema } from "./validation.mjs";
/** A complete declaration, with parent edges represented by identity rather than object references. */
export type DataTypeDocument = Readonly<{
    id: string;
    name: string;
    description: string;
    schema: JsonSchema;
    references: readonly JsonSchema[];
    parentIds: readonly string[];
}>;
export type TypeSystemDocument = Readonly<{
    version: 1;
    identity: string;
    types: readonly DataTypeDocument[];
}>;
export type TypeSystemDocumentRefusal = Readonly<{
    kind: "invalid-type-system-document" | "type-system-identity-mismatch";
    message: string;
}>;
/** Serialize every declaration and referenced schema; canonical order makes catalog insertion order irrelevant. */
export declare function typeSystemDocument(system: TypeSystem): Result<TypeSystemDocument, CatalogRefusal | TypeSystemDocumentRefusal>;
/**
 * Reconstitute one local catalog from portable declarations. All schemas pass the
 * existing type admission boundary, and all parents resolve to that catalog's
 * declarations. This admits data; it grants no execution or effect capability.
 */
export declare function admitTypeSystemDocument(input: unknown): Result<TypeSystem, CatalogRefusal | TypeSystemDocumentRefusal>;
