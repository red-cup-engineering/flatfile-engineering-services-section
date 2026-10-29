const objectSchema = (properties, required = []) => Object.freeze({
  type: "object",
  properties: Object.freeze(properties),
  required: Object.freeze(required),
  additionalProperties: false,
});

import { namedCellMove } from "./cell-moves.mjs";

const term = Object.freeze({ description: "Any JSON term" });
const cell = objectSchema({ subject: term, predicate: term, object: term }, ["subject", "predicate", "object"]);

export const pamMcpTools = Object.freeze([
  Object.freeze({
    name: "pam_dispatch",
    description: "Admit one reified message of for/against predicate claims into PAM.",
    inputSchema: objectSchema({ sender: term, id: { type: "string" }, claims: { type: "array", minItems: 1, items: { type: "object" } } }, ["sender", "claims"]),
    annotations: Object.freeze({ destructiveHint: false, idempotentHint: true }),
  }),
  Object.freeze({
    name: "pam_query",
    description: "Return PAM read witnesses matching a subject-predicate-object pattern.",
    inputSchema: objectSchema({ subject: term, predicate: term, object: term, reading: { enum: ["absurd", "potential", "active", "stable"] } }),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "pam_reindex_read",
    description: "Read a PAM valuation after precomposition with a named live cell move.",
    inputSchema: objectSchema({
      move: { enum: ["converse", "subject-projection", "object-projection"] },
      cell,
    }, ["move", "cell"]),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_snapshot",
    description: "Project the current PAM replay artifact as a deterministic directed relation/entity graph.",
    inputSchema: objectSchema({}),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_neighbors",
    description: "Return witnessed incoming and outgoing relations for one entity term.",
    inputSchema: objectSchema({ term, direction: { enum: ["incoming", "outgoing", "both"] }, predicate: term }, ["term"]),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
]);

/** Product-facing tools. A transport host can mount these without making PAM the entry point. */
export const drewMcpTools = Object.freeze([
  Object.freeze({
    name: "drew_catalog",
    description: "List registered substrate adapters and currently composed source resources.",
    inputSchema: objectSchema({}),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_relations",
    description: "Query current witnessed relation occurrences by subject, predicate, or object.",
    inputSchema: objectSchema({ subject: term, predicate: term, object: term, limit: { type: "integer", minimum: 1, maximum: 500, default: 100 } }),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_entity",
    description: "Read incoming and outgoing witnessed relations for one entity.",
    inputSchema: objectSchema({ term, limit: { type: "integer", minimum: 1, maximum: 500, default: 100 } }, ["term"]),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_project",
    description: "Project the current web as a snapshot, relations, EAVT, or definition-mediated cells.",
    inputSchema: objectSchema({
      type: { enum: ["snapshot", "relations", "eavt", "definition-mediated-cells", "definition-mediated-index", "definition-mediated-concept"] },
      pattern: { type: "object" },
      name: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 500, default: 100 },
    }, ["type"]),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_explain",
    description: "Explain one relation occurrence from its substrate source and witness.",
    inputSchema: objectSchema({ address: { type: "string" } }, ["address"]),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
  Object.freeze({
    name: "drew_diagnostics",
    description: "Return unresolved, refused, malformed, and other adapter diagnostics without fabricating edges.",
    inputSchema: objectSchema({}),
    annotations: Object.freeze({ readOnlyHint: true, idempotentHint: true }),
  }),
]);

function result(value) {
  return Object.freeze({
    content: Object.freeze([{ type: "text", text: JSON.stringify(value, null, 2) }]),
    structuredContent: value,
  });
}

export function callPamMcpTool(pam, name, args = {}) {
  if (name === "pam_dispatch") return result(pam.dispatch(args));
  if (name === "pam_query") return result(Object.freeze({ kind: "pam.query-witness", readings: pam.query(args) }));
  if (name === "pam_reindex_read") {
    const move = namedCellMove(args.move);
    return result(pam.reindex(move, { name: args.move }).read(args.cell));
  }
  if (name === "drew_snapshot") return result(pam.web.snapshot());
  if (name === "drew_neighbors") {
    return result(pam.neighbors(args.term, { direction: args.direction, predicate: args.predicate }));
  }
  throw new Error(`unknown DREW/PAM MCP tool: ${name}`);
}

export function callDrewMcpTool(app, name, args = {}) {
  if (name === "drew_catalog") {
    const catalog = app.catalog();
    return result(Object.freeze({
      kind: catalog.kind,
      adapters: catalog.adapters,
      resources: Object.freeze(catalog.resources.map((entry) => Object.freeze({
        key: entry.key,
        source: entry.source,
        observationId: entry.observationId,
        relations: entry.relations.length,
        diagnostics: entry.diagnostics.length,
      }))),
    }));
  }
  if (name === "drew_relations") {
    const { limit = 100, ...pattern } = args;
    const relations = app.queryRelations(pattern);
    return result(Object.freeze({ kind: "drew.relation-query", total: relations.length, truncated: relations.length > limit, relations: Object.freeze(relations.slice(0, limit)) }));
  }
  if (name === "drew_entity") {
    const reading = app.entity(args.term);
    const limit = args.limit ?? 100;
    return result(Object.freeze({
      ...reading,
      incomingTotal: reading.incoming.length,
      outgoingTotal: reading.outgoing.length,
      truncated: reading.incoming.length > limit || reading.outgoing.length > limit,
      incoming: Object.freeze(reading.incoming.slice(0, limit)),
      outgoing: Object.freeze(reading.outgoing.slice(0, limit)),
    }));
  }
  if (name === "drew_project") {
    const { limit = 100, ...spec } = args;
    const projection = app.project(spec);
    if (!Array.isArray(projection)) return result(projection);
    return result(Object.freeze({ kind: "drew.projection", type: spec.type, total: projection.length, truncated: projection.length > limit, values: Object.freeze(projection.slice(0, limit)) }));
  }
  if (name === "drew_explain") return result(app.explain(args.address));
  if (name === "drew_diagnostics") return result(Object.freeze({ kind: "drew.diagnostics", diagnostics: app.diagnostics() }));
  throw new Error(`unknown DREW MCP tool: ${name}`);
}
