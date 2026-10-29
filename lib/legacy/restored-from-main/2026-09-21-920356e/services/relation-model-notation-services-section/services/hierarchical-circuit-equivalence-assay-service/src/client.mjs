import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, circuitInterfaceFromAgentCard, sendRmnTask, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeLegacyAscribedRelationalWire } from "@red-cup-engineering/hierarchical-circuit-law/legacy-ascribed-wire";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { decodeEquivalenceAssayReceipt, encodeEquivalenceAssayRequest } from "./assay.mjs";
import { jsonId } from "./semantic-identity.mjs";

const parts = a2aResultParts;

export async function requestHierarchicalCircuitEquivalence({ agentUrl, circuit, components = [], assembly, signal, send = sendRmnTask }) {
  const request = encodeEquivalenceAssayRequest({ circuit, components, assembly });
  const requestValue = request.value ?? { kind: "HierarchicalCircuitAssayRequest", circuit, components, assembly };
  const canonicalRequest = encodeEquivalenceAssayRequest(requestValue);
  const document = ["ascribe", canonicalRequest.type, canonicalRequest.term];
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(semanticBytes(document), "hierarchical-circuit-equivalence-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], message, requireSignature: true, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(parts(exchange.result)), response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes) || response?.[0] !== "ascribe" || response.length !== 3) throw new Error("equivalence provider returned noncanonical RMN");
  decodeLegacyAscribedRelationalWire(response);
  const receipt = decodeEquivalenceAssayReceipt(response[1], response[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("equivalence receipt provider does not own the signed Agent Card");
  const expectedRequest = jsonId(document, "lenticule.hierarchical-circuit-equivalence.request");
  if (receipt.request !== expectedRequest) throw new Error("equivalence receipt does not bind the exact request");
  return { receipt, receiptNi: jsonId(response, "lenticule.hierarchical-circuit-equivalence.receipt"), response, exchange };
}
