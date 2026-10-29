#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { extractSenPart, senPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { decodeLegacyAscribedRelationalWire } from "@red-cup-engineering/hierarchical-circuit-law/legacy-ascribed-wire";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { assayHierarchicalCircuitEquivalence, decodeEquivalenceAssayRequest } from "../src/assay.mjs";
import { createHierarchicalCircuitEquivalenceRecordJournal } from "../src/record-journal.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function executeA2aMessage(source, env = process.env) {
  const message = (source);
  if (message.role !== ROLE_USER) throw new Error("equivalence assay requires an A2A ROLE_USER message");
  const input = extractSenPart(message.parts), request = decodeSemantic(input.bytes);
  if (!semanticBytes(request).equals(input.bytes) || request?.[0] !== "ascribe" || request.length !== 3) throw new Error("equivalence request must be canonical typed RMN CBOR");
  decodeLegacyAscribedRelationalWire(request);
  const result = assayHierarchicalCircuitEquivalence(decodeEquivalenceAssayRequest(request[1], request[2])), recordedAt = new Date().toISOString();
  const stateRoot = resolve(env.HIERARCHICAL_CIRCUIT_EQUIVALENCE_STATE_ROOT ?? resolve(ROOT, "data"));
  const store = createHierarchicalCircuitEquivalenceRecordJournal({ root: stateRoot });
  store.recordReceipt({ ...result.receipt, semanticId: result.semanticId }, recordedAt);
  return ({ messageId: randomUUID(), contextId: message.contextId, taskId: message.taskId, role: ROLE_AGENT, parts: [senPart(result.canonicalBytes, "hierarchical-circuit-equivalence-receipt.rmn.cbor")], metadata: { disposition: "conformant", receiptNi: result.semanticId, circuitNi: result.receipt.circuit, assemblyNi: result.receipt.assembly }, extensions: [], referenceTaskIds: [] });
}
try { const source = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`); } catch (error) { process.stderr.write(`${error.code ?? "equivalence-refusal"}: ${error.message}\n`); process.exitCode = 1; }
