import rdfCanonize from "rdf-canonize";

import { canonical } from "../../../../../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { EMPTY_WITNESS_ROOT, identifyBytesSemanticContent, identifyNormalizedSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";
import { isNiUri as isCanonicalSha256NiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import { asSeavt, readSeavt } from "@red-cup-engineering/eavt/row";

const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";
const WITNESS_TIME = "urn:emsenn:witness-journal:time";

function refuse(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function iri(value) {
  if (!isCanonicalSha256NiUri(value)) {
    refuse("invalid-witness-graph", "SEAVT RDF projection graph must be a canonical SHA-256 ni URI");
  }
  return `<${value}>`;
}

function jsonLiteral(value) {
  return `${JSON.stringify(canonical(value))}^^<${RDF_JSON}>`;
}

function coordinateToken(term) {
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    refuse("invalid-witness-graph", "SEAVT RDF projection requires typed RMN coordinates");
  }
  return identifyNormalizedSemanticContent({
    objectKind: "witness-journal.seavt.rdf-coordinate",
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

/**
 * Project one direct-RMN SEAVT row under an already-addressed graph/apex.
 *
 * The predication uses derived content commitments of E/A/V as RDF IRIs. The
 * direct typed RMN coordinates remain in `source`; no source row stores an
 * SRN or an opaque coordinate token. T is emitted as canonical RDF JSON.
 */
export async function projectSeavtRdf(row, { graph } = {}) {
  const sourceRow = asSeavt(row);
  const source = readSeavt(sourceRow);
  const coordinateTokens = Object.freeze({
    e: coordinateToken(source.e),
    a: coordinateToken(source.a),
    v: coordinateToken(source.v),
  });
  const graphIri = iri(graph);
  const statements = [
    `${iri(coordinateTokens.e)} ${iri(coordinateTokens.a)} ${iri(coordinateTokens.v)} ${graphIri} .`,
    `${graphIri} <${WITNESS_TIME}> ${jsonLiteral(source.t)} ${graphIri} .`,
  ];
  const nquads = `${statements.join("\n")}\n`;
  const canonicalNQuads = await rdfCanonize.canonize(nquads, {
    algorithm: "RDFC-1.0",
    inputFormat: "application/n-quads",
    format: "application/n-quads",
  });
  const bytes = Buffer.from(canonicalNQuads, "utf8");
  const token = identifyBytesSemanticContent({ objectKind: "witness-journal.rdf-projection", bytes, mediaType: "application/n-quads", witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return Object.freeze({
    graph,
    token,
    mediaType: "application/n-quads",
    bytes,
    canonicalNQuads,
    statementCount: 2,
    source,
    coordinateTokens,
  });
}

/**
 * Verify the whole receiver-facing relation: direct RMN source coordinates,
 * prior graph apex, canonical bytes, and derived output tokens must reproduce
 * one another exactly. No token is decoded.
 */
export async function verifySeavtRdfProjection(projection) {
  try {
    if (
      projection === null
      || typeof projection !== "object"
      || projection.mediaType !== "application/n-quads"
      || !(projection.bytes instanceof Uint8Array)
      || typeof projection.canonicalNQuads !== "string"
      || !Buffer.from(projection.bytes).equals(Buffer.from(projection.canonicalNQuads, "utf8"))
      || identifyBytesSemanticContent({ objectKind: "witness-journal.rdf-projection", bytes: projection.bytes, mediaType: "application/n-quads", witnessRoot: EMPTY_WITNESS_ROOT }).token !== projection.token
    ) return false;
    const row = {
      e: projection.source.e,
      a: projection.source.a,
      v: projection.source.v,
      t: projection.source.t,
    };
    const expected = await projectSeavtRdf(row, { graph: projection.graph });
    return expected.token === projection.token
      && expected.canonicalNQuads === projection.canonicalNQuads
      && expected.coordinateTokens.e === projection.coordinateTokens.e
      && expected.coordinateTokens.a === projection.coordinateTokens.a
      && expected.coordinateTokens.v === projection.coordinateTokens.v;
  } catch {
    return false;
  }
}
