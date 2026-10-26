#!/usr/bin/env node
import { appendEavtRow } from "../scripts/append-eavt-row.mjs";
import { constituteContentAddressedEntity } from "../scripts/constitute-content-addressed-entity.mjs";
import { extractEavtCitations } from "../scripts/extract-eavt-citations.mjs";
import { foldEavtEvidence } from "../scripts/fold-eavt-evidence.mjs";
import { identifyContentAddressedRow } from "../scripts/identify-content-addressed-row.mjs";
import { readEavtTrace } from "../scripts/read-eavt-trace.mjs";
import { relateEavtRows } from "../scripts/relate-eavt-rows.mjs";
import { relateFromEavtRows } from "../scripts/relate-from-eavt-rows.mjs";
import { resolveEavtProofTree } from "../scripts/resolve-eavt-proof-tree.mjs";
import { saturateEavtTrace } from "../scripts/saturate-eavt-trace.mjs";
import { sectionEavtEvidence } from "../scripts/section-eavt-evidence.mjs";
import { settleEavtEvidence } from "../scripts/settle-eavt-evidence.mjs";
import { stratifyEavtEvidence } from "../scripts/stratify-eavt-evidence.mjs";
import { supersedeEavtRows } from "../scripts/supersede-eavt-rows.mjs";
import { transferEavtEvidence } from "../scripts/transfer-eavt-evidence.mjs";
import { verifyContentAddressedEntity } from "../scripts/verify-content-addressed-entity.mjs";
import { verifyEavtProofClosure } from "../scripts/verify-eavt-proof-closure.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const operations = Object.freeze({
  "append-eavt-row": appendEavtRow,
  "constitute-content-addressed-entity": constituteContentAddressedEntity,
  "extract-eavt-citations": extractEavtCitations,
  "fold-eavt-evidence": foldEavtEvidence,
  "identify-content-addressed-row": identifyContentAddressedRow,
  "read-eavt-trace": readEavtTrace,
  "relate-eavt-rows": relateEavtRows,
  "relate-from-eavt-rows": relateFromEavtRows,
  "resolve-eavt-proof-tree": resolveEavtProofTree,
  "saturate-eavt-trace": saturateEavtTrace,
  "section-eavt-evidence": sectionEavtEvidence,
  "settle-eavt-evidence": settleEavtEvidence,
  "stratify-eavt-evidence": stratifyEavtEvidence,
  "supersede-eavt-rows": supersedeEavtRows,
  "transfer-eavt-evidence": transferEavtEvidence,
  "verify-content-addressed-entity": verifyContentAddressedEntity,
  "verify-eavt-proof-closure": verifyEavtProofClosure,
});

export async function runEavtCli({ operation, input } = {}) {
  if (!Object.hasOwn(operations, operation)) throw new TypeError(`unknown EAVT operation: ${operation}`);
  return operations[operation](input);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [operation] = process.argv.slice(2);
  if (!operation || !Object.hasOwn(operations, operation)) throw new TypeError(`usage: eavt-cli.mjs <${Object.keys(operations).join("|")}> < request.json`);
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  process.stdout.write(`${JSON.stringify(await runEavtCli({ operation, input: JSON.parse(Buffer.concat(chunks).toString("utf8")) }))}\n`);
}
