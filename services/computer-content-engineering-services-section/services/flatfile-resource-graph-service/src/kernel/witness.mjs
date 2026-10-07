import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { isValidKind } from "../operator/kind.mjs";
import { identityOfRecord } from "./identity.mjs";
import { four, witnessBit } from "@red-cup-engineering/computer-data-services-section/four";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonempty(value, owner) {
  assert(typeof value === "string" && value.length > 0, `${owner}: required non-empty string`);
}

function optionalString(value, owner) {
  assert(value === null || typeof value === "string", `${owner}: must be a string or null`);
}

function fourPair(value, owner) {
  assert(
    Array.isArray(value) && value.length === 2 && value.every((bit) => typeof bit === "boolean"),
    `${owner}: must be a two-element boolean pair`,
  );
}

function toRecord(fields) {
  return {
    type: "Witness",
    operator: fields.operator,
    target: fields.target,
    before_digest: fields.before_digest,
    after_digest: fields.after_digest,
    details: { ...fields.details },
    agent: fields.agent,
    timestamp: fields.timestamp,
    kind: fields.kind,
    four_before: [...fields.four_before],
    four_after: [...fields.four_after],
    channel: fields.channel,
    conveys_authority: false,
  };
}

// One operator invocation, before/after digests and FOUR evidence tagged.
// conveys_authority is always false — a witness records that something
// happened, never that anyone was granted anything. Two gates fire here,
// before the record is minted an id, and either one constructs nothing —
// no id, no record, no return value a caller could go on to append:
//   REGISTER B — witnessBit refuses anything but exactly one legal 0->1
//     knowledge-cover transition from four_before to four_after.
//   settling-monotonicity (design spec S5 step 7) — this is that gate's
//     named seam: when a settlement (a kernel/settlement.mjs CellSettlement)
//     is given, target's write is guarded against that settlement's own
//     accumulated knowledge state — judged independently of whatever
//     four_before this call happened to self-report — and
//     SettlingMonotonicityViolation aborts before anything is minted,
//     exactly as a Register B rejection does.
export function makeWitness({
  operator,
  target,
  before_digest = null,
  after_digest = null,
  details,
  agent = null,
  timestamp,
  kind,
  four_before,
  four_after,
  channel,
  settlement = null,
}) {
  fourPair(four_before, "four_before");
  fourPair(four_after, "four_after");
  const before = four(four_before[0], four_before[1]);
  const after = four(four_after[0], four_after[1]);
  witnessBit(before, after);
  if (settlement !== null) settlement.write(target, after);

  const record = toRecord({ operator, target, before_digest, after_digest, details, agent, timestamp, kind, four_before, four_after, channel });
  return Object.freeze({ id: identityOfRecord(record), ...record });
}

// Independent per-record shape check, mirroring record-types.mjs's
// validateRecord discipline for the other six Tier B types: required
// fields, operator/kind.mjs kind membership, the always-false
// authority-withholding boolean, and the id-round-trip against the
// record's own content.
export function validateWitness(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "record must be an object");
  assert(record.type === "Witness", `${record.type ?? "untyped"}: not a Witness record`);
  nonempty(record.operator, "Witness.operator");
  nonempty(record.target, "Witness.target");
  optionalString(record.before_digest, "Witness.before_digest");
  optionalString(record.after_digest, "Witness.after_digest");
  assert(record.details && typeof record.details === "object" && !Array.isArray(record.details), "Witness.details: required object");
  optionalString(record.agent, "Witness.agent");
  nonempty(record.timestamp, "Witness.timestamp");
  nonempty(record.kind, "Witness.kind");
  assert(isValidKind(record.kind), `Witness.kind: invalid operation kind ${JSON.stringify(record.kind)}`);
  fourPair(record.four_before, "Witness.four_before");
  fourPair(record.four_after, "Witness.four_after");
  nonempty(record.channel, "Witness.channel");
  assert(record.conveys_authority === false, "Witness.conveys_authority: must be False");
  assert(typeof record.id === "string" && record.id.length > 0, "Witness: id must be a non-empty string");
  assert(isNiUri(record.id), "Witness.id: required content identity");
  assert(record.id === identityOfRecord(record), `Witness ${record.id}: content identity mismatch`);
  return record;
}


