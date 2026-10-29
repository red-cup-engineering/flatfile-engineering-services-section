#!/usr/bin/env node
import { runJavascriptNodeOperation } from "../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";
// eavt-cli — the composed face over the eavt scripts: one subcommand per effect/transform.
//
// Usage:
//   eavt-cli.mjs read <path>                                     # rows, torn-final-line tolerant
//   eavt-cli.mjs append <path> <row-json>                        # durable single-row append
//   eavt-cli.mjs fold <path> <subject>                           # read + fold (tombstones applied)
//   eavt-cli.mjs settle <path> <subject>                         # read + dedupe + fold
//   eavt-cli.mjs section <path> <subject>                        # read + fold + {affirmed,denied,contradicted}
//   eavt-cli.mjs stratify <path> <subject>                       # read + {asserted,saturated,settled} (Level 0/1/2)
//   eavt-cli.mjs entities <path>                                 # distinct subjects, first-occurrence order
//   eavt-cli.mjs assert <row-json>                                # validate a row is exactly {e,a,v,t}
//   eavt-cli.mjs row-id <row-json>                                # the row's ni: content identity
//   eavt-cli.mjs dedupe <rows-json>                               # G-Set dedupe of an in-hand rows array
//   eavt-cli.mjs supersede <rows-json> [functional-json]          # per-predicate latest-t read-lens
//   eavt-cli.mjs relate <rows-json> <predicate> <object-json>     # who stands in predicate to object
//   eavt-cli.mjs relate-from <rows-json> <subject> <predicate>    # what subject stands in predicate to
//   eavt-cli.mjs constitute <kind> <attributes-json> <t-json>     # birth an entity: {address, genesisRow}
//   eavt-cli.mjs verify-address <genesis-row-json>                # recompute + check a genesis row's address
//
// Fabricated command faces (@red-cup-engineering/eavt@0.8.0 satellite operation packages):
// stdin NDJSON in, NDJSON out, one request object per line.
//   eavt-cli.mjs constitute-eavt-entity   < requests.ndjson   # {kind,attributes,t} -> {address,genesisRow}
//   eavt-cli.mjs saturate-eavt-trace      < requests.ndjson   # {rows,retract?} -> {rows} (Level 1, Fix(σ))
//   eavt-cli.mjs transfer-eavt-trace      < requests.ndjson   # {subject,rows,converse?} -> {entity,fiber} (Fix(Δ))
//   eavt-cli.mjs stratify-eavt-trace      < requests.ndjson   # {subject,rows,retract?,converse?} -> {entity,asserted,saturated,settled,closure}
//   eavt-cli.mjs encode-eavt-row          < requests.ndjson   # {row} -> {line}
//   eavt-cli.mjs decode-eavt-row          < requests.ndjson   # {line} -> {row}
import readEavtFileScript from "../scripts/read-eavt-file.mjs";
import appendEavtRowScript from "../scripts/append-eavt-row.mjs";
import foldEavtTraceScript from "../scripts/fold-eavt-trace.mjs";
import listEavtEntitiesScript from "../scripts/list-eavt-entities.mjs";
import assertEavtRowScript from "../scripts/assert-eavt-row.mjs";
import identifyEavtRowScript from "../scripts/identify-eavt-row.mjs";
import dedupeEavtRowsScript from "../scripts/dedupe-eavt-rows.mjs";
import settleEavtTraceScript from "../scripts/settle-eavt-trace.mjs";
import sectionEavtTraceScript from "../scripts/section-eavt-trace.mjs";
import stratifyEavtTraceScript from "../scripts/stratify-eavt-trace.mjs";
import supersedeEavtRowsScript from "../scripts/supersede-eavt-rows.mjs";
import relateEavtRowsScript from "../scripts/relate-eavt-rows.mjs";
import relateEavtRowsFromScript from "../scripts/relate-eavt-rows-from.mjs";
import constituteEntityScript from "../scripts/constitute-entity.mjs";
import verifyEntityAddressScript from "../scripts/verify-entity-address.mjs";
import { constituteEntity, saturate, transfer, stratify, encodeRow, decodeRow } from "../src/eavt.mjs";

// FABRICATED_VERBS — the fabricated command faces, each a satellite operation package composing
// @red-cup-engineering/eavt@0.8.0 by exact pin (see the header comment). Dispatched separately
// from main()'s positional-arg switch below: each reads NDJSON requests from stdin and writes
// NDJSON responses to stdout, one object per line, matching the packages' own command faces.
const field = (request, name) => {
  if (!Object.hasOwn(request ?? {}, name)) throw new TypeError(`${name} is required`);
  return request[name];
};
const rows = (request) => {
  if (!Array.isArray(request?.rows)) throw new TypeError("rows is required");
  return request.rows;
};
const subject = (request) => {
  if (typeof request?.subject !== "string" || request.subject.length === 0) throw new TypeError("subject is required");
  return request.subject;
};
const FABRICATED_VERBS = {
  "constitute-eavt-entity": (request) => constituteEntity({ kind: field(request, "kind"), attributes: field(request, "attributes"), t: field(request, "t") }),
  "saturate-eavt-trace": (request) => ({ rows: saturate(rows(request), Object.hasOwn(request, "retract") ? { retract: request.retract } : {}) }),
  "transfer-eavt-trace": (request) => transfer(subject(request), rows(request), Object.hasOwn(request, "converse") ? { converse: request.converse } : {}),
  "stratify-eavt-trace": (request) => stratify(subject(request), rows(request), { ...(Object.hasOwn(request, "retract") ? { retract: request.retract } : {}), ...(Object.hasOwn(request, "converse") ? { converse: request.converse } : {}) }),
  "encode-eavt-row": (request) => ({ line: encodeRow(field(request, "row")) }),
  "decode-eavt-row": (request) => ({ row: decodeRow(field(request, "line")) }),
};

/**
 * Dispatches one fabricated verb to its operation package, reading NDJSON requests from stdin
 * and writing NDJSON responses to stdout.
 * @param {(request: object) => object} operation One of FABRICATED_VERBS' functions.
 * @returns {Promise<void>}
 */
async function runFabricatedVerb(operation) {
  const result = await runJavascriptNodeOperation({
    name: "eavt-operation", description: "Execute one EAVT carrier transformation.", operation,
    inputSchema: { type: "object" }, outputSchema: { type: "object" },
  }, { arguments: [], standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

function usage() {
  console.error(
    "usage: eavt-cli.mjs <read|append|fold|settle|section|stratify|entities|assert|row-id|dedupe|supersede|relate|relate-from|constitute|verify-address|constitute-eavt-entity|saturate-eavt-trace|transfer-eavt-trace|stratify-eavt-trace|encode-eavt-row|decode-eavt-row> ...",
  );
  process.exit(1);
}

function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case "read": {
      const [path] = rest;
      if (!path) usage();
      return readEavtFileScript(path);
    }
    case "append": {
      const [path, rowJson] = rest;
      if (!path || !rowJson) usage();
      return appendEavtRowScript(path, JSON.parse(rowJson));
    }
    case "fold": {
      const [path, subject] = rest;
      if (!path || !subject) usage();
      return foldEavtTraceScript(path, subject);
    }
    case "settle": {
      const [path, subject] = rest;
      if (!path || !subject) usage();
      return settleEavtTraceScript(path, subject);
    }
    case "section": {
      const [path, subject] = rest;
      if (!path || !subject) usage();
      return sectionEavtTraceScript(path, subject);
    }
    case "stratify": {
      const [path, subject] = rest;
      if (!path || !subject) usage();
      return stratifyEavtTraceScript(path, subject);
    }
    case "entities": {
      const [path] = rest;
      if (!path) usage();
      return listEavtEntitiesScript(path);
    }
    case "assert": {
      const [rowJson] = rest;
      if (!rowJson) usage();
      return assertEavtRowScript(JSON.parse(rowJson));
    }
    case "row-id": {
      const [rowJson] = rest;
      if (!rowJson) usage();
      return identifyEavtRowScript(JSON.parse(rowJson));
    }
    case "dedupe": {
      const [rowsJson] = rest;
      if (!rowsJson) usage();
      return dedupeEavtRowsScript(JSON.parse(rowsJson));
    }
    case "supersede": {
      const [rowsJson, functionalJson] = rest;
      if (!rowsJson) usage();
      return supersedeEavtRowsScript(JSON.parse(rowsJson), functionalJson ? JSON.parse(functionalJson) : undefined);
    }
    case "relate": {
      const [rowsJson, predicate, objectJson] = rest;
      if (!rowsJson || !predicate || objectJson === undefined) usage();
      return relateEavtRowsScript(JSON.parse(rowsJson), predicate, JSON.parse(objectJson));
    }
    case "relate-from": {
      const [rowsJson, subject, predicate] = rest;
      if (!rowsJson || !subject || !predicate) usage();
      return relateEavtRowsFromScript(JSON.parse(rowsJson), subject, predicate);
    }
    case "constitute": {
      const [kind, attributesJson, tJson] = rest;
      if (!kind || !attributesJson || tJson === undefined) usage();
      return constituteEntityScript(kind, JSON.parse(attributesJson), JSON.parse(tJson));
    }
    case "verify-address": {
      const [genesisRowJson] = rest;
      if (!genesisRowJson) usage();
      return verifyEntityAddressScript(JSON.parse(genesisRowJson));
    }
    default:
      return usage();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command] = process.argv.slice(2);
  if (Object.prototype.hasOwnProperty.call(FABRICATED_VERBS, command)) {
    await runFabricatedVerb(FABRICATED_VERBS[command]);
  } else {
    const result = main(process.argv.slice(2));
    console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
  }
}

export default main;
