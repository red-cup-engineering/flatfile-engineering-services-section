import { admit, collectTypeSystem } from "./type-system.mjs";
import { typeSystemDocument } from "./document.mjs";
import { canonicalCborToNiUri, encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { coincidenceKey } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const relations = new WeakSet();
const fields = new WeakSet();
const queryIndexes = new WeakMap();
const identify = (value) => canonicalCborToNiUri(encodeCanonical(value));
/** Copy a portable value without retaining mutable caller-owned data. */
function snapshot(value, ancestors = new Set()) {
    if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))
        return value;
    if (typeof value !== "object" || ancestors.has(value))
        throw new TypeError("statement positions must be acyclic JSON values");
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
        throw new TypeError("statement positions must be plain data");
    ancestors.add(value);
    const result = Array.isArray(value) ? value.map(item => snapshot(item, ancestors)) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)]));
    ancestors.delete(value);
    return Object.freeze(result);
}
/** Establish one predicate over the common type system, including all inherited constraints. */
export function defineRelation(definition) {
    if (!definition || typeof definition.id !== "string" || definition.id.trim() === "")
        return refused("invalid-relation", "relation id must be nonempty");
    const types = collectTypeSystem([definition.domain, definition.codomain, definition.witness]);
    if (!types.ok)
        return refused("invalid-relation-types", types.refusal.message);
    const relation = Object.freeze({ id: definition.id, domain: definition.domain, codomain: definition.codomain, witness: definition.witness });
    relations.add(relation);
    return accepted(relation);
}
/** Admit an actual typed assertion; the predicate is resolved, never a decorative label. */
export function admitStatement(relation, value) {
    if (!relations.has(relation))
        return refused("unknown-relation", "relation was not established by defineRelation");
    try {
        const statement = snapshot(value);
        if (!statement || typeof statement !== "object" || Array.isArray(statement) || Object.keys(statement).length !== 4 || !["subject", "predicate", "object", "witness"].every(key => Object.hasOwn(statement, key)))
            return refused("invalid-statement", "statement must have exactly subject, predicate, object, witness");
        if (statement.predicate !== relation.id)
            return refused("wrong-predicate", "statement predicate does not name the selected relation");
        for (const [position, type] of [["subject", relation.domain], ["object", relation.codomain], ["witness", relation.witness]]) {
            const result = admit(type, statement[position]);
            if (!result.ok)
                return refused("invalid-" + position, result.refusal.issues.map(issue => `${issue.path || "/"} ${issue.message}`).join("; "));
        }
        // EAVT is a representation of these same four positions. Preserve its existing addresses.
        const row = { e: statement.subject, a: statement.predicate, v: statement.object, t: statement.witness };
        return accepted(Object.freeze({ id: identify(row), statement }));
    }
    catch (error) {
        return refused("invalid-statement", error instanceof Error ? error.message : String(error));
    }
}
/** Admit a complete immutable field. Set union retains differing claims and their witnesses. */
export function createRelationalField(declarations, values = []) {
    const byId = new Map();
    for (const relation of declarations) {
        if (!relations.has(relation))
            return refused("unknown-relation", "field contains an unestablished relation");
        if (byId.has(relation.id))
            return refused("duplicate-relation", `relation ${relation.id} has more than one declaration`);
        byId.set(relation.id, relation);
    }
    const types = collectTypeSystem(declarations.flatMap(relation => [relation.domain, relation.codomain, relation.witness]));
    if (!types.ok)
        return refused("invalid-field-types", types.refusal.message);
    const order = (values) => values.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const document = typeSystemDocument(types.value);
    if (!document.ok)
        return refused("invalid-field-types", document.refusal.message);
    const catalogIdentity = identify({
        typeSystem: document.value.identity,
        relations: order(declarations.map(relation => ({ id: relation.id, domain: relation.domain.id, codomain: relation.codomain.id, witness: relation.witness.id }))),
    });
    const statements = new Map();
    for (const value of values) {
        const predicate = value && typeof value === "object" ? value.predicate : undefined;
        const relation = typeof predicate === "string" ? byId.get(predicate) : undefined;
        if (!relation)
            return refused("unknown-predicate", "statement predicate is not declared in this field");
        const result = admitStatement(relation, value);
        if (!result.ok)
            return result;
        statements.set(result.value.id, result.value);
    }
    const field = Object.freeze({ catalogIdentity, relations: Object.freeze(order([...byId.values()])), statements: Object.freeze(order([...statements.values()])) });
    fields.add(field);
    return accepted(field);
}
const positions = ["subject", "predicate", "object", "witness"];
// Predicate names select an established relation exactly. The other positions
// are opaque marks: only the shared SCA coincidence reads their contents.
const positionKey = (position, value) => position === "predicate" ? value : coincidenceKey(value);
function queryIndex(field, position) {
    const indexes = queryIndexes.get(field) ?? new Map();
    const prior = indexes.get(position);
    if (prior !== undefined) return prior;
    const index = new Map();
    for (const item of field.statements) {
        const key = positionKey(position, item.statement[position]);
        const bucket = index.get(key) ?? [];
        bucket.push(item); index.set(key, bucket);
    }
    for (const bucket of index.values()) Object.freeze(bucket);
    // Only owned, immutable fields may retain an index. A decoded or caller-
    // mutable presentation is read again, never cached as an admitted field.
    if (fields.has(field)) { indexes.set(position, index); queryIndexes.set(field, indexes); }
    return index;
}
/** Query a predicate name, or a pattern over any of the four statement positions.
 * Omitted pattern positions are wildcards; explicit null is a mark and undefined
 * is refused. Every matching assertion and witness remains in field address order.
 * This is a read projection of the existing field, independent of document paths,
 * labels or payload interpretation; statement identities and catalogs are unchanged.
 */
export function queryRelationalField(field, pattern) {
    if (typeof pattern === "string") pattern = { predicate: pattern };
    const query = snapshot(pattern);
    if (!query || typeof query !== "object" || Array.isArray(query) || Object.keys(query).some(position => !positions.includes(position)))
        throw new TypeError("field query must be a predicate name or a subject/predicate/object/witness pattern");
    if (Object.hasOwn(query, "predicate") && typeof query.predicate !== "string")
        throw new TypeError("field query predicate must be a relation name");
    const entries = Object.entries(query);
    if (entries.length === 0) return Object.freeze([...field.statements]);
    const buckets = entries.map(([position, value]) => queryIndex(field, position).get(positionKey(position, value)) ?? []);
    buckets.sort((left, right) => left.length - right.length);
    const [candidates, ...rest] = buckets;
    const memberships = rest.map(bucket => new Set(bucket));
    return Object.freeze(candidates.filter(item => memberships.every(members => members.has(item))));
}
/** Merge replica assertions against one receiving catalog; all bytes are re-admitted. */
export function mergeRelationalFields(declarations, ...fields) {
    const catalog = createRelationalField(declarations);
    if (!catalog.ok)
        return catalog;
    for (const field of fields) {
        const result = admitRelationalFieldDocument(declarations, relationalFieldDocument(field));
        if (!result.ok)
            return result;
    }
    return createRelationalField(declarations, fields.flatMap(field => field.statements.map(item => item.statement)));
}
/** The complete portable carrier; executable declarations are resolved at the receiver. */
export function relationalFieldDocument(field) {
    return Object.freeze({ version: 1, catalogIdentity: field.catalogIdentity, statements: field.statements });
}
/** Validate both the receiving semantic catalog and every advertised content address. */
export function admitRelationalFieldDocument(declarations, input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return refused("invalid-field-document", "field document must be an object");
    const document = input;
    if (Object.keys(document).length !== 3 || document.version !== 1 || typeof document.catalogIdentity !== "string" || !Array.isArray(document.statements))
        return refused("invalid-field-document", "field document needs version 1, catalogIdentity and statements");
    const empty = createRelationalField(declarations);
    if (!empty.ok)
        return empty;
    if (document.catalogIdentity !== empty.value.catalogIdentity)
        return refused("catalog-mismatch", "replicas use different relation or type declarations");
    if (document.statements.some(item => !item || typeof item !== "object" || Object.keys(item).length !== 2 || typeof item.id !== "string" || !Object.hasOwn(item, "statement")))
        return refused("invalid-field-document", "field entries need an id and statement");
    const field = createRelationalField(declarations, document.statements.map(item => item.statement));
    if (!field.ok)
        return field;
    for (const item of document.statements) {
        const relation = declarations.find(relation => relation.id === item.statement.predicate);
        const admitted = admitStatement(relation, item.statement);
        if (!admitted.ok)
            return admitted;
        if (item.id !== admitted.value.id)
            return refused("statement-identity-mismatch", "statement bytes do not match the advertised identity");
    }
    return field;
}

