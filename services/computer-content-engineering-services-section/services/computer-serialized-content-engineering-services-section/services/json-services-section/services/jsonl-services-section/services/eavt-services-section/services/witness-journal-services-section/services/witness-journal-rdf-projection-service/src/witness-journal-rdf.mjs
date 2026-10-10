import { canonical } from "@red-cup-engineering/json-services-section";
import { serializeNQuads } from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/n-quads";
import { canonicalizeNQuads } from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/rdf-canonicalization";
import {
  EMPTY_WITNESS_ROOT,
  identifyBytesSemanticContent,
  identifyValueSemanticContent,
} from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { inferTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { seavtRow } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";

const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";
const WITNESS_TIME = "urn:emsenn:witness-journal:time";

function refuse(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

/** A witness graph names only content: every IRI it carries is a canonical SHA-256 ni URI. */
function niIri(value) {
  if (!isNiUri(value)) {
    refuse("invalid-witness-graph", "SEAVT RDF projection graph must be a canonical SHA-256 ni URI");
  }
  return value;
}

/** T as an RDF JSON literal: its canonical JSON text. */
const jsonLiteral = (value) => Object.freeze({ kind: "literal", value: canonical(value), datatype: RDF_JSON });

function coordinateToken(term) {
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    refuse("invalid-witness-graph", "SEAVT RDF projection requires typed SEN coordinates");
  }
  return identifyValueSemanticContent({
    objectKind: "witness-journal.seavt.rdf-coordinate",
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

/**
 * Project one direct-SEN SEAVT row under an already-addressed graph/apex.
 *
 * The predication uses derived content commitments of E/A/V as RDF IRIs. The
 * direct typed SEN coordinates remain in `source`; no source row stores an
 * SRN or an opaque coordinate token. T is emitted as canonical RDF JSON.
 */
export async function projectSeavtRdf(row, { graph } = {}) {
  const sourceRow = seavtRow(row);
  const source = sourceRow;
  const coordinateTokens = Object.freeze({
    e: coordinateToken(source.e),
    a: coordinateToken(source.a),
    v: coordinateToken(source.v),
  });
  const graphIri = niIri(graph);
  const quads = [
    { subject: niIri(coordinateTokens.e), predicate: niIri(coordinateTokens.a), object: { kind: "iri", value: niIri(coordinateTokens.v) }, graph: graphIri },
    { subject: graphIri, predicate: WITNESS_TIME, object: jsonLiteral(source.t), graph: graphIri },
  ];
  const canonicalNQuads = await canonicalizeNQuads(serializeNQuads(quads));
  const bytes = Buffer.from(canonicalNQuads, "utf8");
  const token = identifyBytesSemanticContent({ objectKind: "witness-journal.rdf-projection", bytes, mediaType: "application/n-quads", witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return Object.freeze({
    graph,
    token,
    mediaType: "application/n-quads",
    bytes,
    canonicalNQuads,
    statementCount: quads.length,
    source,
    coordinateTokens,
  });
}

/**
 * Verify the whole receiver-facing relation: direct SEN source coordinates,
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
