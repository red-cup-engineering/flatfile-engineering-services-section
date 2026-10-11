import assert from "node:assert/strict";
import test from "node:test";

import {
  identifyProofCoordinate,
  PROOF_COORDINATE_OBJECT_KIND,
  proofCoordinateTerm,
  settleAndIdentifyProofCoordinate,
} from "../lib/identity.mjs";
import {
  commitSemanticEnvelope,
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  SEMANTIC_ENVELOPE_KIND,
  SEMANTIC_ENVELOPE_VERSION,
  SEN_NORMALIZATION_PROFILE,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const request = Object.freeze({
  resourceType: "semiotic-atom",
  root: "root",
  target: "target",
  witnesses: Object.freeze([
    Object.freeze({ domain: "root", generator: "specialization", codomain: "target" }),
  ]),
});

test("an earned proof coordinate receives the normalized v2 semantic envelope", () => {
  const result = settleAndIdentifyProofCoordinate(request);
  assert.equal(result.ok, true);
  assert.match(result.identity.token, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
  assert.equal(result.identity.envelope.kind, SEMANTIC_ENVELOPE_KIND);
  assert.equal(result.identity.envelope.version, SEMANTIC_ENVELOPE_VERSION);
  assert.equal(result.identity.envelope.objectKind, PROOF_COORDINATE_OBJECT_KIND);
  assert.equal(result.identity.envelope.normalizationProfile, SEN_NORMALIZATION_PROFILE);
  assert.equal(result.identity.envelope.settlementProfile, IDENTITY_SETTLEMENT_PROFILE);
  assert.equal(result.identity.envelope.witnessRoot, EMPTY_WITNESS_ROOT);
  assert.deepEqual(result.identity.envelope.settledBody, proofCoordinateTerm(result.coordinate));
  assert.equal(commitSemanticEnvelope(result.identity.envelope).token, result.identity.token);
  assert.equal(identifyProofCoordinate(result.coordinate).token, result.identity.token);
  assert.equal(result.identity.id, result.identity.token);
  assert.equal(Object.hasOwn(result.identity, "value"), false);
});

test("an unearned coordinate receives no identity", () => {
  const result = settleAndIdentifyProofCoordinate({ ...request, witnesses: [] });
  assert.deepEqual(result, { ok: false, reason: "unearned-coordinate" });
  assert.equal(Object.hasOwn(result, "identity"), false);
});
