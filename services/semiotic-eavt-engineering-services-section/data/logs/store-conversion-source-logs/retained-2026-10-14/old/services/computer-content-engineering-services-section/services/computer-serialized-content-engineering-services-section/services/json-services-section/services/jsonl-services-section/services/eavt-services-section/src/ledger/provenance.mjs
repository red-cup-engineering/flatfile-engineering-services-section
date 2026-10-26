/**
 * ledger/provenance - in-toto/SLSA/Sigstore as RWIL signed provenance.
 *
 * This is a structural model, not a Sigstore client: signatures are deterministic
 * commitments over canonical JSON so the record-tier law can be tested without
 * pretending to perform keyless signing, Rekor inclusion, or certificate-chain
 * verification.
 */

import {
  attestationLinkCarrier,
  attestationLinkSchema,
  provenanceReadingCarrier,
  provenanceReadingSchema,
  signedProvenanceSourceCarrier,
  signedProvenanceSourceSchema,
  structuralProvenanceSignatureCarrier,
  structuralProvenanceSignatureSchema,
} from "./provenance-schema.mjs";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

export {
  attestationLinkCarrier,
  attestationLinkSchema,
  provenanceReadingCarrier,
  provenanceReadingSchema,
  signedProvenanceSourceCarrier,
  signedProvenanceSourceSchema,
  structuralProvenanceSignatureCarrier,
  structuralProvenanceSignatureSchema,
} from "./provenance-schema.mjs";


function signaturePayload(source, signer) {
  return requireJsonValue({
    kind: "relating.ledger.provenance.signature-payload",
    scheme: "sigstore.structural",
    signer,
    source,
  }, "provenance signature payload");
}

export function signProvenanceSource(source, signer) {
  return structuralProvenanceSignatureCarrier.assert(Object.freeze({
    kind: "relating.ledger.provenance.structural-signature",
    scheme: "sigstore.structural",
    signer,
    digest: semanticId(signaturePayload(source, signer)),
  }), "structural provenance signature");
}

export function signedProvenanceSource(source, signer) {
  return signedProvenanceSourceCarrier.assert(Object.freeze({
    kind: "relating.ledger.provenance.signed-source",
    source,
    signature: signProvenanceSource(source, signer),
  }), "signed provenance source");
}

export function verifySignedProvenanceSource(signed) {
  signedProvenanceSourceCarrier.assert(signed, "signed provenance source");
  return signed.signature.digest === semanticId(signaturePayload(signed.source, signed.signature.signer));
}

export function attestationSourceOf(link) {
  return requireJsonValue({
    kind: "relating.ledger.provenance.attestation-source",
    name: link.name,
    subject: link.subject,
    predicateType: link.predicateType,
    predicate: link.predicate,
    materials: [...link.materials],
    products: [...link.products],
    t: link.t,
  }, "attestation source");
}

export function createAttestationLink(input) {
  const base = Object.freeze({
    kind: "relating.ledger.provenance.attestation-link",
    name: input.name,
    subject: input.subject,
    predicateType: input.predicateType,
    predicate: input.predicate,
    materials: Object.freeze([...(input.materials ?? [])]),
    products: Object.freeze([...(input.products ?? [])]),
    t: input.t,
  });
  const source = attestationSourceOf(base);
  return attestationLinkCarrier.assert(Object.freeze({
    ...base,
    source,
    signature: signProvenanceSource(source, input.signer),
  }), "attestation link");
}

export function signedSourceOfAttestation(link) {
  return signedProvenanceSourceCarrier.assert(Object.freeze({
    kind: "relating.ledger.provenance.signed-source",
    source: link.source,
    signature: link.signature,
  }), "attestation signed source");
}

export function verifyAttestationLink(link) {
  attestationLinkCarrier.assert(link, "attestation link");
  const expectedSource = attestationSourceOf(link);
  return canonical(link.source) === canonical(expectedSource) && verifySignedProvenanceSource(signedSourceOfAttestation(link));
}

export function attestationLinkToDatom(link) {
  const signedSource = signedSourceOfAttestation(link);
  const reading = provenanceReadingCarrier.assert(Object.freeze({
    kind: "relating.ledger.provenance.reading",
    standard: "in-toto/slsa/sigstore.structural",
    linkName: link.name,
    signedSource,
    verified: verifyAttestationLink(link),
  }), "provenance reading");
  return Object.freeze([link.subject, link.predicateType, link.predicate, link.t, reading]);
}

function isProvenanceReading(value) {
  return provenanceReadingCarrier.validate(value);
}

export function attestationLinkFromDatom(datom) {
  const reading = datom[4];
  if (!isProvenanceReading(reading)) throw new TypeError("datom has no provenance reading");
  const source = reading.signedSource.source;
  if (typeof source !== "object" || source === null || Array.isArray(source)) throw new TypeError("provenance source must be an object");
  const src = source;
  return attestationLinkCarrier.assert(Object.freeze({
    kind: "relating.ledger.provenance.attestation-link",
    name: String(src.name),
    subject: datom[0],
    predicateType: String(datom[1]),
    predicate: datom[2],
    materials: Array.isArray(src.materials) ? src.materials : [],
    products: Array.isArray(src.products) ? src.products : [],
    source,
    signature: reading.signedSource.signature,
    t: datom[3],
  }), "attestation link from datom");
}

export function verifyAttestationDatom(datom) {
  try {
    const link = attestationLinkFromDatom(datom);
    return verifyAttestationLink(link) &&
      canonical(datom[0]) === canonical(link.subject) &&
      canonical(datom[1]) === canonical(link.predicateType) &&
      canonical(datom[2]) === canonical(link.predicate) &&
      canonical(datom[3]) === canonical(link.t);
  } catch {
    return false;
  }
}

function isDatom(value) {
  return Array.isArray(value) && value.length === 5;
}

function linkOf(value) {
  return isDatom(value) ? attestationLinkFromDatom(value) : value;
}

function jsonKey(value) {
  return canonical(value);
}

/**
 * Read an attestation chain as the supply-chain provenance order. An edge
 * exists when one link's product is another link's material.
 */
export function provenanceOrder(chain) {
  const links = chain.map(linkOf);
  const productOwner = new Map();
  links.forEach((link, index) => {
    for (const product of link.products) productOwner.set(jsonKey(product), index);
  });

  const deps = links.map((link) => new Set());
  links.forEach((link, index) => {
    for (const material of link.materials) {
      const owner = productOwner.get(jsonKey(material));
      if (owner !== undefined && owner !== index) deps[index].add(owner);
    }
  });

  const out = [];
  const temporary = new Set();
  const permanent = new Set();
  const visit = (index) => {
    if (permanent.has(index)) return;
    if (temporary.has(index)) throw new Error("provenanceOrder: cycle in attestation chain");
    temporary.add(index);
    for (const dep of [...deps[index]].sort((a, b) => a - b)) visit(dep);
    temporary.delete(index);
    permanent.add(index);
    out.push(links[index]);
  };

  for (let i = 0; i < links.length; i += 1) visit(i);
  return Object.freeze(out);
}

export function provenanceWitnessOfDatom(datom) {
  return eavtRecord({ e: datom[0], a: datom[1], v: datom[2], t: datom[3] });
}
