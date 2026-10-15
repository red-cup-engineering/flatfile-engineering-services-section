/**
 * Semantic content identity: the content address of a typed SEN envelope. A value's
 * identity is `semanticId(envelope)`, where the envelope carries its object kind, its SEN
 * type, its settled (normal) body and the root of the witnesses its settlement consumed.
 * There is no other identity scheme.
 *
 * The envelope law and JSON content live here, in the data layer: a JSON value's term is a
 * value (closed, normal, typed by inference), so identifying or admitting JSON content needs
 * no evaluation. Normalizing an arbitrary term is the SEN evaluator's, and its identity
 * (`identifyNormalizedSemanticContent`) is the code layer's, built on this envelope law.
 */
import { bytesEqual, coincides, decodeSemantic, semanticAddress, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { jsonToTerm, termToJson } from "./json-codec.mjs";
import { checkTerm, inferTerm } from "./typing.mjs";
import { encodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/json-byte-carrier";

export const SEN_NORMALIZATION_PROFILE = "urn:rce:sen:normalize:0.1.0";
export const IDENTITY_SETTLEMENT_PROFILE = "urn:rce:settlement:identity:0.0.1";

/** The envelope's kind and version. */
export const SEMANTIC_ENVELOPE_KIND = "semiotic-expression-notation.normalized-semantic-content";
export const SEMANTIC_ENVELOPE_VERSION = 3;
const V2_KIND = SEMANTIC_ENVELOPE_KIND;
const ENVELOPE_VERSION = SEMANTIC_ENVELOPE_VERSION;
const V2_KEYS = Object.freeze([
  "kind",
  "version",
  "objectKind",
  "semanticType",
  "normalizationProfile",
  "settlementProfile",
  "settledBody",
  "witnessRoot",
]);
const V2_SORTED_KEYS = Object.freeze([...V2_KEYS].sort());

/** Explicit root for semantic material whose named settlement profile consumes
 * no evidential witnesses. This is a raw canonical-carrier commitment, not a
 * second semantic identity law. */
export const EMPTY_WITNESS_ROOT = semanticId({ kind: "semantic-content.empty-witness-bundle", version: 1 });

/** A semantic-content refusal: a TypeError carrying its refusal `code`. */
export function semanticContentRefusal(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

/** Whether a term inhabits a declared SEN type. */
export function inhabitsDeclaredType(term, semanticType) {
  try {
    checkTerm(term, semanticType);
    return true;
  } catch {
    return false;
  }
}

function commitmentOf(value) {
  const { id, bytes } = semanticAddress(value);
  return Object.freeze({ id, token: id, algorithm: "sha-256", mediaType: "application/sen+cbor", bytes });
}

/** A deep frozen copy, built without recursion: list terms nest as deep as they are long. */
function immutableCopy(value) {
  const copyOf = (node) => (node === null || typeof node !== "object" ? node : Array.isArray(node) ? new Array(node.length) : {});
  const root = copyOf(value);
  const pending = root === value ? [] : [[value, root]];
  const finished = [];
  while (pending.length > 0) {
    const [source, target] = pending.pop();
    finished.push(target);
    for (const [key, member] of Object.entries(source)) {
      const copy = copyOf(member);
      Object.defineProperty(target, key, { value: copy, enumerable: true, writable: true, configurable: true });
      if (copy !== member) pending.push([member, copy]);
    }
  }
  for (const node of finished) Object.freeze(node);
  return root;
}

function canonicalNi(value, field) {
  if (!isNiUri(value)) {
    throw semanticContentRefusal("malformed-content-address", `${field} must be one canonical RFC 6920 SHA-256 ni URI`);
  }
  return value;
}

function canonicalString(value, field) {
  if (typeof value !== "string") throw semanticContentRefusal("malformed-normalized-content", `${field} must be a finite string`);
  return value.normalize("NFC");
}

/** Admit an envelope: its fields, profiles and witness root, its body's type, and, given
 *  the profile's `normalForm`, that its body is already normal. */
export function admitSemanticEnvelope(envelope, { normalForm = undefined, typeChecked = false } = {}) {
  if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw semanticContentRefusal("malformed-normalized-content", "normalized semantic content must be one envelope object");
  }
  const keys = Object.keys(envelope).sort();
  if (keys.length !== V2_KEYS.length || !keys.every((key, index) => key === V2_SORTED_KEYS[index]) || envelope.kind !== V2_KIND || envelope.version !== ENVELOPE_VERSION) {
    throw semanticContentRefusal("malformed-normalized-content", "normalized semantic content has unknown fields, kind, or version");
  }
  const objectKind = canonicalString(envelope.objectKind, "objectKind");
  if (objectKind.length === 0) throw semanticContentRefusal("malformed-normalized-content", "objectKind must not be empty");
  if (envelope.normalizationProfile !== SEN_NORMALIZATION_PROFILE) {
    throw semanticContentRefusal("unsupported-normalization-profile", `unsupported normalization profile ${String(envelope.normalizationProfile)}`);
  }
  if (envelope.settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw semanticContentRefusal("unsupported-settlement-profile", `unsupported settlement profile ${String(envelope.settlementProfile)}`);
  }
  const witnessRoot = canonicalNi(envelope.witnessRoot, "witnessRoot");
  if (!typeChecked && !inhabitsDeclaredType(envelope.settledBody, envelope.semanticType)) {
    throw semanticContentRefusal("non-relational-content", "settledBody must be a closed SEN term inhabiting semanticType");
  }
  if (normalForm !== undefined) {
    let normalized;
    try {
      normalized = normalForm(envelope.settledBody);
    } catch {
      throw semanticContentRefusal("normalization-failure", "settledBody could not be checked under the declared normalization profile");
    }
    if (!coincides(normalized, envelope.settledBody)) {
      throw semanticContentRefusal("non-normal-content", "settledBody is not normal under the declared normalization profile");
    }
  }
  return immutableCopy({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType: envelope.semanticType,
    normalizationProfile: SEN_NORMALIZATION_PROFILE,
    settlementProfile: envelope.settlementProfile,
    settledBody: envelope.settledBody,
    witnessRoot,
  });
}

/** Admit an envelope and commit to it: its content address and canonical bytes. */
export function commitSemanticEnvelope(envelope, options = {}) {
  const admitted = admitSemanticEnvelope(envelope, options);
  return Object.freeze({ ...commitmentOf(admitted), envelope: admitted });
}

/** Admit canonical envelope bytes and reproduce their commitment (and `token`, if given). */
export function decodeSemanticEnvelope(bytes, token = undefined, options = {}) {
  if (!(bytes instanceof Uint8Array)) throw semanticContentRefusal("malformed-normalized-content", "normalized content bytes must be a Uint8Array");
  let decoded;
  try {
    decoded = decodeSemantic(bytes);
  } catch {
    throw semanticContentRefusal("malformed-normalized-content", "bytes must carry one canonical SEN normalized-content envelope");
  }
  const identified = commitSemanticEnvelope(decoded, options);
  if (!bytesEqual(identified.bytes, bytes)) {
    throw semanticContentRefusal("normalized-content-commitment-mismatch", "bytes do not reproduce their canonical normalized-content commitment");
  }
  if (token !== undefined && token !== identified.token) {
    throw semanticContentRefusal("normalized-content-commitment-mismatch", "token does not commit to the supplied normalized-content bytes");
  }
  return identified;
}

/** Admit one JSON value through the injective JSON→SEN bridge, infer its exact
 * closed product type, and identify only the resulting normalized envelope. */
export function identifyJsonSemanticContent({ objectKind, value, witnessRoot } = {}) {
  let term;
  try {
    term = jsonToTerm(value);
  } catch {
    throw semanticContentRefusal("non-relational-content", "value must cross the admitted JSON-to-SEN boundary");
  }
  let semanticType;
  try {
    semanticType = inferTerm(term);
  } catch {
    throw semanticContentRefusal("non-relational-content", "admitted JSON did not derive an SEN type");
  }
  // The JSON bridge yields a value term (marks, stars and pairs): closed, normal,
  // and typed by the inference above, so it is its own settled body.
  return commitSemanticEnvelope({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType,
    normalizationProfile: SEN_NORMALIZATION_PROFILE,
    settlementProfile: IDENTITY_SETTLEMENT_PROFILE,
    settledBody: term,
    witnessRoot,
  }, { typeChecked: true });
}

/** Whether a term is a value (marks, stars and pairs of values), checked without recursion. */
function isValue(term) {
  const pending = [term];
  while (pending.length > 0) {
    const node = pending.pop();
    if (!Array.isArray(node)) return false;
    if (node[0] === "pair") pending.push(node[1], node[2]);
    else if (node[0] !== "mark" && node[0] !== "star") return false;
  }
  return true;
}

/** Identify one typed SEN value term (marks, stars and pairs: closed and already normal), with no
 * evaluation. The bytes are those of the code layer's `identifyNormalizedSemanticContent` for
 * the same value, since a value is its own normal form. A term that is not a value needs the
 * SEN evaluator to normalize it first, and is refused here: that identity is the code layer's. */
export function identifyValueSemanticContent({
  objectKind,
  semanticType,
  term,
  witnessRoot,
  normalizationProfile = SEN_NORMALIZATION_PROFILE,
  settlementProfile = IDENTITY_SETTLEMENT_PROFILE,
} = {}) {
  if (normalizationProfile !== SEN_NORMALIZATION_PROFILE) {
    throw semanticContentRefusal("unsupported-normalization-profile", `unsupported normalization profile ${String(normalizationProfile)}`);
  }
  if (settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw semanticContentRefusal("unsupported-settlement-profile", `identifyValueSemanticContent requires ${IDENTITY_SETTLEMENT_PROFILE}`);
  }
  if (!inhabitsDeclaredType(term, semanticType)) {
    throw semanticContentRefusal("non-relational-content", "term must be a closed SEN term inhabiting semanticType");
  }
  if (!isValue(term)) {
    throw semanticContentRefusal("non-normal-content", "term is not a value; normalize it with the code layer's identifyNormalizedSemanticContent");
  }
  return commitSemanticEnvelope({
    kind: V2_KIND,
    version: ENVELOPE_VERSION,
    objectKind,
    semanticType,
    normalizationProfile,
    settlementProfile,
    settledBody: term,
    witnessRoot,
  }, { typeChecked: true });
}

/** The identity function of one object kind: a JSON value to its semantic id,
 * with no evidential witnesses. */
export function semanticIdOf(objectKind) {
  if (typeof objectKind !== "string" || objectKind.trim() === "") throw new TypeError("semantic-object-kind-required");
  return (value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

/** Content-address one JSON value under one object kind, with no evidential
 * witnesses: the two-argument boundary form of `semanticIdOf`, for a caller
 * that names both in one call rather than currying the kind first. Reports
 * only the address (id, token, algorithm, mediaType), never the raw content
 * bytes or the full normalized envelope those two already identify. */
export function contentAddressOf({ objectKind, value } = {}) {
  const { id, token, algorithm, mediaType } = identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
  return { id, token, algorithm, mediaType };
}

/** Verify that a JSON record's visible identity names its remaining body. */
export function verifyJsonSemanticRecord({ objectKind, value, witnessRoot, identityField = "id" } = {}) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    if (typeof identityField !== "string") return false;
    const identity = value[identityField];
    if (typeof identity !== "string") return false;
    const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== identityField));
    return identifyJsonSemanticContent({ objectKind, value: body, witnessRoot }).id === identity;
  } catch {
    return false;
  }
}

export function identifyBytesSemanticContent({ objectKind, bytes, mediaType = "application/octet-stream", witnessRoot } = {}) {
  let carrier;
  try {
    carrier = encodeJsonByteCarrier({ bytes: Array.from(bytes), mediaType });
  } catch (error) {
    if (!(bytes instanceof Uint8Array)) throw semanticContentRefusal("non-relational-content", "bytes must be a Uint8Array");
    throw semanticContentRefusal("malformed-normalized-content", error.message);
  }
  return identifyJsonSemanticContent({ objectKind, value: carrier, witnessRoot });
}

/** Admit v2 transport only when its body is exactly one injectively encoded JSON value of
 * the receiver's demanded object kind. A JSON value's term is normal, so the injective
 * round trip below is the body's normality check. */
export function admitJsonSemanticContent({ bytes, token, objectKind } = {}) {
  const identified = decodeSemanticEnvelope(bytes, token);
  if (identified.envelope.objectKind !== objectKind) {
    throw semanticContentRefusal("semantic-object-kind-mismatch", `expected semantic object kind ${String(objectKind)}`);
  }
  let value;
  try {
    value = termToJson(identified.envelope.settledBody);
  } catch {
    throw semanticContentRefusal("non-json-semantic-content", "settled body is not an admitted JSON term");
  }
  if (!coincides(jsonToTerm(value), identified.envelope.settledBody)) {
    throw semanticContentRefusal("non-json-semantic-content", "settled body is not the injective JSON-to-SEN representation");
  }
  return Object.freeze({ ...identified, value: immutableCopy(value) });
}

/** The proof profile a generative proof-path witness is committed under. */
export const GENERATIVE_PROOF_PATH_PROFILE = "urn:rce:proof-path:generative:0.0.1";
export const PROOF_PATH_WITNESS_KIND = "semiotic-content.proof-path-witness";

/** Commit one exact generative proof-path witness as semantic content. This commits the proof
 * material; it does not make the proof profile's verifier part of the identity law. A qualified
 * verifier must separately reconstruct structureRoot and re-check path. */
export function identifyProofPathWitness({
  structureRoot,
  sourceKey,
  targetKey,
  path,
  proofProfile = GENERATIVE_PROOF_PATH_PROFILE,
  witnessRoot = EMPTY_WITNESS_ROOT,
} = {}) {
  if (proofProfile !== GENERATIVE_PROOF_PATH_PROFILE) {
    throw semanticContentRefusal("unsupported-proof-path-profile", `unsupported proof-path profile ${String(proofProfile)}`);
  }
  const admittedSourceKey = canonicalString(sourceKey, "sourceKey");
  const admittedTargetKey = canonicalString(targetKey, "targetKey");
  const admittedPath = canonicalString(path, "path");
  if (admittedSourceKey.length === 0 || admittedTargetKey.length === 0 || admittedPath.length === 0) {
    throw semanticContentRefusal("malformed-proof-path-witness", "sourceKey, targetKey, and path must be nonempty");
  }
  return identifyJsonSemanticContent({
    objectKind: PROOF_PATH_WITNESS_KIND,
    value: {
      version: 1,
      proofProfile,
      structureRoot: canonicalNi(structureRoot, "structureRoot"),
      sourceKey: admittedSourceKey,
      targetKey: admittedTargetKey,
      path: admittedPath,
    },
    witnessRoot: canonicalNi(witnessRoot, "witnessRoot"),
  });
}

/** Identify JSON semantic content whose settlement is bound to one content-addressed proof-path witness. */
export function identifyProofPathedJsonSemanticContent({ objectKind, value, proofPathWitnessRoot } = {}) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: canonicalNi(proofPathWitnessRoot, "proofPathWitnessRoot") });
}

/** Identify raw bytes as semantic content bound to one content-addressed proof-path witness. */
export function identifyProofPathedBytesSemanticContent({ objectKind, bytes, mediaType = "application/octet-stream", proofPathWitnessRoot } = {}) {
  return identifyBytesSemanticContent({ objectKind, bytes, mediaType, witnessRoot: canonicalNi(proofPathWitnessRoot, "proofPathWitnessRoot") });
}
