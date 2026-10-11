// eavt-verbs — this package's generic EAVT read/append/fold/supersede/relate/constitute/identity
// operations as a plain verbs module: every named export is one verb function, each carrying a
// `.spec` ({args, returns, refusal}) and, where it has one, an `.effects` array — the shape
// computer-system-engine's generic stdio verb server (scripts/serve-verbs-over-stdio.mjs) loads
// with `--verbs @red-cup-engineering/eavt-services-section/verbs`. Invents and ports nothing: every verb is a
// direct call to a function this package already publishes.
//
// Replaces this package's former standalone stdio worker script, which held both this table AND
// its own copy of the stdio loop (buildEavtStdioWorker/runStdioWorker) — that loop is now the ONE
// generic loop in the tree, in computer-system-engine; this file is data plus thin handlers, no
// loop of its own (rule 10: no parallel implementations).

import { unique } from "./deduplicate-rows.mjs";
import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { entities as entitiesOf } from "./list-entities.mjs";
import { readEavtEntries } from "./read-eavt-entries.mjs";
import { appendEavtRow } from "./append-eavt-row.mjs";
import { relateEavtRows } from "./relate-eavt-rows.mjs";
import { relateFromEavtRows } from "./relate-from-eavt-rows.mjs";
import { supersedeEavtRows } from "./supersede-eavt-rows.mjs";
import { constitute as constituteEntity } from "./constitute-entity.mjs";
import { eavtRow } from "./admit-row.mjs";
import { encodeCanonical, decodeCanonical, canonicalCborToNiUri } from "@red-cup-engineering/cbor-services-section";
import { REFUSAL_SCHEMA } from "@red-cup-engineering/computer-data-engineering-services-section/operation-refusal-schema";

// A strict {e,a,v,t} row, reused by every verb whose args or return value is one.
const ROW_SCHEMA = {
  type: "object",
  properties: { e: { type: "string" }, a: { type: "string" }, v: {}, t: { type: "number" } },
  required: ["e", "a", "v", "t"],
};

// a folded fiber, as returned by fold/fold-trace/settle.
const FOLDED_SCHEMA = {
  type: "object",
  properties: { entity: { type: "string" }, fiber: { type: "array" } },
  required: ["entity", "fiber"],
};

// eavt used to ship dedupe/fold/settle/section/supersede/constituteEntity/entityAddress and the
// two capability-battery functions below directly (the pre-decomposition monolith, deleted at
// 84927d48667). The package has since decomposed into single-function subpaths; these recompose
// the same behavior from the current primitives rather than reimplementing it from scratch.
function settleFiber(subject, rows, opts = {}) {
  return foldEavtEvidence({ subject, rows: unique(rows), ...opts });
}

function sectionFiber(folded) {
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
function entityAddress(genesisRow) {
  const kind = genesisRow.e.slice(0, genesisRow.e.indexOf(":"));
  return constituteEntity({ kind, attributes: genesisRow.v, t: genesisRow.t }).address;
}

function assertRow({ row }) {
  return eavtRow(row);
}
assertRow.spec = {
  args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] },
  returns: ROW_SCHEMA,
  refusal: REFUSAL_SCHEMA,
};

// appendEavtRow's own outputSchema (its current shape, not the bare path string an earlier
// version returned): {path, line}, the line actually written.
export function append({ path, row }) {
  return appendEavtRow({ path, row });
}
append.spec = {
  args: { type: "object", properties: { path: { type: "string" }, row: ROW_SCHEMA }, required: ["path", "row"] },
  returns: { type: "object", properties: { path: { type: "string" }, line: { type: "string" } }, required: ["path", "line"] },
  refusal: REFUSAL_SCHEMA,
};
append.effects = ["filesystem:write"];

export function read({ path }) {
  return readEavtEntries({ path });
}
read.spec = {
  args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  returns: { type: "array", items: ROW_SCHEMA },
  refusal: REFUSAL_SCHEMA,
};
read.effects = ["filesystem:read"];

function entities({ path }) {
  return entitiesOf(readEavtEntries({ path }));
}
entities.spec = {
  args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  returns: { type: "array", items: { type: "string" } },
  refusal: REFUSAL_SCHEMA,
};
entities.effects = ["filesystem:read"];

function foldTrace({ path, subject, opts }) {
  return foldEavtEvidence({ subject, rows: readEavtEntries({ path }), ...(opts ?? {}) });
}
foldTrace.spec = {
  args: { type: "object", properties: { path: { type: "string" }, subject: { type: "string" }, opts: { type: "object" } }, required: ["path", "subject"] },
  returns: FOLDED_SCHEMA,
  refusal: REFUSAL_SCHEMA,
};
foldTrace.effects = ["filesystem:read"];

function relate({ rows, predicate, object }) {
  return relateEavtRows({ rows, predicate, object }).subjects;
}
relate.spec = {
  args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA }, predicate: { type: "string" }, object: {} }, required: ["rows", "predicate", "object"] },
  returns: { type: "array" },
  refusal: REFUSAL_SCHEMA,
};

function relateFrom({ rows, subject, predicate }) {
  return relateFromEavtRows({ rows, subject, predicate }).objects;
}
relateFrom.spec = {
  args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA }, subject: { type: "string" }, predicate: { type: "string" } }, required: ["rows", "subject", "predicate"] },
  returns: { type: "array" },
  refusal: REFUSAL_SCHEMA,
};

// RFC 8949 canonical CBOR encoding of any admitted JSON-shaped value, base64 on the wire.
function encodeCbor({ value }) {
  return encodeCanonical(value).toString("base64");
}
encodeCbor.spec = {
  args: { type: "object", properties: { value: {} }, required: ["value"] },
  returns: { type: "string" },
  refusal: REFUSAL_SCHEMA,
};

// the inverse: base64 canonical CBOR bytes back to the value.
function decodeCbor({ bytes }) {
  return decodeCanonical(Buffer.from(bytes, "base64"));
}
decodeCbor.spec = {
  args: { type: "object", properties: { bytes: { type: "string" } }, required: ["bytes"] },
  returns: {},
  refusal: REFUSAL_SCHEMA,
};

// content identity of a row (or any value): its RFC 6920 `ni:` URI over its canonical CBOR bytes.
function rowId({ row }) {
  return canonicalCborToNiUri(encodeCanonical(row));
}
rowId.spec = {
  args: { type: "object", properties: { row: {} }, required: ["row"] },
  returns: { type: "string" },
  refusal: REFUSAL_SCHEMA,
};

// G-Set dedupe of a row array by content id, first occurrence kept, order preserved.
function dedupe({ rows }) {
  return unique(rows);
}
dedupe.spec = {
  args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA } }, required: ["rows"] },
  returns: { type: "array", items: ROW_SCHEMA },
  refusal: REFUSAL_SCHEMA,
};

// fold one subject's {e,a,v,t} trace (already in hand) into its settled fiber.
function fold({ subject, rows, opts }) {
  return foldEavtEvidence({ subject, rows, ...(opts ?? {}) });
}
fold.spec = {
  args: { type: "object", properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } }, required: ["subject", "rows"] },
  returns: FOLDED_SCHEMA,
  refusal: REFUSAL_SCHEMA,
};

// dedupe + fold in one call.
function settle({ subject, rows, opts }) {
  return settleFiber(subject, rows, opts ?? {});
}
settle.spec = {
  args: { type: "object", properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } }, required: ["subject", "rows"] },
  returns: FOLDED_SCHEMA,
  refusal: REFUSAL_SCHEMA,
};

// project a folded section to {affirmed, denied, contradicted}.
function section({ folded }) {
  return sectionFiber(folded);
}
section.spec = {
  args: { type: "object", properties: { folded: FOLDED_SCHEMA }, required: ["folded"] },
  returns: {
    type: "object",
    properties: { affirmed: { type: "array" }, denied: { type: "array" }, contradicted: { type: "array" } },
    required: ["affirmed", "denied", "contradicted"],
  },
  refusal: REFUSAL_SCHEMA,
};

// the latest-t functional projection over a raw row array (opts.functional names a Set).
function supersede({ rows, functional }) {
  return supersedeEavtRows({ rows, functionalAttributes: functional }).rows;
}
supersede.spec = {
  args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA }, functional: { type: "array", items: { type: "string" } } }, required: ["rows", "functional"] },
  returns: { type: "array", items: ROW_SCHEMA },
  refusal: REFUSAL_SCHEMA,
};

// birth an entity by its ONE constituting utterance: {address, genesisRow} (the EAVT sketch-lane
// <kind>:<ni-digest> address rule; see this package's src/eavt.mjs equivalent, constitute-entity.mjs).
function constitute({ kind, attributes, t }) {
  const { address, genesis } = constituteEntity({ kind, attributes, t });
  return { address, genesisRow: genesis };
}
constitute.spec = {
  args: { type: "object", properties: { kind: { type: "string" }, attributes: { type: "object" }, t: { type: "number" } }, required: ["kind", "attributes", "t"] },
  returns: { type: "object", properties: { address: { type: "string" }, genesisRow: ROW_SCHEMA }, required: ["address", "genesisRow"] },
  refusal: REFUSAL_SCHEMA,
};

// the verification direction: recompute a genesis row's own address from its content.
function verifyAddress({ row }) {
  return entityAddress(row);
}
verifyAddress.spec = {
  args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] },
  returns: { type: "string" },
  refusal: REFUSAL_SCHEMA,
};

export {
  entities as "entities",
  foldTrace as "fold-trace",
  relate as "relate",
  relateFrom as "relate-from",
  encodeCbor as "encode-cbor",
  decodeCbor as "decode-cbor",
  rowId as "row-id",
  dedupe as "dedupe",
  fold as "fold",
  settle as "settle",
  section as "section",
  supersede as "supersede",
  constitute as "constitute",
  verifyAddress as "verify-address",
};
export { assertRow as "assert-row" };
