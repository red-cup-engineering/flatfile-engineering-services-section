import { compileJsonSchema, } from "@red-cup-engineering/json-schema-services-section/validation";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
const compiledSchemas = new WeakMap();
function dataRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.isFrozen(value))
        return false;
    return Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) => "value" in descriptor);
}
/** A portable declaration projection. It refuses accessor-backed or mutable lookalikes. */
function declarationContent(type, seen = new Set()) {
    if (!dataRecord(type) || seen.has(type))
        return undefined;
    const { id, name, description, schema, references, parents } = type;
    if (typeof id !== "string" || typeof name !== "string" || typeof description !== "string"
        || !Array.isArray(references) || !Array.isArray(parents) || !Object.isFrozen(references) || !Object.isFrozen(parents))
        return undefined;
    const next = new Set(seen);
    next.add(type);
    const parentContents = [];
    for (const parent of parents) {
        const content = declarationContent(parent, next);
        if (content === undefined)
            return undefined;
        parentContents.push(content);
    }
    try {
        return Object.freeze({ id, name, description, schema, references: [...references].sort((a, b) => semanticId(a).localeCompare(semanticId(b))), parents: parentContents.sort((a, b) => semanticId(a).localeCompare(semanticId(b))) });
    }
    catch {
        return undefined;
    }
}
/** Content identity of one locally established data-type declaration. */
export function typeIdentity(type) {
    if (!compiledSchemas.has(type))
        throw new TypeError("typeIdentity requires a declaration established by defineType");
    const content = declarationContent(type);
    if (content === undefined)
        throw new TypeError("typeIdentity requires an immutable data-type declaration");
    return semanticId(content);
}
/** Whether two immutable declarations have the same portable content, including their parent closure. */
export function sameType(left, right) {
    const leftContent = declarationContent(left);
    const rightContent = declarationContent(right);
    return leftContent !== undefined && rightContent !== undefined && semanticId(leftContent) === semanticId(rightContent);
}
/** Use a local compiled declaration when present, or rebuild an equivalent foreign declaration's pure validator. */
function compiledFor(type) {
    if (!dataRecord(type) || !Object.hasOwn(type, "schema") || !Object.hasOwn(type, "references"))
        return undefined;
    const cached = compiledSchemas.get(type);
    if (cached !== undefined)
        return cached;
    const references = type.references;
    if (!Array.isArray(references) || !Object.isFrozen(references))
        return undefined;
    const compiled = compileJsonSchema(type.schema, { references: references });
    return compiled.validate(undefined).issues.some((issue) => issue.kind === "schema") ? undefined : compiled;
}
function freeze(value) {
    return Object.freeze(value);
}
function immutableCopy(value) {
    if (Array.isArray(value))
        return freeze(value.map(immutableCopy));
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value)
            .map(([key, entry]) => [key, immutableCopy(entry)]);
        return freeze(Object.fromEntries(entries));
    }
    return value;
}
function definitionRefusal(kind, message, issues = []) {
    return freeze({ ok: false, refusal: freeze({ kind, message, issues: freeze([...issues]) }) });
}
function validDefinition(definition) {
    if (definition.id.trim() === "")
        return "type id must be non-empty";
    if (definition.name.trim() === "")
        return "type name must be non-empty";
    if (definition.description.trim() === "")
        return "type description must be non-empty";
    if (definition.parents.some(parent => compiledFor(parent) === undefined))
        return "parents must be established type declarations";
    const ids = definition.parents.map((parent) => parent.id);
    if (ids.includes(definition.id))
        return "a type cannot specialize its own identifier";
    if (new Set(ids).size !== ids.length)
        return "a type may name each parent once";
    return undefined;
}
/**
 * Declare an immutable type without changing its schema or adding defaults.
 * Invalid JSON Schema documents are refused at this boundary.
 */
export function defineType(definition) {
    const malformed = validDefinition(definition);
    if (malformed !== undefined)
        return definitionRefusal("invalid-definition", malformed);
    const copiedSchema = immutableCopy(definition.schema);
    const references = immutableCopy(definition.references ?? []);
    const compiled = compileJsonSchema(copiedSchema, { references });
    const schemaCheck = compiled.validate(undefined);
    const schemaIssues = schemaCheck.issues.filter((issue) => issue.kind === "schema");
    if (schemaIssues.length > 0)
        return definitionRefusal("invalid-schema", "type schema is not a valid supported JSON Schema document", schemaIssues);
    const parents = freeze([...definition.parents]);
    const type = freeze({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        schema: copiedSchema,
        references,
        parentIds: freeze(parents.map((parent) => parent.id)),
        parents,
    });
    compiledSchemas.set(type, compiled);
    return freeze({
        ok: true,
        value: type,
    });
}
/** Declare a type whose extent is the intersection of its parent types and local schema. */
export function specializeType(parents, definition) {
    return defineType({ ...definition, parents });
}
function refused(typeId, issues) {
    return freeze({ ok: false, refusal: freeze({ kind: "not-admitted", typeId, issues: freeze([...issues]) }) });
}
/**
 * Admit a value through a standalone declaration and all of its parent declarations.
 * Declarations are immutable; admitted values are returned unchanged and are not frozen.
 */
export function admit(type, value) {
    const compiled = compiledFor(type);
    if (compiled === undefined)
        return refused(type.id, [freeze({ kind: "schema", path: "", keyword: "declaration", message: "type was not established by defineType" })]);
    for (const parent of type.parents) {
        const parentResult = admit(parent, value);
        if (!parentResult.ok)
            return parentResult;
    }
    const result = compiled.validate(value);
    return result.valid ? freeze({ ok: true, value: value }) : refused(type.id, result.issues);
}
/** Instantiate a type from an already-supplied value; no coercion, defaulting, copying, or freezing occurs. */
export const instantiate = admit;
function asTypeMap(types) {
    return new Map(types.map((type) => [type.id, type]));
}
function validateCatalog(types) {
    const byId = asTypeMap(types);
    if (byId.size !== types.length) {
        const duplicate = types.find((type, index) => types.findIndex((candidate) => candidate.id === type.id) !== index);
        return freeze({ kind: "duplicate-type", typeId: duplicate.id, message: `type ${duplicate.id} already exists` });
    }
    for (const type of types) {
        if (compiledFor(type) === undefined) {
            return freeze({ kind: "invalid-type", typeId: type.id, message: "type was not established by defineType" });
        }
        const valid = validDefinition(type);
        if (valid !== undefined)
            return freeze({ kind: "invalid-type", typeId: type.id, message: valid });
        if (type.parentIds.length !== type.parents.length || type.parentIds.some((parentId, index) => parentId !== type.parents[index]?.id)) {
            return freeze({ kind: "invalid-type", typeId: type.id, message: "parent identifiers do not match parent declarations" });
        }
        for (const parentId of type.parentIds) {
            if (!byId.has(parentId))
                return freeze({ kind: "dangling-parent", typeId: type.id, message: `parent ${parentId} is not in this type system` });
            if (!sameType(byId.get(parentId), type.parents.find((parent) => parent.id === parentId))) {
                return freeze({ kind: "invalid-type", typeId: type.id, message: `parent ${parentId} is not this catalog's declaration` });
            }
        }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id))
            return id;
        if (visited.has(id))
            return undefined;
        visiting.add(id);
        const type = byId.get(id);
        for (const parentId of type.parentIds) {
            const cycle = visit(parentId);
            if (cycle !== undefined)
                return cycle;
        }
        visiting.delete(id);
        visited.add(id);
        return undefined;
    };
    for (const type of types) {
        const cycle = visit(type.id);
        if (cycle !== undefined)
            return freeze({ kind: "cyclic-parent", typeId: cycle, message: `parent relation for ${cycle} is cyclic` });
    }
    return undefined;
}
/** Construct a catalog only when every parent edge resolves and forms a DAG. */
export function createTypeSystem(types = []) {
    const normalized = [];
    for (const type of types) {
        const prior = normalized.find((candidate) => candidate.id === type.id);
        if (prior === undefined)
            normalized.push(type);
        else if (!sameType(prior, type))
            return freeze({ ok: false, refusal: freeze({ kind: "duplicate-type", typeId: type.id, message: `type ${type.id} already exists` }) });
    }
    const copied = freeze(normalized);
    const refusal = validateCatalog(copied);
    return refusal === undefined ? freeze({ ok: true, value: freeze({ types: copied }) }) : freeze({ ok: false, refusal });
}
/** Resolve the complete declaration closure of roots, rejecting conflicting identities. */
export function collectTypeSystem(roots) {
    const seen = new Set();
    const pending = [...roots];
    while (pending.length > 0) {
        const current = pending.pop();
        if (!current || compiledFor(current) === undefined) {
            return freeze({ ok: false, refusal: freeze({ kind: "invalid-type", typeId: current?.id ?? "", message: "type was not established by defineType" }) });
        }
        if (seen.has(current))
            continue;
        seen.add(current);
        pending.push(...current.parents);
    }
    return createTypeSystem([...seen]);
}
/** Declared specialization, using established declarations rather than equal labels. */
export function isSubtypeOf(type, parent) {
    const pending = [type];
    const seen = new Set();
    while (pending.length > 0) {
        const current = pending.pop();
        if (sameType(current, parent))
            return true;
        if (seen.has(current))
            continue;
        seen.add(current);
        pending.push(...current.parents);
    }
    return false;
}
/** Look up one catalogued type. */
export function getType(system, typeId) {
    return system.types.find((type) => type.id === typeId);
}
/** Add a new type while preserving a valid, acyclic parent graph. */
export function addType(system, type) {
    if (getType(system, type.id) !== undefined)
        return freeze({ ok: false, refusal: freeze({ kind: "duplicate-type", typeId: type.id, message: `type ${type.id} already exists` }) });
    return createTypeSystem([...system.types, type]);
}
function childIds(system, typeId) {
    return system.types.filter((type) => type.parentIds.includes(typeId)).map((type) => type.id);
}
/** Replace a leaf declaration. Replacing a base is refused so children never retain stale parent snapshots. */
export function replaceType(system, type) {
    if (getType(system, type.id) === undefined)
        return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId: type.id, message: `type ${type.id} is not in this type system` }) });
    if (childIds(system, type.id).length > 0)
        return freeze({ ok: false, refusal: freeze({ kind: "referenced-type", typeId: type.id, message: `type ${type.id} has children and cannot be replaced independently` }) });
    return createTypeSystem(system.types.map((candidate) => candidate.id === type.id ? type : candidate));
}
/** Remove a leaf declaration. Removing a base is refused so no dangling references remain. */
export function removeType(system, typeId) {
    if (getType(system, typeId) === undefined)
        return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId, message: `type ${typeId} is not in this type system` }) });
    if (childIds(system, typeId).length > 0)
        return freeze({ ok: false, refusal: freeze({ kind: "referenced-type", typeId, message: `type ${typeId} has children and cannot be removed` }) });
    return createTypeSystem(system.types.filter((type) => type.id !== typeId));
}
/** Admit a value through the current catalog graph, resolving parents by their live identifiers. */
export function admitFromSystem(system, typeId, value) {
    const type = getType(system, typeId);
    if (type === undefined)
        return freeze({ ok: false, refusal: freeze({ kind: "unknown-type", typeId }) });
    const visit = (current) => {
        for (const parentId of current.parentIds) {
            const parent = getType(system, parentId);
            if (parent === undefined)
                return refused(current.id, []);
            const admitted = visit(parent);
            if (!admitted.ok)
                return admitted;
        }
        const compiled = compiledFor(current);
        if (compiled === undefined)
            return refused(current.id, [freeze({ kind: "schema", path: "", keyword: "declaration", message: "type was not established by defineType" })]);
        const result = compiled.validate(value);
        return result.valid ? freeze({ ok: true, value }) : refused(current.id, result.issues);
    };
    return visit(type);
}
/** Return parent and child edges in catalog order for inspection and presentation. */
export function inspectTypeRelations(system) {
    return freeze(system.types.map((type) => freeze({
        typeId: type.id,
        parentIds: freeze([...type.parentIds]),
        childIds: freeze([...childIds(system, type.id)]),
    })));
}
