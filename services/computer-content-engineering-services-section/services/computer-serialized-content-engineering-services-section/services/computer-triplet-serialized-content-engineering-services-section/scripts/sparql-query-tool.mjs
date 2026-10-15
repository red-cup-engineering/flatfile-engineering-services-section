/**
 * The `sparql_query` tool definition: one SPARQL 1.1 query run against an endpoint through this section's own
 * W3C SPARQL Protocol client (`sparql-http-client`). The definition has the shape an MCP server takes
 * (`{name, description, inputSchema, handler}`) and imports no MCP code, so the MCP section serves it.
 * Only the query operation is reachable; the endpoint the Group serves is read-only.
 */
import { sparqlProtocol } from "./sparql-http-client.mjs";

/** Rows of a SELECT result as plain objects of variable to value. */
export function sparqlRows(result) {
  return result.results.bindings.map((binding) => Object.fromEntries(Object.entries(binding).map(([name, term]) => [name, term.value])));
}

export function sparqlQueryTool({ endpoint, fetchImpl }) {
  return Object.freeze({
    name: "sparql_query",
    description: "Run one SPARQL 1.1 query against the Group's ontology (the SKOS glossary: skos:prefLabel, skos:altLabel, skos:definition, skos:inScheme, schema:termCode). SELECT returns rows; ASK returns a boolean.",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 1 } }, additionalProperties: false },
    handler: async ({ query }) => {
      const result = await (await sparqlProtocol(endpoint, query, { fetchImpl })).json();
      return "boolean" in result ? { boolean: result.boolean } : { variables: result.head.vars, rows: sparqlRows(result) };
    },
  });
}
