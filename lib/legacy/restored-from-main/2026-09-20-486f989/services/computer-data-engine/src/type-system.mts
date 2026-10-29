import type { FromJsonSchema } from "./schema.mjs";
import {
  compileJsonSchema,
  type CompiledJsonSchema,
  type JsonSchema,
  type ValidationIssue,
} from "./validation.mjs";
import { identifyContent } from "./content.mjs";

/** A successful result or an explicit refusal. */
export type Result<Value, Refusal> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ ok: false; refusal: Refusal }>;

/** The value admitted by a data type. */
export type TypeValue<Type extends DataType> = Type extends DataType<JsonSchema, infer Value> ? Value : never;

type UnionToIntersection<Value> =
  (Value extends unknown ? (argument: Value) => void : never) extends (argument: infer Intersection) => void
    ? Intersection
    : never;

type ParentValue<Parents extends readonly DataType[]> =
  [Parents[number]] extends [never] ? unknown : UnionToIntersection<TypeValue<Parents[number]>>;

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

const compiledSchemas = new WeakMap<DataType, CompiledJsonSchema>();

function dataRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.isFrozen(value)) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) => "value" in descriptor);
}

/** A portable declaration projection. It refuses accessor-backed or mutable lookalikes. */
function declarationContent(type: unknown, seen = new Set<object>()): unknown | undefined {
  if (!dataRecord(type) || seen.has(type)) return undefined;
  const { id, name, description, schema, references, parents } = type;
  if (typeof id !== "string" || typeof name !== "string" || typeof description !== "string"
    || !Array.isArray(references) || !Array.isArray(parents) || !Object.isFrozen(references) || !Object.isFrozen(parents)) return undefined;
  const next = new Set(seen); next.add(type);
  const parentContents = [];
  for (const parent of parents) {
    const content = declarationContent(parent, next);
    if (content === undefined) return undefined;
    parentContents.push(content);
  }
  try {
    return Object.freeze({ id, name, description, schema, references: [...references].sort((a, b) => identifyContent(a).localeCompare(identifyContent(b))), parents: parentContents.sort((a, b) => identifyContent(a).localeCompare(identifyContent(b))) });
  } catch { return undefined; }
}

/** Content identity of one locally established data-type declaration. */
export function typeIdentity(type: DataType): string {
  if (!compiledSchemas.has(type)) throw new TypeError("typeIdentity requires a declaration established by defineType");
  const content = declarationContent(type);
  if (content === undefined) throw new TypeError("typeIdentity requires an immutable data-type declaration");
  return identifyContent(content);
}

/** Whether two immutable declarations have the same portable content, including their parent closure. */
export function sameType(left: unknown, right: unknown): boolean {
  const leftContent = declarationContent(left);
  const rightContent = declarationContent(right);
  return leftContent !== undefined && rightContent !== undefined && identifyContent(leftContent) === identifyContent(rightContent);
}

/** Use a local compiled declaration when present, or rebuild an equivalent foreign declaration's pure validator. */
function compiledFor(type: unknown): CompiledJsonSchema | undefined {
  if (!dataRecord(type) || !Object.hasOwn(type, "schema") || !Object.hasOwn(type, "references")) return undefined;
  const cached = compiledSchemas.get(type as DataType);
  if (cached !== undefined) return cached;
  const references = type.references;
  if (!Array.isArray(references) || !Object.isFrozen(references)) return undefined;
  const compiled = compileJsonSchema(type.schema as JsonSchema, { references: references as readonly JsonSchema[] });
  return compiled.validate(undefined).issues.some((issue) => issue.kind === "schema") ? undefined : compiled;
}

function freeze<Value>(value: Value): Value {
  return Object.freeze(value);
}

function immutableCopy<Value>(value: Value): Value {
  if (Array.isArray(value)) return freeze(value.map(immutableCopy)) as Value;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .map(([key, entry]) => [key, immutableCopy(entry)] as const);
    return freeze(Object.fromEntries(entries)) as Value;
  }
  return value;
}

function definitionRefusal(kind: TypeDefinitionRefusal["kind"], message: string, issues: readonly ValidationIssue[] = []): Result<never, TypeDefinitionRefusal> {
  return freeze({ ok: false, refusal: freeze({ kind, message, issues: freeze([...issues]) }) });
}

function validDefinition(definition: DataTypeDefinition<JsonSchema>): string | undefined {
  if (definition.id.trim() === "") return "type id must be non-empty";
  if (definition.name.trim() === "") return "type name must be non-empty";
  if (definition.description.trim() === "") return "type description must be non-empty";
  if (definition.parents.some(parent => compiledFor(parent) === undefined)) return "parents must be established type declarations";
  const ids = definition.parents.map((parent) => parent.id);
  if (ids.includes(definition.id)) return "a type cannot specialize its own identifier";
  if (new Set(ids).size !== ids.length) return "a type may name each parent once";
  return undefined;
}

/**
 * Declare an immutable type without changing its schema or adding defaults.
 * Invalid JSON Schema documents are refused at this boundary.
 */
export function defineType<const Schema extends JsonSchema, const Parents extends readonly DataType[]>(
  definition: DataTypeDefinition<Schema, Parents>,
): Result<DataType<Schema, FromJsonSchema<Schema> & ParentValue<Parents>>, TypeDefinitionRefusal> {
  const malformed = validDefinition(definition);
  if (malformed !== undefined) return definitionRefusal("invalid-definition", malformed);

  const copiedSchema = immutableCopy(definition.schema);
  const references = immutableCopy(definition.references ?? []);
  const compiled = compileJsonSchema(copiedSchema, { references });
  const schemaCheck = compiled.validate(undefined);
  const schemaIssues = schemaCheck.issues.filter((issue) => issue.kind === "schema");
  if (schemaIssues.length > 0) return definitionRefusal("invalid-schema", "type schema is not a valid supported JSON Schema document", schemaIssues);

  const parents = freeze([...definition.parents]);
  const type = freeze({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    schema: copiedSchema,
    references,
    parentIds: freeze(parents.map((parent) => parent.id)),
    parents,
  }) as DataType<Schema, FromJsonSchema<Schema> & ParentValue<Parents>>;
  compiledSchemas.set(type, compiled);
  return freeze({
    ok: true,
    value: type,
  });
}

/** Declare a type whose extent is the intersection of its parent types and local schema. */
export function specializeType<const Schema extends JsonSchema, const Parents extends readonly DataType[]>(
  parents: Parents,
  definition: Readonly<Omit<DataTypeDefinition<Schema, Parents>, "parents">>,
): Result<DataType<Schema, FromJsonSchema<Schema> & ParentValue<Parents>>, TypeDefinitionRefusal> {
  return defineType({ ...definition, parents });
}

function refused(typeId: string, issues: readonly ValidationIssue[]): Admission<never> {
  return freeze({ ok: false, refusal: freeze({ kind: "not-admitted", typeId, issues: freeze([...issues]) }) });
}

/**
 * Admit a value through a standalone declaration and all of its parent declarations.
 * Declarations are immutable; admitted values are returned unchanged and are not frozen.
 */
export function admit<Type extends DataType>(type: Type, value: unknown): Admission<TypeValue<Type>> {
  const compiled = compiledFor(type);
  if (compiled === undefined) return refused(type.id, [freeze({ kind: "schema", path: "", keyword: "declaration", message: "type was not established by defineType" })]);
  for (const parent of type.parents) {
    const parentResult = admit(parent, value);
    if (!parentResult.ok) return parentResult;
  }
  const result = compiled.validate(value);
  return result.valid ? freeze({ ok: true, value: value as TypeValue<Type> }) : refused(type.id, result.issues);
}

/** Instantiate a type from an already-supplied value; no coercion, defaulting, copying, or freezing occurs. */
export const instantiate = admit;

function asTypeMap(types: readonly DataType[]): ReadonlyMap<string, DataType> {
  return new Map(types.map((type) => [type.id, type]));
}

function validateCatalog(types: readonly DataType[]): CatalogRefusal | undefined {
  const byId = asTypeMap(types);
  if (byId.size !== types.length) {
    const duplicate = types.find((type, index) => types.findIndex((candidate) => candidate.id === type.id) !== index)!;
    return freeze({ kind: "duplicate-type", typeId: duplicate.id, message: `type ${duplicate.id} already exists` });
  }
  for (const type of types) {
    if (compiledFor(type) === undefined) {
      return freeze({ kind: "invalid-type", typeId: type.id, message: "type was not established by defineType" });
    }
    const valid = validDefinition(type);
    if (valid !== undefined) return freeze({ kind: "invalid-type", typeId: type.id, message: valid });
    if (type.parentIds.length !== type.parents.length || type.parentIds.some((parentId, index) => parentId !== type.parents[index]?.id)) {
      return freeze({ kind: "invalid-type", typeId: type.id, message: "parent identifiers do not match parent declarations" });
    }
    for (const parentId of type.parentIds) {
      if (!byId.has(parentId)) return freeze({ kind: "dangling-parent", typeId: type.id, message: `parent ${parentId} is not in this type system` });
      if (!sameType(byId.get(parentId), type.parents.find((parent) => parent.id === parentId))) {
        return freeze({ kind: "invalid-type", typeId: type.id, message: `parent ${parentId} is not this catalog's declaration` });
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): string | undefined => {
    if (visiting.has(id)) return id;
    if (visited.has(id)) return undefined;
    visiting.add(id);
    const type = byId.get(id)!;
    for (const parentId of type.parentIds) {
      const cycle = visit(parentId);
      if (cycle !== undefined) return cycle;
    }
    visiting.delete(id);
    visited.add(id);
    return undefined;
  };
  for (const type of types) {
    const cycle = visit(type.id);
    if (cycle !== undefined) return freeze({ kind: "cyclic-parent", typeId: cycle, message: `parent relation for ${cycle} is cyclic` });
  }
  return undefined;
}

/** Construct a catalog only when every parent edge resolves and forms a DAG. */
export function createTypeSystem(types: readonly DataType[] = []): Result<TypeSystem, CatalogRefusal> {
  const normalized: DataType[] = [];
  for (const type of types) {
    const prior = normalized.find((candidate) => candidate.id === type.id);
    if (prior === undefined) normalized.push(type);
    else if (!sameType(prior, type)) return freeze({ ok: false, refusal: freeze({ kind: "duplicate-type", typeId: type.id, message: `type ${type.id} already exists` }) });
  }
  const copied = freeze(normalized);
  const refusal = validateCatalog(copied);
  return refusal === undefined ? freeze({ ok: true, value: freeze({ types: copied }) }) : freeze({ ok: false, refusal });
}

/** Resolve the complete declaration closure of roots, rejecting conflicting identities. */
export function collectTypeSystem(roots: readonly DataType[]): Result<TypeSystem, CatalogRefusal> {
  const seen = new Set<DataType>();
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (!current || compiledFor(current) === undefined) {
      return freeze({ ok: false, refusal: freeze({ kind: "invalid-type", typeId: current?.id ?? "", message: "type was not established by defineType" }) });
    }
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...current.parents);
  }
  return createTypeSystem([...seen]);
}

/** Declared specialization, using established declarations rather than equal labels. */
export function isSubtypeOf(type: DataType, parent: DataType): boolean {
  const pending = [type];
  const seen = new Set<DataType>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (sameType(current, parent)) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...current.parents);
  }
  return false;
}

/** Look up one catalogued type. */
export function getType(system: TypeSystem, typeId: string): DataType | undefined {
  return system.types.find((type) => type.id === typeId);
}

/** Add a new type while preserving a valid, acyclic parent graph. */
export function addType(system: TypeSystem, type: DataType): Result<TypeSystem, CatalogRefusal> {
  if (getType(system, type.id) !== undefined) return freeze({ ok: false, refusal: freeze({ kind: "duplicate-type", typeId: type.id, message: `type ${type.id} already exists` }) });
  return createTypeSystem([...system.types, type]);
}

function childIds(system: TypeSystem, typeId: string): readonly string[] {
  return system.types.filter((type) => type.parentIds.includes(typeId)).map((type) => type.id);
}

/** Replace a leaf declaration. Replacing a base is refused so children never retain stale parent snapshots. */
export function replaceType(system: TypeSystem, type: DataType): Result<TypeSystem, CatalogRefusal> {
  if (getType(system, type.id) === undefined) return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId: type.id, message: `type ${type.id} is not in this type system` }) });
  if (childIds(system, type.id).length > 0) return freeze({ ok: false, refusal: freeze({ kind: "referenced-type", typeId: type.id, message: `type ${type.id} has children and cannot be replaced independently` }) });
  return createTypeSystem(system.types.map((candidate) => candidate.id === type.id ? type : candidate));
}

/** Remove a leaf declaration. Removing a base is refused so no dangling references remain. */
export function removeType(system: TypeSystem, typeId: string): Result<TypeSystem, CatalogRefusal> {
  if (getType(system, typeId) === undefined) return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId, message: `type ${typeId} is not in this type system` }) });
  if (childIds(system, typeId).length > 0) return freeze({ ok: false, refusal: freeze({ kind: "referenced-type", typeId, message: `type ${typeId} has children and cannot be removed` }) });
  return createTypeSystem(system.types.filter((type) => type.id !== typeId));
}

/** Admit a value through the current catalog graph, resolving parents by their live identifiers. */
export function admitFromSystem(system: TypeSystem, typeId: string, value: unknown): Admission<unknown> | Result<never, UnknownTypeRefusal> {
  const type = getType(system, typeId);
  if (type === undefined) return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId }) });
  const visit = (current: DataType): Admission<unknown> => {
    for (const parentId of current.parentIds) {
      const parent = getType(system, parentId);
      if (parent === undefined) return refused(current.id, []);
      const admitted = visit(parent);
      if (!admitted.ok) return admitted;
    }
    const compiled = compiledFor(current);
    if (compiled === undefined) return refused(current.id, [freeze({ kind: "schema", path: "", keyword: "declaration", message: "type was not established by defineType" })]);
    const result = compiled.validate(value);
    return result.valid ? freeze({ ok: true, value }) : refused(current.id, result.issues);
  };
  return visit(type);
}

/** Return parent and child edges in catalog order for inspection and presentation. */
export function inspectTypeRelations(system: TypeSystem): readonly TypeRelation[] {
  return freeze(system.types.map((type) => freeze({
    typeId: type.id,
    parentIds: freeze([...type.parentIds]),
    childIds: freeze([...childIds(system, type.id)]),
  })));
}
