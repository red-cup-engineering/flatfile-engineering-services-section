/** A small, total EAVT engine. Values are JSON; rows are immutable facts. */
import { canonicalJson } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/json.mjs";
import { decodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { eavtRow } from "./row.mjs";
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const key = (value) => canonicalJson(value);
const compare = (left, right) => key(left).localeCompare(key(right));
export function row(value) {
    return eavtRow(value);
}
/** Canonical JSON is the interchange carrier: one row, one line, one reversible transform. */
export const encode = (value) => key(row(value));
export function decode(line) {
    try {
        const fact = row(JSON.parse(line));
        if (line !== encode(fact))
            throw new TypeError("EAVT line is not canonical");
        return fact;
    }
    catch {
        try {
            return row(decodeCanonical(Buffer.from(line, "base64")));
        }
        catch {
            throw new TypeError("EAVT line is not a canonical JSON or CBOR row");
        }
    }
}
export const identify = (value) => encode(value);
export const unique = (values) => [...new Map(values.map((value) => { const fact = row(value); return [identify(fact), fact]; })).values()];
export const entities = (values) => unique(values).reduce((found, fact) => found.some((entity) => key(entity) === key(fact.e)) ? found : [...found, fact.e], []);
/** Retain multivalued facts after their latest strictly later cell retraction. */
export function current(values) {
    const facts = unique(values);
    const tombstones = new Map();
    const cellKey = (fact) => key([fact.e, fact.a]);
    const later = (left, right) => typeof left === "number" && typeof right === "number" ? left > right : typeof left === "string" && typeof right === "string" ? left > right : false;
    for (const fact of facts)
        if (fact.v === null) {
            const cell = cellKey(fact);
            const prior = tombstones.get(cell);
            if (prior === undefined || later(fact.t, prior))
                tombstones.set(cell, fact.t);
        }
    return facts.filter((fact) => { const tombstone = tombstones.get(cellKey(fact)); return fact.v !== null && (tombstone === undefined || !later(tombstone, fact.t)); });
}
/** Pure latest-value lens; only attributes named by the caller are single-valued. */
export function latest(values, attributes) {
    const functional = new Set(attributes.map(key));
    const facts = unique(values);
    const maximum = new Map();
    for (const fact of facts)
        if (functional.has(key(fact.a))) {
            const cell = `${key(fact.e)}\u0000${key(fact.a)}`;
            const prior = maximum.get(cell);
            if (!prior || compare(fact.t, prior.t) >= 0)
                maximum.set(cell, fact);
        }
    return facts.filter((fact) => !functional.has(key(fact.a)) || maximum.get(`${key(fact.e)}\u0000${key(fact.a)}`) === fact);
}
export const relations = (values, attribute, value) => unique(values).filter((fact) => key(fact.a) === key(attribute) && (value === undefined || key(fact.v) === key(value)));
/** A null value retracts its entity/attribute cell; all other rows affirm it. */
export function settle(values, entity) {
    const facts = unique(values).filter((fact) => key(fact.e) === key(entity));
    const positive = facts.filter((fact) => fact.v !== null);
    const denied = facts.filter((fact) => fact.v === null).map(({ e, a }) => ({ e, a, v: null }));
    const deniedKeys = new Set(denied.map(({ e, a }) => `${key(e)}\u0000${key(a)}`));
    const affirmed = positive.map(({ e, a, v }) => ({ e, a, v }));
    return Object.freeze({ entity, affirmed, denied, contradicted: affirmed.filter(({ e, a }) => deniedKeys.has(`${key(e)}\u0000${key(a)}`)) });
}
export function consent(values, audience) {
    const facts = unique(values);
    const choices = latest(facts.filter((fact) => fact.a === "consent"), ["consent"]);
    const admitted = new Set(choices.filter((fact) => fact.v === "public" || (Array.isArray(fact.v) && fact.v.includes(audience))).map((fact) => key(fact.e)));
    const rows = facts.filter((fact) => admitted.has(key(fact.e)));
    return Object.freeze({ rows, withheld: facts.length - rows.length });
}
export function constitute(kind, attributes, t) {
    if (!/^[^:]+$/.test(kind) || !isRecord(attributes))
        throw new TypeError("kind must be a nonempty noun and attributes a JSON object");
    const address = `${kind}:${Buffer.from(encode({ e: null, a: "constituted", v: attributes, t })).toString("base64url")}`;
    return Object.freeze({ address, genesis: row({ e: address, a: "constituted", v: attributes, t }) });
}
export function relationNerve(values, attribute) {
    const edges = relations(values, attribute);
    const parent = new Map();
    const find = (node) => { const root = parent.get(node) ?? node; if (root === node) {
        parent.set(node, node);
        return node;
    } const result = find(root); parent.set(node, result); return result; };
    for (const fact of edges) {
        const a = find(`e:${key(fact.e)}`);
        const b = find(`v:${key(fact.v)}`);
        if (a !== b)
            parent.set(a, b);
    }
    const components = new Set([...parent.keys()].map(find)).size;
    return Object.freeze({ vertices: parent.size, edges: edges.length, components, cycles: edges.length - parent.size + components });
}
export function execute(request, store) {
    switch (request.operation) {
        case "validate": return row(request.row);
        case "encode": return { line: encode(request.row) };
        case "decode": return decode(request.line);
        case "read": return store.read(request.path).filter(Boolean).flatMap((line) => { try {
            return [decode(line)];
        }
        catch {
            return [];
        } });
        case "append": {
            const line = encode(request.row);
            store.append(request.path, line);
            return { path: request.path, line };
        }
        case "entities": return entities(request.rows);
        case "current": return current(request.rows);
        case "latest": return latest(request.rows, request.attributes);
        case "relations": return relations(request.rows, request.attribute, request.value);
        case "constitute": return constitute(request.kind, request.attributes, request.t);
        case "settle": return settle(request.rows, request.entity);
        case "filter-consent": return consent(request.rows, request.audience);
        case "relation-nerve": return relationNerve(request.rows, request.attribute);
    }
}
