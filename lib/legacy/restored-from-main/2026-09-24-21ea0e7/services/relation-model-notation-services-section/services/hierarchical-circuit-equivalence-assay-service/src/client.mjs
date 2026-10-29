import { randomUUID } from "node:crypto";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { a2aResultParts } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { circuitInterfaceFromAgentCard, sendSenTask, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { extractSenPart, senPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { decodeLegacyAscribedRelationalWire } from "@red-cup-engineering/hierarchical-circuit-law/legacy-ascribed-wire";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { decodeEquivalenceAssayReceipt, encodeEquivalenceAssayRequest } from "./assay.mjs";
import { jsonId } from "./semantic-identity.mjs";

const parts = a2aResultParts;

export async function requestHierarchicalCircuitEquivalence({ agentUrl, circuit, components = [], assembly, signal, send = sendSenTask }) {
  const request = encodeEquivalenceAssayRequest({ circuit, components, assembly });
  const requestValue = request.value ?? { kind: "HierarchicalCircuitAssayRequest", circuit, components, assembly };
  const canonicalRequest = encodeEquivalenceAssayRequest(requestValue);
  const document = ["ascribe", canonicalRequest.type, canonicalRequest.term];
  const message = ({ messageId: randomUUID(), contextId: "", taskId: "", role: ROLE_USER, parts: [senPart(semanticBytes(document), "hierarchical-circuit-equivalence-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], message, requireSignature: true, ...(signal ? { signal } : {}) });
  const output = extractSenPart(parts(exchange.result)), response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes) || response?.[0] !== "ascribe" || response.length !== 3) throw new Error("equivalence provider returned noncanonical RMN");
  decodeLegacyAscribedRelationalWire(response);
  const receipt = decodeEquivalenceAssayReceipt(response[1], response[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("equivalence receipt provider does not own the signed Agent Card");
  const expectedRequest = jsonId(document, "lenticule.hierarchical-circuit-equivalence.request");
  if (receipt.request !== expectedRequest) throw new Error("equivalence receipt does not bind the exact request");
  return { receipt, receiptNi: jsonId(response, "lenticule.hierarchical-circuit-equivalence.receipt"), response, exchange };
}
