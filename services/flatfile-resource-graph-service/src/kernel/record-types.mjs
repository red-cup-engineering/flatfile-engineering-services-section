import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { identity, identityOfRecord } from "./identity.mjs";

// The Tier B institutional-fact enumeration (design spec §3) is closed at
// seven members. This module owns six of them; Witness (registers A+B,
// kernel/witness.mjs) is the seventh and is referenced here only by id and
// type — a foreign record trusted to have been validated where it was
// appended, never re-validated by this module.
export const TIER_B_RECORD_TYPES = Object.freeze([
  "Observation",
  "CorrectionRecord",
  "StatusEvent",
  "Office",
  "OfficerInstallation",
  "Session",
]);

const FOREIGN_TIER_B_TYPES = new Set(["Witness"]);

const STATUS_TRANSITIONS = new Set([
  "correction",
  "suspension",
  "revocation",
  "expiry",
  "reinstatement",
  "supersession",
]);

const AUTHORIZING_WITNESS_KINDS = new Set(["guard", "accounting"]);

const MEMORY_BANK_SECTIONS = Object.freeze([
  "product_context",
  "active_context",
  "progress",
  "decision_log",
  "system_patterns",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonempty(value, owner) {
  assert(typeof value === "string" && value.length > 0, `${owner}: required non-empty string`);
}

function optionalString(value, owner) {
  assert(value === null || typeof value === "string", `${owner}: must be a string or null`);
}

function urn(value, owner) {
  assert(isNiUri(value), `${owner}: required content identity`);
}

function optionalUrn(value, owner) {
  assert(value === null || isNiUri(value), `${owner}: must be a content identity or null`);
}

function stringArray(value, owner) {
  assert(Array.isArray(value), `${owner}: required array`);
  value.forEach((item, index) => nonempty(item, `${owner}[${index}]`));
}

function withIdentity(body) {
  assert(body && typeof body === "object" && !Array.isArray(body), "record body must be an object");
  assert(body.id === undefined, "record body already carries an id");
  return { id: identity(body), ...body };
}

// Grounds a Proposition in a named Accord (accord.md).
export function observation(input) {
  return withIdentity({
    type: "Observation",
    accord: input.accord,
    proposition: input.proposition,
    witness_id: input.witness_id,
    agent: input.agent,
  });
}

// Append-only supersession, mirrors academy.mjs's FormationRecordCorrection.
// invalidates_prior_for_use is hardcoded true, never caller-settable — the
// prior record is never deleted, only marked invalid-for-use by this record
// pointing at it.
export function correctionRecord(input) {
  return withIdentity({
    type: "CorrectionRecord",
    target: input.target,
    replacement: input.replacement,
    reason: input.reason,
    invalidates_prior_for_use: true,
  });
}

// Typed lifecycle transition, mirrors academy.mjs's QualificationStatusEvent.
// conveys_authority is hardcoded false, never caller-settable. supersedes/
// successor are always present, defaulting to null (not omitted) — a Tier B
// record's shape is fixed, not sparse.
export function statusEvent(input) {
  return withIdentity({
    type: "StatusEvent",
    target: input.target,
    transition: input.transition,
    supersedes: input.supersedes ?? null,
    successor: input.successor ?? null,
    conveys_authority: false,
  });
}

// R in normative-system.md's N=⟨Ag,R,Sc,Π,Δ⟩: a Hohfeldian duty/power/
// privilege/immunity profile. conveys_incumbency is hardcoded false —
// describing an office is not installing an officer.
export function office(input) {
  return withIdentity({
    type: "Office",
    slug: input.slug,
    duties: input.duties ?? [],
    powers: input.powers ?? [],
    privileges: input.privileges ?? [],
    immunities: input.immunities ?? [],
    scope: input.scope,
    conveys_incumbency: false,
  });
}

// Status-function declaration D=(X,Y,C,A) per status-function-declaration.md:
// office/officer/as_role/constitution/authorizing_act realize X/Y/C/A.
// conveys_authority is hardcoded true — the sole Tier B type permitted to
// set it.
export function officerInstallation(input) {
  return withIdentity({
    type: "OfficerInstallation",
    office: input.office,
    officer: input.officer,
    as_role: input.as_role,
    constitution: input.constitution,
    authorizing_act: input.authorizing_act,
    conveys_authority: true,
  });
}

// Agent-workspace memory-bank state, ported from gen-1's runtime/session.py
// (Cline Memory Bank shape): the five named sections plus an open custom
// section.
export function session(input = {}) {
  const sections = Object.fromEntries(MEMORY_BANK_SECTIONS.map((key) => [key, ""]));
  sections.custom = {};
  Object.assign(sections, input.sections ?? {});
  return withIdentity({
    type: "Session",
    office: input.office ?? null,
    sections,
  });
}

export function validateRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "record must be an object");
  assert(TIER_B_RECORD_TYPES.includes(record.type), `${record.type ?? "untyped"}: unsupported Tier B record type`);
  urn(record.id, `${record.type}.id`);
  assert(record.id === identityOfRecord(record), `${record.type} ${record.id}: content identity mismatch`);
  assert(record.conveys_authority !== true || record.type === "OfficerInstallation", `${record.type}: only OfficerInstallation may convey authority`);

  switch (record.type) {
    case "Observation":
      nonempty(record.accord, "Observation.accord");
      nonempty(record.proposition, "Observation.proposition");
      urn(record.witness_id, "Observation.witness_id");
      nonempty(record.agent, "Observation.agent");
      break;
    case "CorrectionRecord":
      urn(record.target, "CorrectionRecord.target");
      urn(record.replacement, "CorrectionRecord.replacement");
      nonempty(record.reason, "CorrectionRecord.reason");
      assert(record.invalidates_prior_for_use === true, "CorrectionRecord: prior use must be invalidated");
      break;
    case "StatusEvent":
      urn(record.target, "StatusEvent.target");
      assert(STATUS_TRANSITIONS.has(record.transition), "StatusEvent: invalid transition");
      optionalUrn(record.supersedes, "StatusEvent.supersedes");
      optionalUrn(record.successor, "StatusEvent.successor");
      assert(record.transition !== "supersession" || record.successor !== null, "StatusEvent: supersession requires a successor");
      assert(record.conveys_authority === false, "StatusEvent: cannot convey authority");
      break;
    case "Office":
      nonempty(record.slug, "Office.slug");
      stringArray(record.duties, "Office.duties");
      stringArray(record.powers, "Office.powers");
      stringArray(record.privileges, "Office.privileges");
      stringArray(record.immunities, "Office.immunities");
      nonempty(record.scope, "Office.scope");
      assert(record.conveys_incumbency === false, "Office: describing an office does not install an officer");
      break;
    case "OfficerInstallation":
      urn(record.office, "OfficerInstallation.office");
      nonempty(record.officer, "OfficerInstallation.officer");
      nonempty(record.as_role, "OfficerInstallation.as_role");
      assert(record.constitution !== undefined && record.constitution !== null, "OfficerInstallation.constitution: required");
      urn(record.authorizing_act, "OfficerInstallation.authorizing_act");
      assert(record.conveys_authority === true, "OfficerInstallation: installation must convey authority");
      break;
    case "Session": {
      optionalString(record.office, "Session.office");
      assert(record.sections && typeof record.sections === "object" && !Array.isArray(record.sections), "Session.sections: required object");
      const missing = MEMORY_BANK_SECTIONS.filter((key) => !(key in record.sections));
      assert(missing.length === 0, `Session.sections: missing section(s) ${missing.join(", ")}`);
      const allowed = new Set([...MEMORY_BANK_SECTIONS, "custom"]);
      const unknown = Object.keys(record.sections).filter((key) => !allowed.has(key));
      assert(unknown.length === 0, `Session.sections: unknown section key(s) ${unknown.join(", ")}`);
      const custom = record.sections.custom ?? {};
      assert(custom && typeof custom === "object" && !Array.isArray(custom), "Session.sections.custom: must be an object");
      break;
    }
  }
  return record;
}

function indexRecords(records) {
  const index = new Map();
  for (const record of records) {
    assert(record && typeof record === "object" && !Array.isArray(record), "record must be an object");
    if (TIER_B_RECORD_TYPES.includes(record.type)) {
      validateRecord(record);
    } else {
      assert(FOREIGN_TIER_B_TYPES.has(record.type), `${record.type ?? "untyped"}: unrecognized Tier B record type`);
      urn(record.id, `${record.type}.id`);
    }
    assert(!index.has(record.id), `${record.id}: duplicate content identity`);
    index.set(record.id, record);
  }
  return index;
}

// Walks record's supersedes chain, rejecting a cycle. Each hop is already
// known to resolve to a StatusEvent on the same target (the per-record
// cross-validation above); this asserts the chain as a whole is
// forward-only -- it never revisits a StatusEvent it has already passed
// through.
export function statusEventAncestors(index, record) {
  const seen = new Set([record.id]);
  let current = record;
  for (let i = 0; i < index.size + 1; i++) {
    const supersedes = current.supersedes;
    if (supersedes === null || supersedes === undefined) return;
    assert(!seen.has(supersedes), `${record.id}: supersedes chain is not acyclic at ${supersedes}`);
    seen.add(supersedes);
    current = index.get(supersedes);
  }
  assert(false, `${record.id}: supersedes chain exceeds record count`);
}

export function verifyRecords(records) {
  const index = indexRecords(records);
  const resolve = (id, owner) => {
    const found = index.get(id);
    assert(found, `${owner}: unresolved record ${id}`);
    return found;
  };
  const get = (id, type, owner) => {
    const found = index.get(id);
    assert(found?.type === type, `${owner}: unresolved ${type} ${id}`);
    return found;
  };
  for (const record of records) {
    if (record.type === "Observation") {
      get(record.witness_id, "Witness", record.id);
    } else if (record.type === "CorrectionRecord") {
      const target = resolve(record.target, record.id);
      const replacement = resolve(record.replacement, record.id);
      assert(target.type === replacement.type, `${record.id}: correction target and replacement are not the same type`);
    } else if (record.type === "StatusEvent") {
      resolve(record.target, record.id);
      if (record.supersedes !== null) {
        const superseded = get(record.supersedes, "StatusEvent", record.id);
        assert(superseded.target === record.target, `${record.id}: supersedes must resolve to a prior StatusEvent on the same target`);
        statusEventAncestors(index, record);
      }
      if (record.successor !== null) resolve(record.successor, record.id);
    } else if (record.type === "OfficerInstallation") {
      get(record.office, "Office", record.id);
      const act = get(record.authorizing_act, "Witness", record.id);
      assert(AUTHORIZING_WITNESS_KINDS.has(act.kind), `${record.id}: authorizing act must be a guard or accounting witness`);
    } else if (record.type === "Session" && record.office !== null) {
      get(record.office, "Office", record.id);
    }
  }
  return {
    ok: true,
    records: records.length,
    byType: Object.fromEntries(
      [...new Set(records.map((record) => record.type))].sort()
        .map((type) => [type, records.filter((record) => record.type === type).length])
    ),
  };
}


