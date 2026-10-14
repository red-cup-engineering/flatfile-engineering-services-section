/**
 * W3C SPARQL 1.1 Query/Update and Graph Store HTTP client.
 *
 * This is a transport over an established RDF service, not a new SPARQL
 * evaluator, triplestore, assertion authority or hidden EAVT mirror.
 * https://www.w3.org/TR/sparql11-protocol/
 * https://www.w3.org/TR/sparql11-http-rdf-update/
 */
const readString = (value, role) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(role + " must be nonempty text");
  return value;
};

function serviceUrl(value) {
  const url = new URL(readString(value, "service endpoint"));
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new TypeError("SPARQL endpoint requires HTTP(S) without URL credentials or fragment");
  }
  return url;
}

function graphIri(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value) ||
      /[\x00-\x20<>"{}|^\\]/u.test(value)) {
    throw new TypeError("graph must be an absolute RDF graph IRI");
  }
  return value;
}

function fetcher(value) {
  const fn = value ?? globalThis.fetch;
  if (typeof fn !== "function") throw new TypeError("an HTTP fetch provider is required");
  return fn;
}

async function perform(url, options, fetchImpl) {
  const response = await fetcher(fetchImpl)(url.href, { redirect: "error", ...options });
  if (!response || typeof response.status !== "number" || typeof response.ok !== "boolean") {
    throw new TypeError("SPARQL service returned no HTTP response");
  }
  if (!response.ok) {
    const error = new Error("RDF service returned HTTP " + response.status);
    error.name = "RdfServiceHttpError";
    error.status = response.status;
    throw error;
  }
  return response;
}

function graphSelection(url, { defaultGraphs = [], namedGraphs = [], operation = "query" } = {}) {
  const names = operation === "update"
    ? ["using-graph-uri", "using-named-graph-uri"]
    : ["default-graph-uri", "named-graph-uri"];
  for (const [name, values] of [[names[0], defaultGraphs], [names[1], namedGraphs]]) {
    if (!Array.isArray(values)) throw new TypeError(name + " must be an array");
    for (const iri of values) url.searchParams.append(name, graphIri(iri) ?? (() => {
      throw new TypeError(name + " must contain graph IRIs");
    })());
  }
}

/** Execute a query or update against an existing W3C SPARQL Protocol service.
 * Query: GET ?query=... or POST application/sparql-query.
 * Update: POST application/sparql-update. No GET updates are admitted.
 * Returns the unmodified HTTP Response, allowing standard result formats.
 * The installed service—not this client—authorizes and performs updates.
 */
export async function sparqlProtocol(endpoint, text, {
  operation = "query", method = "POST", accept = "application/sparql-results+json",
  defaultGraphs = [], namedGraphs = [], fetchImpl, headers = {},
} = {}) {
  readString(text, "SPARQL request");
  if (!["query", "update"].includes(operation) ||
      !["GET", "POST"].includes(method) || (operation === "update" && method !== "POST")) {
    throw new TypeError("SPARQL updates require POST; queries require GET or POST");
  }
  if (typeof accept !== "string" || !accept.trim() || headers === null ||
      typeof headers !== "object" || Array.isArray(headers)) {
    throw new TypeError("invalid SPARQL headers or content negotiation");
  }
  const url = serviceUrl(endpoint);
  graphSelection(url, {defaultGraphs, namedGraphs, operation});
  const outgoing = new Headers(headers);
  outgoing.set("accept", accept);
  const options = {method, headers: outgoing};
  if (method === "GET") {
    url.searchParams.set("query", text);
  } else {
    outgoing.set("content-type", operation === "update" ? "application/sparql-update" : "application/sparql-query");
    options.body = text;
  }
  return perform(url, options, fetchImpl);
}

/** SPARQL 1.1 Graph Store HTTP Protocol operation, addressing the default
 * graph with ?default or one named graph with ?graph=<iri>. Supports RDF
 * representations supplied and received by the standard service, not an
 * invented JSON record graph or an unqualified caller string.
 */
export async function graphStoreProtocol(endpoint, {
  graph = null, method = "GET", body, contentType = "text/turtle",
  accept = "text/turtle", fetchImpl, headers = {},
} = {}) {
  if (!["GET", "PUT", "POST", "DELETE"].includes(method)) {
    throw new TypeError("graph-store HTTP method must be GET, PUT, POST or DELETE");
  }
  const iri = graphIri(graph);
  const url = serviceUrl(endpoint);
  const selection = iri === null ? "default" : "graph=" + encodeURIComponent(iri);
  url.search += (url.search ? "&" : "?") + selection;
  const outgoing = new Headers(headers);
  const options = {method, headers: outgoing};
  if (method === "GET") {
    if (body !== undefined) throw new TypeError("graph-store GET may not carry a body");
    outgoing.set("accept", readString(accept, "RDF accept media type"));
  } else if (method === "DELETE") {
    if (body !== undefined) throw new TypeError("graph-store DELETE may not carry a body");
  } else {
    if (!(typeof body === "string" || body instanceof Uint8Array) || body.length === 0) {
      throw new TypeError("graph-store PUT/POST requires an RDF representation");
    }
    if (!["text/turtle", "application/ld+json", "application/n-triples", "application/rdf+xml"].includes(contentType)) {
      throw new TypeError("graph-store writes require a declared RDF media type");
    }
    outgoing.set("content-type", contentType);
    options.body = body;
  }
  return perform(url, options, fetchImpl);
}
