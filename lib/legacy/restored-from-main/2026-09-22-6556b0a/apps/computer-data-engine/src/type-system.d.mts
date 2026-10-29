import type { FromJsonSchema } from "./schema.mjs";
import { type JsonSchema, type ValidationIssue } from "./validation.mjs";
/** A successful result or an explicit refusal. */
export type Result<Value, Refusal> = Readonly<{
    ok: true;
    value: Value;
}> | Readonly<{
    ok: false;
    refusal: Refusal;
}>;
/** The value admitted by a data type. */
export type TypeValue<Type extends DataType> = Type extends DataType<JsonSchema, infer Value> ? Value : never;
type UnionToIntersection<Value> = (Value extends unknown ? (argument: Value) => void : never) extends (argument: infer Intersection) => void ? Intersection : never;
type ParentValue<Parents extends readonly DataType[]> = [
    Parents[number]
] extends [never] ? unknown : UnionToIntersection<TypeValue<Parents[number]>>;
/**
 * An immutable declaration of a set of data values.
 *
 * `schema` describes this declaration's local predicate.  A value belongs to
 * the type only when it satisfies that predicate and every declared parent.
 */
export type DataType<Schema extends JsonSchema = JsonSchema, Value = FromJsonSchema<Schema>> = Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Schema;
    references: readonly JsonSchema[];
    parentIds: readonly string[];
    parents: readonly DataType[];
    readonly __value?: Value;
}>;
/** The complete, explicit input required to declare a type. */
export type DataTypeDefinition<Schema extends JsonSchema, Parents extends readonly DataType[] = readonly DataType[]> = Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Schema;
    references?: readonly JsonSchema[];
    parents: Parents;
}>;
export type TypeDefinitionRefusal = Readonly<{
    kind: "invalid-definition" | "invalid-schema";
    message: string;
    issues: readonly ValidationIssue[];
}>;
export type AdmissionRefusal = Readonly<{
    kind: "not-admitted";
    typeId: string;
    issues: readonly ValidationIssue[];
}>;
export type UnknownTypeRefusal = Readonly<{
    kind: "unknown-type";
    typeId: string;
}>;
export type Admission<Value> = Result<Value, AdmissionRefusal>;
export type CatalogRefusal = Readonly<{
    kind: "duplicate-type" | "unknown-type" | "dangling-parent" | "cyclic-parent" | "referenced-type" | "invalid-type";
    typeId: string;
    message: string;
}>;
/** An immutable catalog whose parent edges are resolved by identifier. */
export type TypeSystem = Readonly<{
    types: readonly DataType[];
}>;
export type TypeRelation = Readonly<{
    typeId: string;
    parentIds: readonly string[];
    childIds: readonly string[];
}>;
/** Content identity of one locally established data-type declaration. */
export declare function typeIdentity(type: DataType): string;
/** Whether two immutable declarations have the same portable content, including their parent closure. */
export declare function sameType(left: unknown, right: unknown): boolean;
/**
 * Declare an immutable type without changing its schema or adding defaults.
 * Invalid JSON Schema documents are refused at this boundary.
 */
export declare function defineType<const Schema extends JsonSchema, const Parents extends readonly DataType[]>(definition: DataTypeDefinition<Schema, Parents>): Result<DataType<Schema, FromJsonSchema<Schema> & ParentValue<Parents>>, TypeDefinitionRefusal>;
/** Declare a type whose extent is the intersection of its parent types and local schema. */
export declare function specializeType<const Schema extends JsonSchema, const Parents extends readonly DataType[]>(parents: Parents, definition: Readonly<Omit<DataTypeDefinition<Schema, Parents>, "parents">>): Result<DataType<Schema, FromJsonSchema<Schema> & ParentValue<Parents>>, TypeDefinitionRefusal>;
/**
 * Admit a value through a standalone declaration and all of its parent declarations.
 * Declarations are immutable; admitted values are returned unchanged and are not frozen.
 */
export declare function admit<Type extends DataType>(type: Type, value: unknown): Admission<TypeValue<Type>>;
/** Instantiate a type from an already-supplied value; no coercion, defaulting, copying, or freezing occurs. */
export declare const instantiate: typeof admit;
/** Construct a catalog only when every parent edge resolves and forms a DAG. */
export declare function createTypeSystem(types?: readonly DataType[]): Result<TypeSystem, CatalogRefusal>;
/** Resolve the complete declaration closure of roots, rejecting conflicting identities. */
export declare function collectTypeSystem(roots: readonly DataType[]): Result<TypeSystem, CatalogRefusal>;
/** Declared specialization, using established declarations rather than equal labels. */
export declare function isSubtypeOf(type: DataType, parent: DataType): boolean;
/** Look up one catalogued type. */
export declare function getType(system: TypeSystem, typeId: string): DataType | undefined;
/** Add a new type while preserving a valid, acyclic parent graph. */
export declare function addType(system: TypeSystem, type: DataType): Result<TypeSystem, CatalogRefusal>;
/** Replace a leaf declaration. Replacing a base is refused so children never retain stale parent snapshots. */
export declare function replaceType(system: TypeSystem, type: DataType): Result<TypeSystem, CatalogRefusal>;
/** Remove a leaf declaration. Removing a base is refused so no dangling references remain. */
export declare function removeType(system: TypeSystem, typeId: string): Result<TypeSystem, CatalogRefusal>;
/** Admit a value through the current catalog graph, resolving parents by their live identifiers. */
export declare function admitFromSystem(system: TypeSystem, typeId: string, value: unknown): Admission<unknown> | Result<never, UnknownTypeRefusal>;
/** Return parent and child edges in catalog order for inspection and presentation. */
export declare function inspectTypeRelations(system: TypeSystem): readonly TypeRelation[];
export {};
