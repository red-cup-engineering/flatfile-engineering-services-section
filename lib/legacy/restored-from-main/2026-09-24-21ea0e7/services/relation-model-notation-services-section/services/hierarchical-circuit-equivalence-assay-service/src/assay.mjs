import { semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import {
  assayHierarchicalCircuitRequest,
  decodeCircuitAssayReceipt,
  encodeCircuitAssayRequest,
} from "@red-cup-engineering/hierarchical-circuit-law";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/relation-model-notation-graph-services-section/relational-value-graph";
import { jsonId } from "./semantic-identity.mjs";

export const EQUIVALENCE_ASSAY_PROFILE = "org.emsenn.infomaterial.hierarchical-circuit-equivalence-assay.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0xeab9a6b8a96342b12d0bf97adfe2cc8a329e3931";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function typed(value, objectKind) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { id: jsonId(term, objectKind), bytes: semanticBytes(term), type: encoded.type, term: encoded.term }; }

export function encodeEquivalenceAssayRequest(source) { return encodeCircuitAssayRequest(source); }
export function decodeEquivalenceAssayRequest(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-equivalence-assay", "equivalence request must use the relational RMN type");
  const value = decodeRelationalValue(type, term);
  return encodeCircuitAssayRequest(value).value;
}

export function assayHierarchicalCircuitEquivalence(source) {
  const request = encodeCircuitAssayRequest(source).value;
  const result = assayHierarchicalCircuitRequest(request);
  const kernelReceipt = decodeCircuitAssayReceipt(result.type, result.term);
  const requestDocument = typed(request, "lenticule.hierarchical-circuit-equivalence.request");
  const receipt = {
    kind: "HierarchicalCircuitEquivalenceReceipt",
    profile: EQUIVALENCE_ASSAY_PROFILE,
    provider: PROVIDER_ACCOUNT,
    request: requestDocument.id,
    circuit: kernelReceipt.circuit,
    assembly: kernelReceipt.assembly,
    behavior: kernelReceipt.behavior,
    components: kernelReceipt.components,
    equivalent: true,
  };
  const document = typed(receipt, "lenticule.hierarchical-circuit-equivalence.receipt");
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes, type: document.type, term: document.term };
}

export function decodeEquivalenceAssayReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-equivalence-assay", "equivalence receipt must use the relational RMN type");
  const value = decodeRelationalValue(type, term);
  const fields = ["assembly", "behavior", "circuit", "components", "equivalent", "kind", "profile", "provider", "request"];
  if (!exactKeys(value, fields) || value.kind !== "HierarchicalCircuitEquivalenceReceipt" || value.profile !== EQUIVALENCE_ASSAY_PROFILE || value.provider !== PROVIDER_ACCOUNT || value.equivalent !== true || ![value.request, value.circuit, value.assembly, value.behavior].every((identity) => NI.test(identity ?? "")) || !Array.isArray(value.components) || !value.components.every((identity) => NI.test(identity))) fail("malformed-equivalence-assay", "equivalence receipt has an unknown, absent, legacy, or foreign-provider field");
  return value;
}
