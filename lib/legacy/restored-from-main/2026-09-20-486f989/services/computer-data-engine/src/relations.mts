import { admit, collectTypeSystem, type DataType, type Result, type TypeValue } from "./type-system.mjs";
import { typeSystemDocument } from "./type-system-document.mjs";
import { encodeCanonical } from "./identity/cbor-codec.mjs";
import { canonicalCborToNiUri } from "./identity/cbor-ni.mjs";

/** A predicate's three typed positions. Witnesses distinguish observations of one claim. */
export type Relation<D extends DataType = DataType, C extends DataType = DataType, W extends DataType = DataType> = Readonly<{
  id: string; domain: D; codomain: C; witness: W;
}>;
export type Statement<R extends Relation = Relation> = Readonly<{
  subject: TypeValue<R["domain"]>; predicate: string; object: TypeValue<R["codomain"]>; witness: TypeValue<R["witness"]>;
}>;
export type AddressedStatement = Readonly<{ id: string; statement: Statement }>;
export type RelationRefusal = Readonly<{ code: string; message: string }>;
export type RelationalField = Readonly<{ catalogIdentity: string; relations: readonly Relation[]; statements: readonly AddressedStatement[] }>;
export type RelationalFieldDocument = Readonly<{ version: 1; catalogIdentity: string; statements: readonly AddressedStatement[] }>;

const accepted = <T,>(value: T): Result<T, never> => Object.freeze({ ok: true, value });
const refused = (code: string, message: string): Result<never, RelationRefusal> => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const relations = new WeakSet<Relation>();
const identify = (value: unknown): string => canonicalCborToNiUri(encodeCanonical(value));

/** Copy a portable value without retaining mutable caller-owned data. */
function snapshot<T>(value: T, ancestors = new Set<object>()): T {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (typeof value !== "object" || ancestors.has(value)) throw new TypeError("statement positions must be acyclic JSON values");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("statement positions must be plain data");
  ancestors.add(value);
  const result = Array.isArray(value) ? value.map(item => snapshot(item, ancestors)) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)]));
  ancestors.delete(value);
  return Object.freeze(result) as T;
}

/** Establish one predicate over the common type system, including all inherited constraints. */
export function defineRelation<D extends DataType, C extends DataType, W extends DataType>(definition: Relation<D, C, W>): Result<Relation<D, C, W>, RelationRefusal> {
  if (!definition || typeof definition.id !== "string" || definition.id.trim() === "") return refused("invalid-relation", "relation id must be nonempty");
  const types = collectTypeSystem([definition.domain, definition.codomain, definition.witness]);
  if (!types.ok) return refused("invalid-relation-types", types.refusal.message);
  const relation = Object.freeze({ id: definition.id, domain: definition.domain, codomain: definition.codomain, witness: definition.witness });
  relations.add(relation);
  return accepted(relation);
}

/** Admit an actual typed assertion; the predicate is resolved, never a decorative label. */
export function admitStatement<R extends Relation>(relation: R, value: unknown): Result<Readonly<{ id: string; statement: Statement<R> }>, RelationRefusal> {
  if (!relations.has(relation)) return refused("unknown-relation", "relation was not established by defineRelation");
  try {
    const statement = snapshot(value) as Statement<R>;
    if (!statement || typeof statement !== "object" || Array.isArray(statement) || Object.keys(statement).length !== 4 || !["subject", "predicate", "object", "witness"].every(key => Object.hasOwn(statement, key))) return refused("invalid-statement", "statement must have exactly subject, predicate, object, witness");
    if (statement.predicate !== relation.id) return refused("wrong-predicate", "statement predicate does not name the selected relation");
    for (const [position, type] of [["subject", relation.domain], ["object", relation.codomain], ["witness", relation.witness]] as const) {
      const result = admit(type, statement[position]);
      if (!result.ok) return refused("invalid-" + position, result.refusal.issues.map(issue => `${issue.path || "/"} ${issue.message}`).join("; "));
    }
    // EAVT is a representation of these same four positions. Preserve its existing addresses.
    const row = { e: statement.subject, a: statement.predicate, v: statement.object, t: statement.witness };
    return accepted(Object.freeze({ id: identify(row), statement }));
  } catch (error) { return refused("invalid-statement", error instanceof Error ? error.message : String(error)); }
}

/** Admit a complete immutable field. Set union retains differing claims and their witnesses. */
export function createRelationalField(declarations: readonly Relation[], values: readonly unknown[] = []): Result<RelationalField, RelationRefusal> {
  const byId = new Map<string, Relation>();
  for (const relation of declarations) {
    if (!relations.has(relation)) return refused("unknown-relation", "field contains an unestablished relation");
    if (byId.has(relation.id)) return refused("duplicate-relation", `relation ${relation.id} has more than one declaration`);
    byId.set(relation.id, relation);
  }
  const types = collectTypeSystem(declarations.flatMap(relation => [relation.domain, relation.codomain, relation.witness]));
  if (!types.ok) return refused("invalid-field-types", types.refusal.message);
  const order = <T extends { id: string }>(values: T[]): T[] => values.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const document = typeSystemDocument(types.value);
  if (!document.ok) return refused("invalid-field-types", document.refusal.message);
  const catalogIdentity = identify({
    typeSystem: document.value.identity,
    relations: order(declarations.map(relation => ({ id: relation.id, domain: relation.domain.id, codomain: relation.codomain.id, witness: relation.witness.id }))),
  });
  const statements = new Map<string, AddressedStatement>();
  for (const value of values) {
    const predicate = value && typeof value === "object" ? (value as { predicate?: unknown }).predicate : undefined;
    const relation = typeof predicate === "string" ? byId.get(predicate) : undefined;
    if (!relation) return refused("unknown-predicate", "statement predicate is not declared in this field");
    const result = admitStatement(relation, value);
    if (!result.ok) return result;
    statements.set(result.value.id, result.value);
  }
  return accepted(Object.freeze({ catalogIdentity, relations: Object.freeze(order([...byId.values()])), statements: Object.freeze(order([...statements.values()])) }));
}

/** Query all matching assertions. Contradictory objects remain separately addressable. */
export function queryRelationalField(field: RelationalField, predicate: string): readonly AddressedStatement[] {
  return Object.freeze(field.statements.filter(item => item.statement.predicate === predicate));
}

/** Merge replica assertions against one receiving catalog; all bytes are re-admitted. */
export function mergeRelationalFields(declarations: readonly Relation[], ...fields: readonly RelationalField[]): Result<RelationalField, RelationRefusal> {
  const catalog = createRelationalField(declarations);
  if (!catalog.ok) return catalog;
  for (const field of fields) {
    const result = admitRelationalFieldDocument(declarations, relationalFieldDocument(field));
    if (!result.ok) return result;
  }
  return createRelationalField(declarations, fields.flatMap(field => field.statements.map(item => item.statement)));
}

/** The complete portable carrier; executable declarations are resolved at the receiver. */
export function relationalFieldDocument(field: RelationalField): RelationalFieldDocument {
  return Object.freeze({ version: 1, catalogIdentity: field.catalogIdentity, statements: field.statements });
}

/** Validate both the receiving semantic catalog and every advertised content address. */
export function admitRelationalFieldDocument(declarations: readonly Relation[], input: unknown): Result<RelationalField, RelationRefusal> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return refused("invalid-field-document", "field document must be an object");
  const document = input as RelationalFieldDocument;
  if (Object.keys(document).length !== 3 || document.version !== 1 || typeof document.catalogIdentity !== "string" || !Array.isArray(document.statements)) return refused("invalid-field-document", "field document needs version 1, catalogIdentity and statements");
  const empty = createRelationalField(declarations);
  if (!empty.ok) return empty;
  if (document.catalogIdentity !== empty.value.catalogIdentity) return refused("catalog-mismatch", "replicas use different relation or type declarations");
  if (document.statements.some(item => !item || typeof item !== "object" || Object.keys(item).length !== 2 || typeof item.id !== "string" || !Object.hasOwn(item, "statement"))) return refused("invalid-field-document", "field entries need an id and statement");
  const field = createRelationalField(declarations, document.statements.map(item => item.statement));
  if (!field.ok) return field;
  for (const item of document.statements) {
    const relation = declarations.find(relation => relation.id === item.statement.predicate)!;
    const admitted = admitStatement(relation, item.statement);
    if (!admitted.ok) return admitted;
    if (item.id !== admitted.value.id) return refused("statement-identity-mismatch", "statement bytes do not match the advertised identity");
  }
  return field;
}
