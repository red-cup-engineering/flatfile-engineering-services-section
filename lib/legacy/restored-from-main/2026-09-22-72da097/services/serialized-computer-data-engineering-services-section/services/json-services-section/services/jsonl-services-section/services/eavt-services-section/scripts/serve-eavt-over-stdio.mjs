// serve-eavt-over-stdio — a stdio loop dispatching {id, verb, args} JSON frames to this
// package's own generic EAVT read/append/fold/supersede/relate/constitute/identity operations,
// replying {id, ok, value} or {id, ok: false, error}. Invents and ports nothing: every verb is a
// direct call to a function this package already publishes.
//
// Split out of LAGOON's scripts/eavt-worker.mjs on 2026-09-22 (owner ruling: a worker carrying
// only generic EAVT verbs belongs to the EAVT section itself, not to whichever system spawns it).
// LAGOON's own computer-deployment-engine still spawns ONE worker process exposing every verb a
// Guile caller needs — it imports genericEavtVerbs/genericEavtEffects from this module and merges
// them with its own deployment-specific verbs (inference work, FeltOS resource inspection,
// systemd observation, world look/go/say) into that one process's dispatch table and type
// catalog, so callers still see one worker, one handshake, one shared type-system identity.
// This file is also independently runnable on its own, exposing only the verbs below.
//
// Run: `node scripts/serve-eavt-over-stdio.mjs` (stdio only, no argv).

import { createInterface } from "node:readline";
import { unique } from "./deduplicate-rows.mjs";
import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { entities } from "./list-entities.mjs";
import { readEavtEntries } from "./read-eavt-entries.mjs";
import { appendEavtRow } from "./append-eavt-row.mjs";
import { relateEavtRows } from "./relate-eavt-rows.mjs";
import { relateFromEavtRows } from "./relate-from-eavt-rows.mjs";
import { supersedeEavtRows } from "./supersede-eavt-rows.mjs";
import { constitute } from "./constitute-entity.mjs";
import { eavtRow } from "./admit-row.mjs";
import { encodeCanonical, decodeCanonical, canonicalCborToNiUri } from "@red-cup-engineering/computer-system-engine/identity/index";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { collectTypeSystem, defineType } from "@red-cup-engineering/computer-system-engine/type-system";
import { typeSystemDocument } from "@red-cup-engineering/computer-system-engine/type-system-document";
import { admitOperation } from "@red-cup-engineering/computer-platform/operations";
import { createComputerPlatform, bindingsProviders } from "@red-cup-engineering/computer-platform";

// A strict {e,a,v,t} row, reused by every verb whose args or return value is one.
export const ROW_SCHEMA = {
  type: "object",
  properties: { e: { type: "string" }, a: { type: "string" }, v: {}, t: { type: "number" } },
  required: ["e", "a", "v", "t"],
};

// dispatch's catch-all replies {id, ok: false, error: <message>} on any thrown error,
// uniformly across every verb — so every verb's refusal/error schema is this one shape.
export const REFUSAL_SCHEMA = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
};

// a folded fiber, as returned by fold/fold-trace/settle.
export const FOLDED_SCHEMA = {
  type: "object",
  properties: { entity: { type: "string" }, fiber: { type: "array" } },
  required: ["entity", "fiber"],
};

// eavt used to ship dedupe/fold/settle/section/supersede/constituteEntity/entityAddress and the
// two capability-battery functions below directly (the pre-decomposition monolith, deleted at
// 84927d48667). The package has since decomposed into single-function subpaths; these recompose
// the same behavior from the current primitives rather than reimplementing it from scratch.
export function settle(subject, rows, opts = {}) {
  return foldEavtEvidence({ subject, rows: unique(rows), ...opts });
}

export function section(folded) {
  const out = { affirmed: [], denied: [], contradicted: [] };
  for (const cell of folded.fiber) {
    const { pos, neg } = cell.value;
    const projected = { predicate: cell.predicate, object: cell.object };
    if (pos && neg) out.contradicted.push(projected);
    else if (pos) out.affirmed.push(projected);
    else if (neg) out.denied.push(projected);
  }
  return out;
}

// The verification direction of constitute()'s own <kind>:<digest> address law: split the
// address on its first ":" to recover kind, then recompute the same address from a/v/t.
export function entityAddress(genesisRow) {
  const kind = genesisRow.e.slice(0, genesisRow.e.indexOf(":"));
  return constitute({ kind, attributes: genesisRow.v, t: genesisRow.t }).address;
}

export function eavtTraceCapabilityOperations(refusalSchema) {
  return {
    "assert-row": {
      handler: ({ row }) => eavtRow(row),
      spec: { args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] }, returns: ROW_SCHEMA, refusal: refusalSchema },
    },
    "append": {
      // appendEavtRow's own outputSchema (its current shape, not the bare path string an
      // earlier version returned): {path, line}, the line actually written.
      handler: ({ path, row }) => appendEavtRow({ path, row }),
      spec: {
        args: { type: "object", properties: { path: { type: "string" }, row: ROW_SCHEMA }, required: ["path", "row"] },
        returns: { type: "object", properties: { path: { type: "string" }, line: { type: "string" } }, required: ["path", "line"] },
        refusal: refusalSchema,
      },
    },
    "read": {
      handler: ({ path }) => readEavtEntries({ path }),
      spec: { args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, returns: { type: "array", items: ROW_SCHEMA }, refusal: refusalSchema },
    },
    "entities": {
      handler: ({ path }) => entities(readEavtEntries({ path })),
      spec: { args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, returns: { type: "array", items: { type: "string" } }, refusal: refusalSchema },
    },
    "fold-trace": {
      handler: ({ path, subject, opts }) => foldEavtEvidence({ subject, rows: readEavtEntries({ path }), ...(opts ?? {}) }),
      spec: { args: { type: "object", properties: { path: { type: "string" }, subject: { type: "string" }, opts: { type: "object" } }, required: ["path", "subject"] }, returns: FOLDED_SCHEMA, refusal: refusalSchema },
    },
  };
}

export function eavtRelationCapabilityOperations(refusalSchema) {
  const rowsSchema = { type: "array", items: ROW_SCHEMA };
  return {
    "relate": {
      handler: ({ rows, predicate, object }) => relateEavtRows({ rows, predicate, object }).subjects,
      spec: { args: { type: "object", properties: { rows: rowsSchema, predicate: { type: "string" }, object: {} }, required: ["rows", "predicate", "object"] }, returns: { type: "array" }, refusal: refusalSchema },
    },
    "relate-from": {
      handler: ({ rows, subject, predicate }) => relateFromEavtRows({ rows, subject, predicate }).objects,
      spec: { args: { type: "object", properties: { rows: rowsSchema, subject: { type: "string" }, predicate: { type: "string" } }, required: ["rows", "subject", "predicate"] }, returns: { type: "array" }, refusal: refusalSchema },
    },
  };
}

// The identity/dedupe/fold/settle/section/supersede/constitute verbs eavt-worker.mjs used to
// declare directly in its own VERBS table — content identity and evidence-fold operations that
// carry no deployment concern at all.
export function eavtCodecCapabilityOperations(refusalSchema) {
  return {
    // RFC 8949 canonical CBOR encoding of any admitted JSON-shaped value, base64 on the wire.
    "encode-cbor": {
      handler: ({ value }) => encodeCanonical(value).toString("base64"),
      spec: {
        args: { type: "object", properties: { value: {} }, required: ["value"] },
        returns: { type: "string" },
        refusal: refusalSchema,
      },
    },

    // the inverse: base64 canonical CBOR bytes back to the value.
    "decode-cbor": {
      handler: ({ bytes }) => decodeCanonical(Buffer.from(bytes, "base64")),
      spec: {
        args: { type: "object", properties: { bytes: { type: "string" } }, required: ["bytes"] },
        returns: {},
        refusal: refusalSchema,
      },
    },

    // content identity of a row (or any value): its RFC 6920 `ni:` URI over its canonical CBOR bytes.
    "row-id": {
      handler: ({ row }) => canonicalCborToNiUri(encodeCanonical(row)),
      spec: {
        args: { type: "object", properties: { row: {} }, required: ["row"] },
        returns: { type: "string" },
        refusal: refusalSchema,
      },
    },

    // G-Set dedupe of a row array by content id, first occurrence kept, order preserved.
    "dedupe": {
      handler: ({ rows }) => unique(rows),
      spec: {
        args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA } }, required: ["rows"] },
        returns: { type: "array", items: ROW_SCHEMA },
        refusal: refusalSchema,
      },
    },

    // fold one subject's {e,a,v,t} trace (already in hand) into its settled fiber.
    "fold": {
      handler: ({ subject, rows, opts }) => foldEavtEvidence({ subject, rows, ...(opts ?? {}) }),
      spec: {
        args: {
          type: "object",
          properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } },
          required: ["subject", "rows"],
        },
        returns: FOLDED_SCHEMA,
        refusal: refusalSchema,
      },
    },

    // dedupe + fold in one call.
    "settle": {
      handler: ({ subject, rows, opts }) => settle(subject, rows, opts ?? {}),
      spec: {
        args: {
          type: "object",
          properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } },
          required: ["subject", "rows"],
        },
        returns: FOLDED_SCHEMA,
        refusal: refusalSchema,
      },
    },

    // project a folded section to {affirmed, denied, contradicted}.
    "section": {
      handler: ({ folded }) => section(folded),
      spec: {
        args: { type: "object", properties: { folded: FOLDED_SCHEMA }, required: ["folded"] },
        returns: {
          type: "object",
          properties: { affirmed: { type: "array" }, denied: { type: "array" }, contradicted: { type: "array" } },
          required: ["affirmed", "denied", "contradicted"],
        },
        refusal: refusalSchema,
      },
    },

    // the latest-t functional projection over a raw row array (opts.functional names a Set).
    "supersede": {
      handler: ({ rows, functional }) => supersedeEavtRows({ rows, functionalAttributes: functional }).rows,
      spec: {
        args: {
          type: "object",
          properties: { rows: { type: "array", items: ROW_SCHEMA }, functional: { type: "array", items: { type: "string" } } },
          required: ["rows", "functional"],
        },
        returns: { type: "array", items: ROW_SCHEMA },
        refusal: refusalSchema,
      },
    },

    // birth an entity by its ONE constituting utterance: {address, genesisRow} (the EAVT
    // sketch-lane <kind>:<ni-digest> address rule; see @red-cup-engineering/eavt's src/eavt.mjs).
    "constitute": {
      handler: ({ kind, attributes, t }) => {
        const { address, genesis } = constitute({ kind, attributes, t });
        return { address, genesisRow: genesis };
      },
      spec: {
        args: {
          type: "object",
          properties: { kind: { type: "string" }, attributes: { type: "object" }, t: { type: "number" } },
          required: ["kind", "attributes", "t"],
        },
        returns: {
          type: "object",
          properties: { address: { type: "string" }, genesisRow: ROW_SCHEMA },
          required: ["address", "genesisRow"],
        },
        refusal: refusalSchema,
      },
    },

    // the verification direction: recompute a genesis row's own address from its content.
    "verify-address": {
      handler: ({ row }) => entityAddress(row),
      spec: {
        args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] },
        returns: { type: "string" },
        refusal: refusalSchema,
      },
    },
  };
}

// The complete generic-EAVT verb table: every verb that is just an eavt read, append, fold,
// relate, supersede, or identity operation — no deployment concern anywhere in it. A caller
// composing a larger worker (LAGOON's computer-deployment-engine) spreads this alongside its own
// verbs into one VERBS table.
export function genericEavtVerbs(refusalSchema) {
  return {
    ...eavtTraceCapabilityOperations(refusalSchema),
    ...eavtCodecCapabilityOperations(refusalSchema),
    ...eavtRelationCapabilityOperations(refusalSchema),
  };
}

// This table declares the generic verbs' effect boundaries; a composing caller merges these
// with its own verbs' effects. Every verb not named here defaults to no declared effect.
export const GENERIC_EAVT_EFFECTS = {
  append: ["filesystem:write"],
  read: ["filesystem:read"],
  entities: ["filesystem:read"],
  "fold-trace": ["filesystem:read"],
};

function accepted(result) {
  if (!result.ok) throw new TypeError(JSON.stringify(result.refusal));
  return result.value;
}

// Builds one runnable worker (VERBS table -> operations -> catalog -> platform -> dispatch) over
// any {verb: {handler, spec, operation?}} table and its effects map — shared by this file's own
// standalone run below and reusable by a caller composing a larger table (e.g. LAGOON's worker).
export function buildEavtStdioWorker(verbs, effects, opts = {}) {
  const allowedEffectsOverride = opts.allowedEffects;
  const platformId = opts.platformId ?? "eavt/worker";
  // Test-only: when set to a verb name, that verb's "verbs" handshake entry answers with no
  // "args" schema (the JSON key dropped entirely — JSON.stringify drops an `undefined`
  // property), so a Guile node-worker's own test suite can exercise its spec-incompleteness
  // refusal against a real handshake reply without a second worker script to maintain. The
  // handler itself is untouched: only the declared contract drifts, on purpose, for the test.
  const stripSpecArgsVerb = opts.stripSpecArgsVerb ?? null;
  const operations = Object.entries(verbs).map(([verb, { spec, operation }]) => operation ?? accepted(admitOperation({
    specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
    id: verb,
    domain: accepted(defineType({ id: `${platformId}/${verb}/input`, name: `${verb} input`, description: `Input to ${verb}.`, schema: spec.args, parents: [] })),
    codomain: accepted(defineType({ id: `${platformId}/${verb}/output`, name: `${verb} output`, description: `Output from ${verb}.`, schema: spec.returns, parents: [] })),
    effects: effects[verb] ?? [],
    body: { kind: "capability-effect", capability: verb },
  })));

  const typeSystem = accepted(collectTypeSystem(operations.flatMap(operation => [operation.domain, operation.codomain])));
  const catalog = accepted(typeSystemDocument(typeSystem));
  const platform = createComputerPlatform({
    id: platformId, typeSystem, operations,
    providers: bindingsProviders(Object.fromEntries(Object.entries(verbs).map(([verb, entry]) => [entry.operation?.body.capability ?? verb, entry.handler]))),
  });
  const allowedEffects = allowedEffectsOverride === undefined
    ? [...new Set(Object.values(effects).flat())]
    : allowedEffectsOverride;
  if (!Array.isArray(allowedEffects) || !allowedEffects.every(effect => typeof effect === "string")) throw new TypeError("allowedEffects must be an array of effect names");

  function verbSpecs() {
    return Object.entries(verbs).map(([verb, { spec }]) => ({
      verb,
      args: verb === stripSpecArgsVerb ? undefined : spec.args,
      returns: spec.returns,
      refusal: spec.refusal,
      typeSystemIdentity: catalog.identity,
      domain: platform.operation(verb).domain.id,
      codomain: platform.operation(verb).codomain.id,
      effects: platform.operation(verb).effects,
      operation: { ...platform.operation(verb), domain: platform.operation(verb).domain.id, codomain: platform.operation(verb).codomain.id },
    }));
  }

  async function dispatch(verb, args, expectedCatalog) {
    if (verb === "verbs") return { ok: true, value: verbSpecs() };
    if (verb === "type-system") return { ok: true, value: catalog };
    if (expectedCatalog !== catalog.identity) return { ok: false, refusal: { code: "TypeSystemMismatch", message: "request must name the type catalog observed at handshake" } };
    return platform.execute(verb, args ?? {}, { allowedEffects });
  }

  return { catalog, platform, dispatch, close: () => platform.close() };
}

// Runs a built worker's stdio loop against process.stdin/stdout — shared by this file's own
// standalone run and reusable by a caller composing a larger table.
export function runStdioWorker(worker) {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  async function respond(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let id;
    try {
      const frame = JSON.parse(trimmed);
      id = frame.id;
      const result = await worker.dispatch(frame.verb, frame.args, frame.typeSystemIdentity);
      process.stdout.write(JSON.stringify({ id, ...result, typeSystemIdentity: worker.catalog.identity, ...(frame.verb === "verbs" ? { typeSystem: worker.catalog } : {}), ...(!result.ok ? { error: `${result.refusal.code}: ${result.refusal.message}` } : {}) }) + "\n");
    } catch (err) {
      process.stdout.write(JSON.stringify({ id, ok: false, error: String(err && err.message || err) }) + "\n");
    }
  }

  let pendingFrame = Promise.resolve();
  rl.on("line", (line) => {
    pendingFrame = pendingFrame.then(() => respond(line), () => respond(line));
  });
  rl.on("close", () => { pendingFrame.finally(() => worker.close()); });
}

// Only run when invoked directly (so a composing caller, or this file's own contract test, can
// import its pieces without starting a second stdio loop).
if (import.meta.url === `file://${process.argv[1]}`) {
  const allowedEffects = process.env.EAVT_ALLOWED_EFFECTS === undefined ? undefined : JSON.parse(process.env.EAVT_ALLOWED_EFFECTS);
  const worker = buildEavtStdioWorker(genericEavtVerbs(REFUSAL_SCHEMA), GENERIC_EAVT_EFFECTS, { platformId: "eavt/worker", allowedEffects });
  runStdioWorker(worker);
}
