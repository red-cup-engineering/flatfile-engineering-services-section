import assert from "node:assert/strict";
import test from "node:test";
import {
  admitArtifactFabricationRealizationPlan,
  admitArtifactFabricationRealizationReceipt,
  admitArtifactFabricationSpecification,
  DEFINITIONALLY_EXACT_PARAMETERS,
  codeSpanIsParameter,
  firstBareNumber,
  findArtifactFabricationEpistemicDebt,
  summarizeArtifactFabricationClaims,
} from "../src/artifact-fabrication.mjs";

const at = { type: "ArtifactFabricationSourceSpan", startLine: 1, endLine: 1 };
const hex = "a".repeat(64);
const sha = `sha256:${hex}`;
const source = { type: "ArtifactFabricationSource", version: 1, identity: { type: "ArtifactFabricationSourceIdentity", id: "lot" }, provenance: { type: "ArtifactFabricationSourceProvenance", locator: "fixture:source.md", digest: sha, sourceSpan: at } };
const artifact = { type: "FabricatedArtifactIdentity", version: 1, id: "gate", kind: "fixture" };
const projection = { type: "ArtifactFabricationProjection", version: 1, id: "package", target: "fixture", configuration: { module: "gate" }, sourceSpan: at };
const trace = () => ({ type: "ArtifactFabricationTrace", version: 1, requirementId: "halt", constraintIds: ["law", "standard"], projectionIds: ["package"], acceptanceObligationIds: ["accept"] });
const measuredClaim = () => ({ type: "ArtifactFabricationClaim", version: 1, id: "stale-seconds", kind: "parameter", statement: "Quotes older than the measured p99 feed latency are stale", status: "measured", quantity: { type: "ArtifactFabricationQuantity", value: 4, unit: "s" }, basis: { type: "ArtifactFabricationMeasuredBasis", locator: "data/feed-latency.jsonl", digest: sha, derivation: "p99 of receive minus exchange timestamps" }, sourceSpan: at });
const derivedClaim = () => ({ type: "ArtifactFabricationClaim", version: 1, id: "halt-seconds", kind: "parameter", statement: "Halt within twice the stale age", status: "derived", quantity: { type: "ArtifactFabricationQuantity", value: 8, unit: "s" }, basis: { type: "ArtifactFabricationDerivedBasis", premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "stale-seconds" }, { type: "ArtifactFabricationPremise", kind: "citation", ref: "Nyquist sampling" }], derivation: "2 times stale-seconds" }, sourceSpan: at });
const conjectureClaim = () => ({ type: "ArtifactFabricationClaim", version: 1, id: "queue-share", kind: "world", statement: "Our resting orders fill at the queue-position share", status: "conjectured", quantity: { type: "ArtifactFabricationQuantity", value: 0.5, unit: "ratio" }, basis: { type: "ArtifactFabricationConjecturedBasis", hypothesis: "Fill probability equals queue share", measurementPlan: { type: "ArtifactFabricationMeasurementPlan", observable: "fill versus queue position", instrument: "shadow desk fill log", decisionRule: "adopt the fitted share when the interval excludes the estimate" }, estimateDerivation: "uniform share between best and worst case" }, sourceSpan: at });
const clause = (type, id, statement, extra = {}) => ({ type, version: 2, id, statement, parameters: [], claimIds: [], sourceSpan: at, ...extra });
const param = (name, value, unit, claimId, exact = null) => ({ type: "ArtifactFabricationParameter", version: 1, name, value, unit, claimId, exact });
const constraint = (id, kind, extra = {}) => ({ type: "ArtifactFabricationConstraint", version: 2, id, kind, authority: "Authority", revision: "r1", locator: "fixture", applicability: "all", statement: "Holds", parameters: [], claimIds: [], sourceSpan: at, ...extra });
const obligation = (extra = {}) => ({ type: "ArtifactFabricationAcceptanceObligation", version: 2, id: "accept", kind: "test", statement: "A recipient verifies the halt", parameters: [], claimIds: [], sourceSpan: at, ...extra });
const assay = () => obligation({ id: "measure-queue", kind: "assay", statement: "Measure the queue share", claimIds: ["queue-share"] });

function candidate() {
  return {
    type: "ArtifactFabricationSpecificationCandidate", version: 2, source, artifact,
    claims: [measuredClaim(), derivedClaim()],
    requirements: [clause("ArtifactFabricationRequirement", "halt", "The gate shall halt within {{halt}}", { parameters: [param("halt", 8, "s", "halt-seconds")], claimIds: ["halt-seconds"] })],
    prohibitions: [], openQuestions: [],
    constraints: [constraint("law", "law"), constraint("standard", "standard")],
    projections: [projection], acceptanceObligations: [obligation()], traceability: [trace()],
  };
}
const refusalOf = (value) => admitArtifactFabricationSpecification(value);
function assertRefused(mutate, code) {
  const value = candidate(); mutate(value);
  const actual = refusalOf(value);
  assert.equal(actual.type, "ArtifactFabricationSpecificationRefusal", `expected ${code}, admitted`);
  assert.equal(actual.code, code, actual.message);
}

test("a version 2 candidate with measured and derived claims is admitted and counted", () => {
  const admitted = refusalOf(candidate());
  assert.equal(admitted.type, "ArtifactFabricationSpecification");
  assert.equal(admitted.version, 2);
  assert.deepEqual(admitted.claims.map(({ groundedOn }) => groundedOn), [[], []]);
  assert.deepEqual(summarizeArtifactFabricationClaims(admitted), { measured: 1, derived: 1, conjectured: 0, derivedOnConjecture: 0 });
  assert.equal(refusalOf(candidate()).specificationDigest, admitted.specificationDigest);
});

test("a conjecture with a plan and a scheduled assay is admitted; a derived claim on it records its grounding", () => {
  const value = candidate();
  value.claims.push(conjectureClaim(), { ...derivedClaim(), id: "fill-rate", quantity: { type: "ArtifactFabricationQuantity", value: 0.5, unit: "ratio" }, basis: { ...derivedClaim().basis, premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "queue-share" }] } });
  value.acceptanceObligations.push(assay());
  value.traceability[0].acceptanceObligationIds.push("measure-queue");
  const admitted = refusalOf(value);
  assert.equal(admitted.type, "ArtifactFabricationSpecification", admitted.message);
  assert.deepEqual(admitted.claims.find(({ id }) => id === "fill-rate").groundedOn, ["queue-share"]);
  assert.deepEqual(summarizeArtifactFabricationClaims(admitted), { measured: 1, derived: 2, conjectured: 1, derivedOnConjecture: 1 });
});

test("a non-blocking open question schedules a conjecture", () => {
  const value = candidate(); value.claims.push(conjectureClaim());
  value.openQuestions = [{ type: "ArtifactFabricationOpenQuestion", version: 2, id: "queue", question: "What is the queue share?", blocking: false, claimId: "queue-share", sourceSpan: at }];
  { const r = refusalOf(value); assert.equal(r.type, "ArtifactFabricationSpecification", r.code + " " + r.message); }
});

test("claim typing refusals", () => {
  assertRefused((v) => { v.claims[0].status = "probable"; }, "INVALID_EPISTEMIC_STATUS");
  assertRefused((v) => { v.claims[0].kind = "rumour"; }, "INVALID_CLAIM");
  assertRefused((v) => { v.claims.push(measuredClaim()); }, "DUPLICATE_CLAIM_ID");
  assertRefused((v) => { v.claims[0].quantity = { type: "ArtifactFabricationQuantity", value: Infinity, unit: "s" }; }, "INVALID_QUANTITY");
});

test("measured claims need locator, digest and derivation", () => {
  assertRefused((v) => { delete v.claims[0].basis.locator; }, "MEASURED_CLAIM_WITHOUT_EVIDENCE");
  assertRefused((v) => { v.claims[0].basis.digest = "md5:abc"; }, "MEASURED_CLAIM_WITHOUT_EVIDENCE");
  assertRefused((v) => { v.claims[0].basis.derivation = ""; }, "MEASURED_CLAIM_WITHOUT_EVIDENCE");
  assertRefused((v) => { v.claims[0].basis = null; }, "MEASURED_CLAIM_WITHOUT_EVIDENCE");
});

test("derived claims need premises that resolve and do not cycle", () => {
  assertRefused((v) => { v.claims[1].basis.premises = []; }, "DERIVED_CLAIM_WITHOUT_PREMISES");
  assertRefused((v) => { v.claims[1].basis.derivation = ""; }, "DERIVED_CLAIM_WITHOUT_PREMISES");
  assertRefused((v) => { v.claims[1].basis.premises[0].ref = "nothing"; }, "UNKNOWN_PREMISE_REFERENCE");
  assertRefused((v) => { v.claims[1].basis.premises[1].kind = "requirement"; }, "UNKNOWN_PREMISE_REFERENCE");
  assertRefused((v) => { v.claims[1].basis.premises[1].kind = "oracle"; }, "INVALID_PREMISE");
  assertRefused((v) => { v.claims[0] = { ...derivedClaim(), id: "stale-seconds", basis: { ...derivedClaim().basis, premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "halt-seconds" }] } }; }, "CIRCULAR_DERIVATION");
});

test("derived claims may cite a requirement and a constraint", () => {
  const value = candidate();
  value.claims[1].basis.premises = [{ type: "ArtifactFabricationPremise", kind: "requirement", ref: "halt" }, { type: "ArtifactFabricationPremise", kind: "constraint", ref: "law" }];
  { const r = refusalOf(value); assert.equal(r.type, "ArtifactFabricationSpecification", r.code + " " + r.message); }
});

test("conjectures need a plan, an estimate and a scheduled measurement", () => {
  const withConjecture = (v, mutate) => { const c = conjectureClaim(); mutate(c); v.claims.push(c); v.acceptanceObligations.push(assay()); };
  assertRefused((v) => withConjecture(v, (c) => { delete c.basis.measurementPlan; }), "CONJECTURE_WITHOUT_MEASUREMENT_PLAN");
  assertRefused((v) => withConjecture(v, (c) => { c.basis.measurementPlan.instrument = ""; }), "CONJECTURE_WITHOUT_MEASUREMENT_PLAN");
  assertRefused((v) => withConjecture(v, (c) => { c.basis.measurementPlan.decisionRule = ""; }), "CONJECTURE_WITHOUT_MEASUREMENT_PLAN");
  assertRefused((v) => withConjecture(v, (c) => { c.basis.hypothesis = ""; }), "CONJECTURE_WITHOUT_MEASUREMENT_PLAN");
  assertRefused((v) => withConjecture(v, (c) => { c.basis.estimateDerivation = ""; }), "CONJECTURE_WITHOUT_ESTIMATE");
  assertRefused((v) => { v.claims.push(conjectureClaim()); }, "CONJECTURE_WITHOUT_MEASUREMENT_OBLIGATION");
});

test("every number names a claim or a definitionally exact constant", () => {
  const exactValue = candidate();
  exactValue.requirements[0].statement = "The gate shall halt within {{halt}} and report every {{minute}}";
  exactValue.requirements[0].parameters.push(param("minute", 60, "s/min", null, "seconds-per-minute"));
  assert.equal(refusalOf(exactValue).type, "ArtifactFabricationSpecification");
  assert.ok(DEFINITIONALLY_EXACT_PARAMETERS["cents-per-dollar"]);
  for (const [name, value] of [["seconds-per-hour", 3600], ["seconds-per-week", 604800], ["days-per-week", 7], ["joules-per-kilowatt-hour", 3600000]]) assert.equal(DEFINITIONALLY_EXACT_PARAMETERS[name].value, value);
  assert.equal(DEFINITIONALLY_EXACT_PARAMETERS["seconds-per-week"].value, DEFINITIONALLY_EXACT_PARAMETERS["seconds-per-day"].value * DEFINITIONALLY_EXACT_PARAMETERS["days-per-week"].value);
  assertRefused((v) => { v.requirements[0].parameters[0].claimId = null; }, "PARAMETER_WITHOUT_CLAIM");
  assertRefused((v) => { v.requirements[0].statement = "The gate shall halt after 5 seconds"; }, "PARAMETER_WITHOUT_CLAIM");
  assertRefused((v) => { v.acceptanceObligations[0].statement = "Verify at least 3 halts"; }, "PARAMETER_WITHOUT_CLAIM");
  assertRefused((v) => { v.constraints.push(constraint("cap", "operational", { statement: "Hold at most 10%", claimIds: ["stale-seconds"] })); }, "PARAMETER_WITHOUT_CLAIM");
  assertRefused((v) => { v.requirements[0].parameters[0].value = 9; }, "PARAMETER_CLAIM_MISMATCH");
  assertRefused((v) => { v.requirements[0].parameters[0].unit = "ms"; }, "PARAMETER_CLAIM_MISMATCH");
  assertRefused((v) => { v.requirements[0].parameters[0].claimId = "nothing"; }, "UNKNOWN_CLAIM_REFERENCE");
  assertRefused((v) => { v.requirements[0].claimIds = ["nothing"]; }, "UNKNOWN_CLAIM_REFERENCE");
  assertRefused((v) => { v.requirements[0].statement = "The gate shall halt within {{other}}"; }, "UNKNOWN_PARAMETER_PLACEHOLDER");
  assertRefused((v) => { v.requirements[0].parameters = [param("halt", 61, "s/min", null, "seconds-per-minute")]; }, "EXACT_PARAMETER_MISMATCH");
  assertRefused((v) => { v.requirements[0].parameters = [param("halt", 5, "s", null, "five")]; }, "EXACT_PARAMETER_MISMATCH");
  assertRefused((v) => { v.requirements[0].parameters.push(param("halt", 8, "s", "halt-seconds")); }, "DUPLICATE_PARAMETER_NAME");
  assertRefused((v) => { v.requirements[0].claimIds = ["halt-seconds", "halt-seconds"]; }, "DUPLICATE_CLAIM_REFERENCE");
});

test("identifiers and standards that contain digits are not bare numbers", () => {
  const value = candidate();
  value.requirements[0].statement = "The gate shall halt within {{halt}} per `RFC-3339` and SHA-256 section §8 of v2";
  { const r = refusalOf(value); assert.equal(r.type, "ArtifactFabricationSpecification", r.code + " " + r.message); }
});

test("a restriction rests on a claim that is not conjecture", () => {
  const prohibition = (extra) => clause("ArtifactFabricationProhibition", "no-stale", "The gate shall not quote on stale data", extra);
  const ok = candidate(); ok.prohibitions = [prohibition({ claimIds: ["stale-seconds"] })];
  ok.traceability.push({ ...trace(), requirementId: "no-stale" });
  assert.equal(refusalOf(ok).type, "ArtifactFabricationSpecification");
  const mixed = candidate(); mixed.claims.push(conjectureClaim()); mixed.acceptanceObligations.push(assay());
  mixed.prohibitions = [prohibition({ claimIds: ["stale-seconds", "queue-share"] })]; mixed.traceability.push({ ...trace(), requirementId: "no-stale" });
  assert.equal(refusalOf(mixed).type, "ArtifactFabricationSpecification");
  assertRefused((v) => { v.prohibitions = [prohibition({})]; v.traceability.push({ ...trace(), requirementId: "no-stale" }); }, "RESTRICTION_WITHOUT_CLAIM");
  assertRefused((v) => { v.claims.push(conjectureClaim()); v.acceptanceObligations.push(assay()); v.prohibitions = [prohibition({ claimIds: ["queue-share"] })]; v.traceability.push({ ...trace(), requirementId: "no-stale" }); }, "RESTRICTION_GROUNDED_ON_CONJECTURE");
  assertRefused((v) => { v.claims.push(conjectureClaim(), { ...derivedClaim(), id: "fill-rate", quantity: null, basis: { ...derivedClaim().basis, premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "queue-share" }] } }); v.acceptanceObligations.push(assay()); v.constraints.push(constraint("cap", "operational", { claimIds: ["fill-rate"] })); }, "RESTRICTION_GROUNDED_ON_CONJECTURE");
  assertRefused((v) => { v.constraints.push(constraint("cap", "operational")); }, "RESTRICTION_WITHOUT_CLAIM");
});

test("a blocking question on a measurable conjecture is refused with its own code", () => {
  const question = (extra) => ({ type: "ArtifactFabricationOpenQuestion", version: 2, id: "queue", question: "What is the queue share?", blocking: true, claimId: "queue-share", sourceSpan: at, ...extra });
  assertRefused((v) => { v.claims.push(conjectureClaim()); v.acceptanceObligations.push(assay()); v.openQuestions = [question({})]; }, "BLOCKED_ON_MEASURABLE_CONJECTURE");
  assertRefused((v) => { v.claims.push(conjectureClaim(), { ...derivedClaim(), id: "fill-rate", quantity: null, basis: { ...derivedClaim().basis, premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "queue-share" }] } }); v.acceptanceObligations.push(assay()); v.openQuestions = [question({ claimId: "fill-rate" })]; }, "BLOCKED_ON_MEASURABLE_CONJECTURE");
  assertRefused((v) => { v.openQuestions = [question({ claimId: null })]; }, "BLOCKING_OPEN_QUESTION");
  assertRefused((v) => { v.openQuestions = [question({ claimId: "stale-seconds" })]; }, "BLOCKING_OPEN_QUESTION");
  assertRefused((v) => { v.openQuestions = [question({ blocking: false, claimId: "nothing" })]; }, "UNKNOWN_CLAIM_REFERENCE");
});

test("a dependency, API or behavior is only ever a measured claim", () => {
  const api = (status) => ({ ...measuredClaim(), id: "kalshi-api", kind: "api", statement: "The orderbook endpoint returns bids and asks", quantity: null, status });
  const ok = candidate(); ok.claims.push(api("measured"));
  assert.equal(refusalOf(ok).type, "ArtifactFabricationSpecification");
  assertRefused((v) => { v.claims.push({ ...derivedClaim(), id: "kalshi-api", kind: "api", quantity: null }); }, "IMPLEMENTATION_CLAIM_NOT_MEASURED");
  assertRefused((v) => { v.claims.push({ ...conjectureClaim(), id: "kalshi-api", kind: "dependency", quantity: null }); }, "IMPLEMENTATION_CLAIM_NOT_MEASURED");
});

test("clauses must be at the claim-bearing version and candidates versioned", () => {
  assertRefused((v) => { v.requirements[0].version = 1; }, "INVALID_CLAUSE");
  assertRefused((v) => { v.version = 3; }, "UNSUPPORTED_CANDIDATE_VERSION");
  assert.equal(admitArtifactFabricationSpecification({ ...legacy(), version: 0 }).code, "UNSUPPORTED_CANDIDATE_VERSION");
  assertRefused((v) => { delete v.claims; }, "UNEXPECTED_FIELDS");
  assertRefused((v) => { v.constraints = [constraint("law", "law")]; }, "MISSING_STANDARD");
});

function legacy() {
  const old = (type, id, statement) => ({ type, version: 1, id, statement, sourceSpan: at });
  return {
    type: "ArtifactFabricationSpecificationCandidate", version: 1, source, artifact,
    requirements: [old("ArtifactFabricationRequirement", "halt", "The gate shall halt within 5 seconds")], prohibitions: [old("ArtifactFabricationProhibition", "no-stale", "The gate shall not quote on stale data")], openQuestions: [],
    constraints: ["law", "standard"].map((kind) => ({ type: "ArtifactFabricationConstraint", version: 1, id: kind, kind, authority: "A", revision: "r", locator: "l", applicability: "all", statement: "Holds", sourceSpan: at })),
    projections: [projection],
    acceptanceObligations: [{ type: "ArtifactFabricationAcceptanceObligation", version: 1, id: "accept", kind: "test", statement: "Verify", sourceSpan: at }],
    traceability: [{ ...trace(), constraintIds: ["law", "standard"] }, { ...trace(), requirementId: "no-stale" }],
  };
}

// The digest the legacy fixture was admitted under, before version 1 was retired (the record and its digest are unchanged).
const LEGACY_DIGEST = "ni:///sha-256;AzuFL1eOPxS0FT71kUNtGbRDWhdxaGccWLhK9MJ_01s";
const readLegacy = () => admitArtifactFabricationSpecification(legacy(), { admittedDigest: LEGACY_DIGEST });

test("a new version 1 candidate is retired, and a stored one is read only against the digest it was admitted under", () => {
  const retired = admitArtifactFabricationSpecification(legacy());
  assert.equal(retired.type, "ArtifactFabricationSpecificationRefusal");
  assert.equal(retired.code, "LEGACY_CANDIDATE_RETIRED");
  const read = readLegacy();
  assert.equal(read.type, "ArtifactFabricationSpecification");
  assert.equal(read.specificationDigest, LEGACY_DIGEST, "the stored record's digest is unchanged");
  const edited = legacy(); edited.requirements[0].statement = "The gate shall halt within 6 seconds";
  assert.equal(admitArtifactFabricationSpecification(edited, { admittedDigest: LEGACY_DIGEST }).code, "ADMITTED_DIGEST_MISMATCH");
  assert.equal(admitArtifactFabricationSpecification(candidate(), { admittedDigest: "ni:///sha-256;wrong" }).code, "ADMITTED_DIGEST_MISMATCH");
  const v2 = refusalOf(candidate());
  assert.equal(admitArtifactFabricationSpecification(candidate(), { admittedDigest: v2.specificationDigest }).specificationDigest, v2.specificationDigest);
});

test("a stored version 1 specification reads unchanged and lists its migration debt", () => {
  const admitted = readLegacy();
  assert.equal(admitted.type, "ArtifactFabricationSpecification");
  assert.equal(admitted.version, 1);
  assert.equal("claims" in admitted, false);
  assert.deepEqual(findArtifactFabricationEpistemicDebt(legacy()), [
    { code: "PARAMETER_WITHOUT_CLAIM", path: "requirements[0].statement" },
    { code: "RESTRICTION_WITHOUT_CLAIM", path: "prohibitions[0]" },
  ]);
  assert.deepEqual(findArtifactFabricationEpistemicDebt(null), []);
  assert.deepEqual(findArtifactFabricationEpistemicDebt(candidate()), [], "a version 2 candidate has no debt: the admission binds it");
  assert.equal(admitArtifactFabricationSpecification({ ...legacy(), claims: [] }, { admittedDigest: LEGACY_DIGEST }).code, "UNEXPECTED_FIELDS");
});

test("plans and receipts bind both specification versions and require evidence for every projection and obligation", () => {
  for (const specification of [readLegacy(), refusalOf(candidate())]) {
    const plan = { type: "ArtifactFabricationRealizationPlanCandidate", version: 1, artifactId: "gate", specificationDigest: specification.specificationDigest, projectionIds: ["package"], acceptanceObligationIds: ["accept"] };
    assert.equal(admitArtifactFabricationRealizationPlan(specification, plan).type, "ArtifactFabricationRealizationPlan");
    assert.equal(admitArtifactFabricationRealizationPlan(specification, { ...plan, acceptanceObligationIds: [] }).code, "INCOMPLETE_PLAN_COVERAGE");
    assert.equal(admitArtifactFabricationRealizationPlan(specification, { ...plan, specificationDigest: "x" }).code, "SPECIFICATION_BINDING_MISMATCH");
    const evidence = (digest = sha) => ({ type: "ArtifactFabricationEvidence", locator: "run:1", digest });
    const receipt = { type: "ArtifactFabricationRealizationReceiptCandidate", version: 1, artifactId: "gate", specificationDigest: specification.specificationDigest, realizations: [{ type: "ArtifactFabricationRealizationEvidence", version: 1, projectionId: "package", evidence: evidence() }], acceptances: [{ type: "ArtifactFabricationRealizationEvidence", version: 1, acceptanceObligationId: "accept", evidence: evidence() }] };
    assert.equal(admitArtifactFabricationRealizationReceipt(specification, receipt).type, "ArtifactFabricationRealizationReceipt");
    assert.equal(admitArtifactFabricationRealizationReceipt(specification, { ...receipt, acceptances: [] }).code, "MISSING_RECEIPT_EVIDENCE");
    assert.equal(admitArtifactFabricationRealizationReceipt(specification, { ...receipt, realizations: [{ ...receipt.realizations[0], evidence: evidence("sha256:short") }] }).code, "INVALID_EVIDENCE");
    assert.equal(admitArtifactFabricationRealizationReceipt(specification, { ...receipt, realizations: [...receipt.realizations, receipt.realizations[0]] }).code, "DUPLICATE_RECEIPT_EVIDENCE");
    assert.equal(admitArtifactFabricationRealizationReceipt(specification, { ...receipt, specificationDigest: "x" }).code, "SPECIFICATION_BINDING_MISMATCH");
  }
  assert.equal(admitArtifactFabricationRealizationPlan({ type: "ArtifactFabricationSpecification", version: 3, specificationDigest: "x" }, {}).code, "INVALID_SPECIFICATION");
});

test("fabrication kind is not limited to software or material lots", () => {
  const digests = [];
  for (const kind of ["computer-code", "dataset", "scientific-article", "media-asset", "material-component"]) {
    const value = candidate();
    value.artifact.kind = kind;
    const admitted = refusalOf(value);
    assert.equal(admitted.type, "ArtifactFabricationSpecification", kind);
    assert.equal(admitted.artifact.kind, kind);
    digests.push(admitted.specificationDigest);
    const plan = admitArtifactFabricationRealizationPlan(admitted, {
      type: "ArtifactFabricationRealizationPlanCandidate", version: 1,
      artifactId: "gate", specificationDigest: admitted.specificationDigest,
      projectionIds: ["package"], acceptanceObligationIds: ["accept"],
    });
    assert.equal(plan.type, "ArtifactFabricationRealizationPlan", kind);
    assert.equal("realizations" in plan, false, "a plan does not attest to produced bytes");
  }
  assert.equal(new Set(digests).size, 5, "artifact kinds must have separate source identities");
  assertRefused((v) => { v.artifact.kind = ""; }, "INVALID_TEXT");
  assertRefused((v) => { v.artifact.kind = "software\nmaterial"; }, "INVALID_TEXT");
});

test("plans and receipts refuse malformed purported admitted specifications instead of throwing", () => {
  const admitted = refusalOf(candidate());
  assert.equal(admitted.type, "ArtifactFabricationSpecification");
  const malformed = [
    { ...admitted, artifact: null },
    { ...admitted, artifact: { type: "FabricatedArtifactIdentity", version: 1, id: "", kind: "fixture" } },
    { ...admitted, projections: [null] },
    { ...admitted, acceptanceObligations: [{ id: null }] },
    { ...admitted, traceability: null },
    { ...admitted, projections: null },
    { ...admitted, acceptanceObligations: null },
  ];
  const plan = {
    type: "ArtifactFabricationRealizationPlanCandidate", version: 1,
    artifactId: "gate", specificationDigest: admitted.specificationDigest,
    projectionIds: ["package"], acceptanceObligationIds: ["accept"],
  };
  const evidence = { type: "ArtifactFabricationEvidence", locator: "run:1", digest: sha };
  const receipt = {
    type: "ArtifactFabricationRealizationReceiptCandidate", version: 1,
    artifactId: "gate", specificationDigest: admitted.specificationDigest,
    realizations: [{ type: "ArtifactFabricationRealizationEvidence", version: 1, projectionId: "package", evidence }],
    acceptances: [{ type: "ArtifactFabricationRealizationEvidence", version: 1, acceptanceObligationId: "accept", evidence }],
  };
  for (const [index, invalid] of malformed.entries()) {
    assert.equal(admitArtifactFabricationRealizationPlan(invalid, plan).code,
                 "INVALID_SPECIFICATION", `plan case ${index}`);
    assert.equal(admitArtifactFabricationRealizationReceipt(invalid, receipt).code,
                 "INVALID_SPECIFICATION", `receipt case ${index}`);
  }
  // The normal admitted specification still supports both structural consumers.
  assert.equal(admitArtifactFabricationRealizationPlan(admitted, plan).type,
               "ArtifactFabricationRealizationPlan");
  assert.equal(admitArtifactFabricationRealizationReceipt(admitted, receipt).type,
               "ArtifactFabricationRealizationReceipt");
  // These are structural Data admissions; they cannot attest to running a
  // compiler/printer/renderer, verifying the referenced bytes, or customer use.
});

test("admission is idempotent: an admitted version 2 specification re-admits to itself, and a false grounding is refused", () => {
  const value = candidate();
  value.claims.push(conjectureClaim(), { ...derivedClaim(), id: "fill-rate", quantity: { type: "ArtifactFabricationQuantity", value: 0.5, unit: "ratio" }, basis: { ...derivedClaim().basis, premises: [{ type: "ArtifactFabricationPremise", kind: "claim", ref: "queue-share" }] } });
  value.acceptanceObligations.push(assay());
  value.traceability[0].acceptanceObligationIds.push("measure-queue");
  const admitted = refusalOf(value);
  assert.equal(admitted.type, "ArtifactFabricationSpecification", admitted.message);
  const { specificationDigest, type, ...rest } = admitted;
  const again = admitArtifactFabricationSpecification({ type: "ArtifactFabricationSpecificationCandidate", ...rest });
  assert.equal(again.specificationDigest, specificationDigest);
  const lie = structuredClone({ type: "ArtifactFabricationSpecificationCandidate", ...rest });
  lie.claims.find(({ id }) => id === "fill-rate").groundedOn = [];
  assert.equal(admitArtifactFabricationSpecification(lie).code, "GROUNDING_MISMATCH");
});

test("code spans are scanned: identifiers, versions and dates pass; parameters need a claim", () => {
  for (const span of ["sha256", "utf8", "v24", "RFC 8949", "ISO 8601", "0.7.0", "v1.2.3-rc.1", "2026-10-19", "/api/v2/markets", "eavt-services-section", "\"depth\""]) {
    const value = candidate(); value.requirements[0].statement = `The gate shall halt within {{halt}} per \`${span}\``;
    const r = refusalOf(value); assert.equal(r.type, "ArtifactFabricationSpecification", `${span}: ${r.code} ${r.message}`);
  }
  for (const span of ["per_page=50", "limit: 500", "\"limit\": 50", "50", "10,000", "x >= 3", "limit<10", "60 * 5", "2 + 3", "depth==4"]) {
    assertRefused((v) => { v.requirements[0].statement = `The gate shall page with \`${span}\``; }, "PARAMETER_WITHOUT_CLAIM");
  }
  assertRefused((v) => { v.acceptanceObligations[0].statement = "Verify `retries=3` halts"; }, "PARAMETER_WITHOUT_CLAIM");
  assert.equal(codeSpanIsParameter("per_page=50"), true);
  assert.equal(codeSpanIsParameter("sha256"), false);
  assert.equal(firstBareNumber("page with `per_page=50`"), "per_page=50");
  assert.equal(firstBareNumber("use `utf8` and {{n}}"), null);
});

test("the epistemic-debt finder scans code spans the same way", () => {
  const value = candidate(); value.version = 1;
  value.requirements = [{ statement: "Page with `per_page=50`" }, { statement: "Digest with `sha256`" }];
  const debt = findArtifactFabricationEpistemicDebt(value);
  assert.deepEqual(debt.filter((d) => d.code === "PARAMETER_WITHOUT_CLAIM").map((d) => d.path), ["requirements[0].statement"]);
});
