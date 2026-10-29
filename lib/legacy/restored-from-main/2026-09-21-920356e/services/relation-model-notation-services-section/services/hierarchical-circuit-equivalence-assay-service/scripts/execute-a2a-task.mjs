#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeLegacyAscribedRelationalWire } from "@red-cup-engineering/hierarchical-circuit-law/legacy-ascribed-wire";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { assayHierarchicalCircuitEquivalence, decodeEquivalenceAssayRequest } from "../src/assay.mjs";
import { createHierarchicalCircuitEquivalenceRecordJournal } from "../src/record-journal.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function executeA2aMessage(source, env = process.env) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("equivalence assay requires an A2A ROLE_USER message");
  const input = extractRmnPart(message.parts), request = decodeSemantic(input.bytes);
  if (!semanticBytes(request).equals(input.bytes) || request?.[0] !== "ascribe" || request.length !== 3) throw new Error("equivalence request must be canonical typed RMN CBOR");
  decodeLegacyAscribedRelationalWire(request);
  const result = assayHierarchicalCircuitEquivalence(decodeEquivalenceAssayRequest(request[1], request[2])), recordedAt = new Date().toISOString();
  const stateRoot = resolve(env.HIERARCHICAL_CIRCUIT_EQUIVALENCE_STATE_ROOT ?? resolve(ROOT, "data"));
  const store = createHierarchicalCircuitEquivalenceRecordJournal({ root: stateRoot });
  store.recordReceipt({ ...result.receipt, semanticId: result.semanticId }, recordedAt);
  return Message.toJSON({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: Role.ROLE_AGENT, parts: [rmnPart(result.canonicalBytes, "hierarchical-circuit-equivalence-receipt.rmn.cbor")], metadata: { disposition: "conformant", receiptNi: result.semanticId, circuitNi: result.receipt.circuit, assemblyNi: result.receipt.assembly }, extensions: [], referenceTaskIds: [] });
}
try { const source = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`); } catch (error) { process.stderr.write(`${error.code ?? "equivalence-refusal"}: ${error.message}\n`); process.exitCode = 1; }
