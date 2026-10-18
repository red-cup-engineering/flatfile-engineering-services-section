import { semanticId } from "@red-cup-engineering/semiotic-content-address";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

class Refusal extends Error {
  constructor(code, message, path = null) {
    super(message);
    this.code = code;
    this.path = path;
  }
}

function refuse(code, message, path = null) { throw new Refusal(code, message, path); }
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function json(value) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(json);
  return record(value) && Object.values(value).every(json);
}
function freeze(value) {
  if (Array.isArray(value)) for (const item of value) freeze(item);
  else if (record(value)) for (const item of Object.values(value)) freeze(item);
  return Object.freeze(value);
}
function exact(value, keys, path) {
  if (!record(value)) refuse("INVALID_RECORD", `${path} must be a plain JSON record`, path);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse("UNEXPECTED_FIELDS", `${path} must carry exactly: ${expected.join(", ")}`, path);
  }
}
function text(value, path) {
  if (typeof value !== "string" || value.length === 0 || /[\r\n]/u.test(value)) refuse("INVALID_TEXT", `${path} must be nonempty single-line text`, path);
  return value;
}
function id(value, path) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]*$/u.test(value)) refuse("INVALID_ID", `${path} must be a lowercase hyphenated identifier`, path);
  return value;
}
function span(value, path) {
  exact(value, ["type", "startLine", "endLine"], path);
  if (value.type !== "ArtifactFabricationSourceSpan" || !Number.isSafeInteger(value.startLine) || !Number.isSafeInteger(value.endLine) || value.startLine < 1 || value.endLine < value.startLine) {
    refuse("INVALID_SOURCE_SPAN", `${path} must be ArtifactFabricationSourceSpan@positive-line-range`, path);
  }
  return { type: "ArtifactFabricationSourceSpan", startLine: value.startLine, endLine: value.endLine };
}
function source(value) {
  exact(value, ["type", "version", "identity", "provenance"], "source");
  if (value.type !== "ArtifactFabricationSource" || value.version !== 1) refuse("INVALID_SOURCE", "source must be ArtifactFabricationSource@1", "source");
  exact(value.identity, ["type", "id"], "source.identity");
  if (value.identity.type !== "ArtifactFabricationSourceIdentity") refuse("INVALID_SOURCE_IDENTITY", "source.identity must be ArtifactFabricationSourceIdentity", "source.identity");
  exact(value.provenance, ["type", "locator", "digest", "sourceSpan"], "source.provenance");
  if (value.provenance.type !== "ArtifactFabricationSourceProvenance") refuse("INVALID_SOURCE_PROVENANCE", "source.provenance must be ArtifactFabricationSourceProvenance", "source.provenance");
  if (typeof value.provenance.digest !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value.provenance.digest)) refuse("INVALID_SOURCE_DIGEST", "source.provenance.digest must be a lowercase SHA-256 digest", "source.provenance.digest");
  return { type: "ArtifactFabricationSource", version: 1, identity: { type: "ArtifactFabricationSourceIdentity", id: text(value.identity.id, "source.identity.id") }, provenance: { type: "ArtifactFabricationSourceProvenance", locator: text(value.provenance.locator, "source.provenance.locator"), digest: value.provenance.digest, sourceSpan: span(value.provenance.sourceSpan, "source.provenance.sourceSpan") } };
}
function artifact(value) {
  exact(value, ["type", "version", "id", "kind"], "artifact");
  if (value.type !== "FabricatedArtifactIdentity" || value.version !== 1) refuse("INVALID_ARTIFACT", "artifact must be FabricatedArtifactIdentity@1", "artifact");
  return { type: "FabricatedArtifactIdentity", version: 1, id: id(value.id, "artifact.id"), kind: text(value.kind, "artifact.kind") };
}
function clauses(value, name, type, statementKey, required) {
  if (!Array.isArray(value) || (required && value.length === 0)) refuse("MISSING_CLAUSES", `${name} must contain ${required ? "at least one" : "a"} clause array`, name);
  const seen = new Set();
  return value.map((item, index) => {
    const path = `${name}[${index}]`; exact(item, ["type", "version", "id", statementKey, "sourceSpan"], path);
    if (item.type !== type || item.version !== 1) refuse("INVALID_CLAUSE", `${path} must be ${type}@1`, path);
    const clauseId = id(item.id, `${path}.id`); if (seen.has(clauseId)) refuse("DUPLICATE_CLAUSE_ID", `${name} repeats ${clauseId}`, path); seen.add(clauseId);
    return { type, version: 1, id: clauseId, [statementKey]: text(item[statementKey], `${path}.${statementKey}`), sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function questions(value) {
  if (!Array.isArray(value)) refuse("INVALID_OPEN_QUESTIONS", "openQuestions must be an array", "openQuestions");
  const seen = new Set();
  return value.map((item, index) => {
    const path = `openQuestions[${index}]`; exact(item, ["type", "version", "id", "question", "blocking", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationOpenQuestion" || item.version !== 1 || typeof item.blocking !== "boolean") refuse("INVALID_OPEN_QUESTION", `${path} must be ArtifactFabricationOpenQuestion@1`, path);
    const questionId = id(item.id, `${path}.id`); if (seen.has(questionId)) refuse("DUPLICATE_OPEN_QUESTION_ID", `openQuestions repeats ${questionId}`, path); seen.add(questionId);
    return { type: "ArtifactFabricationOpenQuestion", version: 1, id: questionId, question: text(item.question, `${path}.question`), blocking: item.blocking, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function constraints(value) {
  if (!Array.isArray(value) || value.length === 0) refuse("MISSING_CONSTRAINTS", "constraints must contain laws and standards", "constraints");
  const seen = new Set(); let laws = 0; let standards = 0;
  const admitted = value.map((item, index) => {
    const path = `constraints[${index}]`; exact(item, ["type", "version", "id", "kind", "authority", "revision", "locator", "applicability", "statement", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationConstraint" || item.version !== 1 || !["law", "standard", "operational"].includes(item.kind)) refuse("INVALID_CONSTRAINT", `${path} must be an ArtifactFabricationConstraint@1 law, standard, or operational constraint`, path);
    const constraintId = id(item.id, `${path}.id`); if (seen.has(constraintId)) refuse("DUPLICATE_CONSTRAINT_ID", `constraints repeats ${constraintId}`, path); seen.add(constraintId);
    if (item.kind === "law") laws += 1;
    if (item.kind === "standard") standards += 1;
    return { type: "ArtifactFabricationConstraint", version: 1, id: constraintId, kind: item.kind, authority: text(item.authority, `${path}.authority`), revision: text(item.revision, `${path}.revision`), locator: text(item.locator, `${path}.locator`), applicability: text(item.applicability, `${path}.applicability`), statement: text(item.statement, `${path}.statement`), sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
  if (laws === 0) refuse("MISSING_LAW", "constraints must name at least one mathematical or structural law", "constraints");
  if (standards === 0) refuse("MISSING_STANDARD", "constraints must name at least one conformance standard", "constraints");
  return admitted;
}
function projections(value) {
  if (!Array.isArray(value) || value.length === 0) refuse("MISSING_PROJECTIONS", "projections must contain at least one target", "projections");
  const seen = new Set();
  return value.map((item, index) => {
    const path = `projections[${index}]`; exact(item, ["type", "version", "id", "target", "configuration", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationProjection" || item.version !== 1 || !json(item.configuration)) refuse("INVALID_PROJECTION", `${path} must be ArtifactFabricationProjection@1 with JSON configuration`, path);
    const projectionId = id(item.id, `${path}.id`); if (seen.has(projectionId)) refuse("DUPLICATE_PROJECTION_ID", `projections repeats ${projectionId}`, path); seen.add(projectionId);
    return { type: "ArtifactFabricationProjection", version: 1, id: projectionId, target: text(item.target, `${path}.target`), configuration: item.configuration, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function obligations(value) {
  if (!Array.isArray(value) || value.length === 0) refuse("MISSING_ACCEPTANCE_OBLIGATIONS", "acceptanceObligations must contain at least one obligation", "acceptanceObligations");
  const seen = new Set();
  return value.map((item, index) => {
    const path = `acceptanceObligations[${index}]`; exact(item, ["type", "version", "id", "kind", "statement", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationAcceptanceObligation" || item.version !== 1 || !["test", "assay", "review"].includes(item.kind)) refuse("INVALID_ACCEPTANCE_OBLIGATION", `${path} must be a test, assay, or review obligation`, path);
    const obligationId = id(item.id, `${path}.id`); if (seen.has(obligationId)) refuse("DUPLICATE_ACCEPTANCE_OBLIGATION_ID", `acceptanceObligations repeats ${obligationId}`, path); seen.add(obligationId);
    return { type: "ArtifactFabricationAcceptanceObligation", version: 1, id: obligationId, kind: item.kind, statement: text(item.statement, `${path}.statement`), sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function traceability(value, clauseIds, constraintIds, projectionIds, obligationIds) {
  if (!Array.isArray(value) || value.length !== clauseIds.size) refuse("INCOMPLETE_TRACEABILITY", "traceability must contain exactly one trace for every requirement and prohibition", "traceability");
  const seen = new Set();
  return value.map((item, index) => {
    const path = `traceability[${index}]`; exact(item, ["type", "version", "requirementId", "constraintIds", "projectionIds", "acceptanceObligationIds"], path);
    if (item.type !== "ArtifactFabricationTrace" || item.version !== 1 || !clauseIds.has(item.requirementId)) refuse("UNKNOWN_CLAUSE_ID", `${path}.requirementId must name a settled requirement or prohibition`, path);
    if (seen.has(item.requirementId)) refuse("DUPLICATE_TRACE", `${path} repeats ${item.requirementId}`, path); seen.add(item.requirementId);
    if (!Array.isArray(item.constraintIds) || item.constraintIds.length === 0 || !Array.isArray(item.projectionIds) || item.projectionIds.length === 0 || !Array.isArray(item.acceptanceObligationIds) || item.acceptanceObligationIds.length === 0) refuse("INCOMPLETE_TRACE", `${path} must name basis constraints, projections, and acceptance obligations`, path);
    const unique = (ids, known, field) => {
      const values = new Set(); for (const itemId of ids) { if (typeof itemId !== "string" || !known.has(itemId)) refuse("UNKNOWN_TRACE_REFERENCE", `${path}.${field} names an unknown id`, path); if (values.has(itemId)) refuse("DUPLICATE_TRACE_REFERENCE", `${path}.${field} repeats ${itemId}`, path); values.add(itemId); } return [...values].sort();
    };
    return { type: "ArtifactFabricationTrace", version: 1, requirementId: item.requirementId, constraintIds: unique(item.constraintIds, constraintIds, "constraintIds"), projectionIds: unique(item.projectionIds, projectionIds, "projectionIds"), acceptanceObligationIds: unique(item.acceptanceObligationIds, obligationIds, "acceptanceObligationIds") };
  });
}
/*
 * Epistemic law of the fabrication chain (version 2 candidates; the specification of 2026-10-18,
 * "epistemic claims in artifact fabrication"). A conjecture is never a reason: every claim a
 * requirement, restriction, parameter or acceptance obligation rests on is measured (dataset
 * locator, digest, derivation), derived (premises, derivation) or conjectured (hypothesis,
 * measurement plan, best estimate). Every number in a clause names its claim or a definitionally
 * exact unit or constant. A dependency, API or behavior is only ever a measured claim.
 */
const EPISTEMIC_STATUSES = ["measured", "derived", "conjectured"];
const CLAIM_KINDS = ["parameter", "world", "dependency", "api", "behavior"];
const IMPLEMENTATION_CLAIM_KINDS = new Set(["dependency", "api", "behavior"]);
const PREMISE_KINDS = ["claim", "requirement", "constraint", "citation"];
/** Units and constants that are exact by definition; the only numbers a clause may carry without a claim. */
export const DEFINITIONALLY_EXACT_PARAMETERS = Object.freeze({
  "seconds-per-minute": Object.freeze({ value: 60, unit: "s/min" }),
  "minutes-per-hour": Object.freeze({ value: 60, unit: "min/h" }),
  "hours-per-day": Object.freeze({ value: 24, unit: "h/d" }),
  "seconds-per-day": Object.freeze({ value: 86400, unit: "s/d" }),
  "cents-per-dollar": Object.freeze({ value: 100, unit: "cent/USD" }),
  "percent-denominator": Object.freeze({ value: 100, unit: "percent" }),
});
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const NUMERIC_LITERAL = /(?<![A-Za-z0-9_.\-§#@/:{])\d[\d,]*(?:\.\d+)?%?(?![A-Za-z0-9_}])/u;
function contentDigest(value) { return typeof value === "string" && (SHA256.test(value) || isNiUri(value)); }
function textOrNull(value) { return typeof value === "string" && value.length > 0 && !/[\r\n]/u.test(value); }
function ids(value) { return Array.isArray(value) ? value.map((item) => (record(item) ? item.id : undefined)).filter((item) => typeof item === "string") : []; }

function measuredBasis(basis, path) {
  const bad = (what) => refuse("MEASURED_CLAIM_WITHOUT_EVIDENCE", `${path} is measured and must carry ${what}`, path);
  if (!record(basis) || basis.type !== "ArtifactFabricationMeasuredBasis") bad("an ArtifactFabricationMeasuredBasis (dataset locator, content digest, derivation)");
  if (!textOrNull(basis.locator)) bad("the dataset locator");
  if (!contentDigest(basis.digest)) bad("a content digest (sha256 or ni) of the dataset");
  if (!textOrNull(basis.derivation)) bad("the derivation that produced the value");
  exact(basis, ["type", "locator", "digest", "derivation"], path);
  return { type: basis.type, locator: basis.locator, digest: basis.digest, derivation: basis.derivation };
}
function derivedBasis(basis, path) {
  const bad = (what) => refuse("DERIVED_CLAIM_WITHOUT_PREMISES", `${path} is derived and must carry ${what}`, path);
  if (!record(basis) || basis.type !== "ArtifactFabricationDerivedBasis") bad("an ArtifactFabricationDerivedBasis (premises, derivation)");
  if (!Array.isArray(basis.premises) || basis.premises.length === 0) bad("at least one premise");
  if (!textOrNull(basis.derivation)) bad("the derivation from its premises");
  exact(basis, ["type", "premises", "derivation"], path);
  const premises = basis.premises.map((premise, index) => {
    const premisePath = `${path}.premises[${index}]`; exact(premise, ["type", "kind", "ref"], premisePath);
    if (premise.type !== "ArtifactFabricationPremise" || !PREMISE_KINDS.includes(premise.kind)) refuse("INVALID_PREMISE", `${premisePath} must be an ArtifactFabricationPremise of kind ${PREMISE_KINDS.join(", ")}`, premisePath);
    return { type: premise.type, kind: premise.kind, ref: text(premise.ref, `${premisePath}.ref`) };
  });
  return { type: basis.type, premises, derivation: basis.derivation };
}
function conjecturedBasis(basis, path) {
  const bad = (what) => refuse("CONJECTURE_WITHOUT_MEASUREMENT_PLAN", `${path} is conjectured and must carry ${what}`, path);
  if (!record(basis) || basis.type !== "ArtifactFabricationConjecturedBasis") bad("an ArtifactFabricationConjecturedBasis (hypothesis, measurement plan, estimate derivation)");
  if (!textOrNull(basis.hypothesis)) bad("the hypothesis");
  const plan = basis.measurementPlan;
  if (!record(plan) || plan.type !== "ArtifactFabricationMeasurementPlan" || !textOrNull(plan.observable) || !textOrNull(plan.instrument) || !textOrNull(plan.decisionRule)) bad("a measurement plan naming its observable, its receiver or instrument and the decision rule the measurement settles");
  exact(plan, ["type", "observable", "instrument", "decisionRule"], `${path}.measurementPlan`);
  if (!textOrNull(basis.estimateDerivation)) refuse("CONJECTURE_WITHOUT_ESTIMATE", `${path} is conjectured and work proceeds on its best derived estimate, so it must carry the estimate's derivation`, path);
  exact(basis, ["type", "hypothesis", "measurementPlan", "estimateDerivation"], path);
  return { type: basis.type, hypothesis: basis.hypothesis, measurementPlan: { type: plan.type, observable: plan.observable, instrument: plan.instrument, decisionRule: plan.decisionRule }, estimateDerivation: basis.estimateDerivation };
}
function quantity(value, path) {
  if (value === null) return null;
  exact(value, ["type", "value", "unit"], path);
  if (value.type !== "ArtifactFabricationQuantity" || typeof value.value !== "number" || !Number.isFinite(value.value)) refuse("INVALID_QUANTITY", `${path} must be null or an ArtifactFabricationQuantity with a finite value`, path);
  return { type: value.type, value: value.value, unit: text(value.unit, `${path}.unit`) };
}
/** Admits the typed claims and resolves each claim's transitive grounding in conjecture (`groundedOn`). */
function claimsOf(value, premiseIds) {
  if (!Array.isArray(value)) refuse("INVALID_CLAIMS", "claims must be an array", "claims");
  const seen = new Set();
  const admitted = value.map((item, index) => {
    const path = `claims[${index}]`; exact(item, ["type", "version", "id", "kind", "statement", "status", "quantity", "basis", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationClaim" || item.version !== 1 || !CLAIM_KINDS.includes(item.kind)) refuse("INVALID_CLAIM", `${path} must be ArtifactFabricationClaim@1 of kind ${CLAIM_KINDS.join(", ")}`, path);
    if (!EPISTEMIC_STATUSES.includes(item.status)) refuse("INVALID_EPISTEMIC_STATUS", `${path}.status must be measured, derived or conjectured`, `${path}.status`);
    const claimId = id(item.id, `${path}.id`); if (seen.has(claimId)) refuse("DUPLICATE_CLAIM_ID", `claims repeats ${claimId}`, path); seen.add(claimId);
    if (IMPLEMENTATION_CLAIM_KINDS.has(item.kind) && item.status !== "measured") refuse("IMPLEMENTATION_CLAIM_NOT_MEASURED", `${path} claims a ${item.kind}; a dependency, API or behavior is backed by an observed artifact (registry version, API response, test run), never asserted`, path);
    const basis = item.status === "measured" ? measuredBasis(item.basis, `${path}.basis`) : item.status === "derived" ? derivedBasis(item.basis, `${path}.basis`) : conjecturedBasis(item.basis, `${path}.basis`);
    return { type: "ArtifactFabricationClaim", version: 1, id: claimId, kind: item.kind, statement: text(item.statement, `${path}.statement`), status: item.status, quantity: quantity(item.quantity, `${path}.quantity`), basis, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
  const byId = new Map(admitted.map((claim) => [claim.id, claim]));
  for (const claim of admitted) {
    if (claim.status !== "derived") continue;
    claim.basis.premises.forEach((premise, index) => {
      const known = premise.kind === "claim" ? byId.has(premise.ref) : premise.kind === "requirement" ? premiseIds.requirements.has(premise.ref) : premise.kind === "constraint" ? premiseIds.constraints.has(premise.ref) : true;
      if (!known) refuse("UNKNOWN_PREMISE_REFERENCE", `claims.${claim.id}.basis.premises[${index}] names no ${premise.kind} ${premise.ref}`, `claims.${claim.id}`);
    });
  }
  const grounding = new Map(); const visiting = new Set();
  const ground = (claim) => {
    if (grounding.has(claim.id)) return grounding.get(claim.id);
    if (visiting.has(claim.id)) refuse("CIRCULAR_DERIVATION", `claim ${claim.id} is derived from itself`, `claims.${claim.id}`);
    visiting.add(claim.id); let result;
    if (claim.status === "conjectured") result = new Set([claim.id]);
    else if (claim.status === "measured") result = new Set();
    else { result = new Set(); for (const premise of claim.basis.premises) if (premise.kind === "claim") for (const root of ground(byId.get(premise.ref))) result.add(root); }
    visiting.delete(claim.id); grounding.set(claim.id, result); return result;
  };
  return admitted.map((claim) => ({ ...claim, groundedOn: [...ground(claim)].sort() }));
}
function claimReferences(value, path, claims) {
  if (!Array.isArray(value)) refuse("INVALID_CLAIM_REFERENCES", `${path}.claimIds must be an array`, `${path}.claimIds`);
  const seen = new Set();
  for (const claimId of value) {
    if (typeof claimId !== "string" || !claims.has(claimId)) refuse("UNKNOWN_CLAIM_REFERENCE", `${path}.claimIds names no admitted claim`, `${path}.claimIds`);
    if (seen.has(claimId)) refuse("DUPLICATE_CLAIM_REFERENCE", `${path}.claimIds repeats ${claimId}`, `${path}.claimIds`);
    seen.add(claimId);
  }
  return [...seen].sort();
}
function parametersOf(value, path, claims) {
  if (!Array.isArray(value)) refuse("INVALID_PARAMETERS", `${path}.parameters must be an array`, `${path}.parameters`);
  const seen = new Set();
  return value.map((item, index) => {
    const here = `${path}.parameters[${index}]`; exact(item, ["type", "version", "name", "value", "unit", "claimId", "exact"], here);
    if (item.type !== "ArtifactFabricationParameter" || item.version !== 1 || typeof item.value !== "number" || !Number.isFinite(item.value)) refuse("INVALID_PARAMETER", `${here} must be ArtifactFabricationParameter@1 with a finite value`, here);
    const name = id(item.name, `${here}.name`); if (seen.has(name)) refuse("DUPLICATE_PARAMETER_NAME", `${path}.parameters repeats ${name}`, here); seen.add(name);
    const unit = text(item.unit, `${here}.unit`);
    if ((item.claimId === null) === (item.exact === null)) refuse("PARAMETER_WITHOUT_CLAIM", `${here} must reference exactly one claim, or name one definitionally exact unit or constant; a bare number is refused`, here);
    if (item.claimId !== null) {
      const claim = typeof item.claimId === "string" ? claims.get(item.claimId) : undefined;
      if (!claim) refuse("UNKNOWN_CLAIM_REFERENCE", `${here}.claimId names no admitted claim`, here);
      if (claim.quantity === null || claim.quantity.value !== item.value || claim.quantity.unit !== unit) refuse("PARAMETER_CLAIM_MISMATCH", `${here} must equal the quantity its claim ${claim.id} carries`, here);
    } else {
      const definition = DEFINITIONALLY_EXACT_PARAMETERS[item.exact];
      if (!definition || definition.value !== item.value || definition.unit !== unit) refuse("EXACT_PARAMETER_MISMATCH", `${here}.exact must name a definitionally exact unit or constant and carry its exact value and unit`, here);
    }
    return { type: "ArtifactFabricationParameter", version: 1, name, value: item.value, unit, claimId: item.claimId, exact: item.exact };
  });
}
/** Refuses a numeric literal in a clause statement; a number enters only as a declared `{{parameter}}`. */
function statementWithoutBareNumbers(statement, parameters, path) {
  const declared = new Set(parameters.map(({ name }) => name));
  for (const [, name] of statement.matchAll(/\{\{([^{}]*)\}\}/gu)) if (!declared.has(name)) refuse("UNKNOWN_PARAMETER_PLACEHOLDER", `${path} places {{${name}}} but declares no such parameter`, path);
  const bare = statement.replace(/\{\{[^{}]*\}\}/gu, " ").replace(/`[^`\n]*`/gu, " ");
  const literal = NUMERIC_LITERAL.exec(bare);
  if (literal) refuse("PARAMETER_WITHOUT_CLAIM", `${path} carries the bare number ${literal[0]}; declare it as a parameter that references a claim`, path);
  return statement;
}
function epistemicItem(item, path, claims, { statementKey, restriction, scan = true }) {
  const parameters = parametersOf(item.parameters, path, claims); const claimIds = claimReferences(item.claimIds, path, claims);
  if (scan) statementWithoutBareNumbers(item[statementKey], parameters, `${path}.${statementKey}`);
  if (restriction) {
    if (claimIds.length === 0) refuse("RESTRICTION_WITHOUT_CLAIM", `${path} refuses, narrows or constrains work and must name the claims it rests on`, path);
    if (claimIds.every((claimId) => claims.get(claimId).groundedOn.length > 0)) refuse("RESTRICTION_GROUNDED_ON_CONJECTURE", `${path} rests only on conjecture; a conjecture motivates a measurement and is never the sole ground for refusing or narrowing work`, path);
  }
  return { parameters, claimIds };
}
function clausesV2(value, name, type, required, claims) {
  if (!Array.isArray(value) || (required && value.length === 0)) refuse("MISSING_CLAUSES", `${name} must contain ${required ? "at least one" : "a"} clause array`, name);
  const seen = new Set();
  return value.map((item, index) => {
    const path = `${name}[${index}]`; exact(item, ["type", "version", "id", "statement", "parameters", "claimIds", "sourceSpan"], path);
    if (item.type !== type || item.version !== 2) refuse("INVALID_CLAUSE", `${path} must be ${type}@2`, path);
    const clauseId = id(item.id, `${path}.id`); if (seen.has(clauseId)) refuse("DUPLICATE_CLAUSE_ID", `${name} repeats ${clauseId}`, path); seen.add(clauseId);
    const statement = text(item.statement, `${path}.statement`);
    const { parameters, claimIds } = epistemicItem({ ...item, statement }, path, claims, { statementKey: "statement", restriction: type === "ArtifactFabricationProhibition" });
    return { type, version: 2, id: clauseId, statement, parameters, claimIds, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function questionsV2(value, claims) {
  if (!Array.isArray(value)) refuse("INVALID_OPEN_QUESTIONS", "openQuestions must be an array", "openQuestions");
  const seen = new Set();
  const admitted = value.map((item, index) => {
    const path = `openQuestions[${index}]`; exact(item, ["type", "version", "id", "question", "blocking", "claimId", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationOpenQuestion" || item.version !== 2 || typeof item.blocking !== "boolean") refuse("INVALID_OPEN_QUESTION", `${path} must be ArtifactFabricationOpenQuestion@2`, path);
    const questionId = id(item.id, `${path}.id`); if (seen.has(questionId)) refuse("DUPLICATE_OPEN_QUESTION_ID", `openQuestions repeats ${questionId}`, path); seen.add(questionId);
    if (item.claimId !== null && (typeof item.claimId !== "string" || !claims.has(item.claimId))) refuse("UNKNOWN_CLAIM_REFERENCE", `${path}.claimId must be null or name an admitted claim`, path);
    return { type: "ArtifactFabricationOpenQuestion", version: 2, id: questionId, question: text(item.question, `${path}.question`), blocking: item.blocking, claimId: item.claimId, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
  for (const question of admitted) {
    if (question.blocking && question.claimId !== null && claims.get(question.claimId).groundedOn.length > 0) refuse("BLOCKED_ON_MEASURABLE_CONJECTURE", `open question ${question.id} blocks on a conjecture that can be measured; make it a non-blocking measurement obligation and proceed on the best derived estimate`, `openQuestions.${question.id}`);
  }
  const blocking = admitted.find((question) => question.blocking); if (blocking) refuse("BLOCKING_OPEN_QUESTION", `open question ${blocking.id} blocks fabrication`, `openQuestions.${blocking.id}`);
  return admitted;
}
function constraintsV2(value, claims) {
  if (!Array.isArray(value) || value.length === 0) refuse("MISSING_CONSTRAINTS", "constraints must contain laws and standards", "constraints");
  const seen = new Set(); let laws = 0; let standards = 0;
  const admitted = value.map((item, index) => {
    const path = `constraints[${index}]`; exact(item, ["type", "version", "id", "kind", "authority", "revision", "locator", "applicability", "statement", "parameters", "claimIds", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationConstraint" || item.version !== 2 || !["law", "standard", "operational"].includes(item.kind)) refuse("INVALID_CONSTRAINT", `${path} must be an ArtifactFabricationConstraint@2 law, standard, or operational constraint`, path);
    const constraintId = id(item.id, `${path}.id`); if (seen.has(constraintId)) refuse("DUPLICATE_CONSTRAINT_ID", `constraints repeats ${constraintId}`, path); seen.add(constraintId);
    if (item.kind === "law") laws += 1;
    if (item.kind === "standard") standards += 1;
    const statement = text(item.statement, `${path}.statement`);
    // A law or standard cites an external authority and revision; only an operational constraint authors numbers.
    const { parameters, claimIds } = epistemicItem({ ...item, statement }, path, claims, { statementKey: "statement", restriction: item.kind === "operational", scan: item.kind === "operational" });
    return { type: "ArtifactFabricationConstraint", version: 2, id: constraintId, kind: item.kind, authority: text(item.authority, `${path}.authority`), revision: text(item.revision, `${path}.revision`), locator: text(item.locator, `${path}.locator`), applicability: text(item.applicability, `${path}.applicability`), statement, parameters, claimIds, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
  if (laws === 0) refuse("MISSING_LAW", "constraints must name at least one mathematical or structural law", "constraints");
  if (standards === 0) refuse("MISSING_STANDARD", "constraints must name at least one conformance standard", "constraints");
  return admitted;
}
function obligationsV2(value, claims) {
  if (!Array.isArray(value) || value.length === 0) refuse("MISSING_ACCEPTANCE_OBLIGATIONS", "acceptanceObligations must contain at least one obligation", "acceptanceObligations");
  const seen = new Set();
  return value.map((item, index) => {
    const path = `acceptanceObligations[${index}]`; exact(item, ["type", "version", "id", "kind", "statement", "parameters", "claimIds", "sourceSpan"], path);
    if (item.type !== "ArtifactFabricationAcceptanceObligation" || item.version !== 2 || !["test", "assay", "review"].includes(item.kind)) refuse("INVALID_ACCEPTANCE_OBLIGATION", `${path} must be a test, assay, or review obligation at version 2`, path);
    const obligationId = id(item.id, `${path}.id`); if (seen.has(obligationId)) refuse("DUPLICATE_ACCEPTANCE_OBLIGATION_ID", `acceptanceObligations repeats ${obligationId}`, path); seen.add(obligationId);
    const statement = text(item.statement, `${path}.statement`);
    const { parameters, claimIds } = epistemicItem({ ...item, statement }, path, claims, { statementKey: "statement", restriction: false });
    return { type: "ArtifactFabricationAcceptanceObligation", version: 2, id: obligationId, kind: item.kind, statement, parameters, claimIds, sourceSpan: span(item.sourceSpan, `${path}.sourceSpan`) };
  });
}
function admitSpecificationV2(candidate) {
  exact(candidate, ["type", "version", "source", "artifact", "claims", "requirements", "prohibitions", "openQuestions", "constraints", "projections", "acceptanceObligations", "traceability"], "candidate");
  if (candidate.type !== "ArtifactFabricationSpecificationCandidate") refuse("INVALID_CANDIDATE", "candidate must be ArtifactFabricationSpecificationCandidate@2", "candidate");
  const claimList = claimsOf(candidate.claims, { requirements: new Set(ids(candidate.requirements)), constraints: new Set(ids(candidate.constraints)) });
  const claims = new Map(claimList.map((claim) => [claim.id, claim]));
  const requirements = clausesV2(candidate.requirements, "requirements", "ArtifactFabricationRequirement", true, claims);
  const prohibitions = clausesV2(candidate.prohibitions, "prohibitions", "ArtifactFabricationProhibition", false, claims);
  const clauseIds = new Set(); for (const clause of [...requirements, ...prohibitions]) { if (clauseIds.has(clause.id)) refuse("DUPLICATE_CLAUSE_ID", `settled clauses repeat ${clause.id}`, "candidate"); clauseIds.add(clause.id); }
  const openQuestions = questionsV2(candidate.openQuestions, claims);
  const admitted = { type: "ArtifactFabricationSpecification", version: 2, source: source(candidate.source), artifact: artifact(candidate.artifact), claims: claimList, requirements, prohibitions, openQuestions, constraints: constraintsV2(candidate.constraints, claims), projections: projections(candidate.projections), acceptanceObligations: obligationsV2(candidate.acceptanceObligations, claims) };
  const scheduled = new Set([...admitted.acceptanceObligations.filter(({ kind }) => kind === "assay").flatMap(({ claimIds }) => claimIds), ...openQuestions.map(({ claimId }) => claimId).filter((claimId) => claimId !== null)]);
  for (const claim of claimList) if (claim.status === "conjectured" && !scheduled.has(claim.id)) refuse("CONJECTURE_WITHOUT_MEASUREMENT_OBLIGATION", `conjecture ${claim.id} is named by no assay obligation and no non-blocking open question, so no measurement is scheduled`, `claims.${claim.id}`);
  admitted.traceability = traceability(candidate.traceability, clauseIds, new Set(admitted.constraints.map(({ id: value }) => value)), new Set(admitted.projections.map(({ id: value }) => value)), new Set(admitted.acceptanceObligations.map(({ id: value }) => value)));
  admitted.specificationDigest = semanticId(admitted);
  return freeze(admitted);
}
/** Counts an admitted version 2 specification's claims by epistemic status, and those that rest on conjecture. */
export function summarizeArtifactFabricationClaims(specification) {
  const claims = record(specification) && Array.isArray(specification.claims) ? specification.claims : [];
  const count = (status) => claims.filter((claim) => claim.status === status).length;
  return Object.freeze({ measured: count("measured"), derived: count("derived"), conjectured: count("conjectured"), derivedOnConjecture: claims.filter((claim) => claim.status === "derived" && claim.groundedOn.length > 0).length });
}
/** Lists, without refusing, what a version 1 candidate would be refused for at version 2: its migration debt. */
export function findArtifactFabricationEpistemicDebt(candidate) {
  const debt = [];
  const scan = (items, name, restriction) => {
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      if (!record(item) || (name === "constraints" && item.kind !== "operational")) return;
      const path = `${name}[${index}]`;
      if (typeof item.statement === "string" && NUMERIC_LITERAL.test(item.statement.replace(/`[^`\n]*`/gu, " "))) debt.push({ code: "PARAMETER_WITHOUT_CLAIM", path: `${path}.statement` });
      if (restriction) debt.push({ code: "RESTRICTION_WITHOUT_CLAIM", path });
    });
  };
  if (record(candidate)) { scan(candidate.requirements, "requirements", false); scan(candidate.prohibitions, "prohibitions", true); scan(candidate.constraints, "constraints", true); scan(candidate.acceptanceObligations, "acceptanceObligations", false); }
  return Object.freeze(debt);
}
function admittedSpecification(specification) {
  if (!record(specification) || specification.type !== "ArtifactFabricationSpecification" || ![1, 2].includes(specification.version) || typeof specification.specificationDigest !== "string") refuse("INVALID_SPECIFICATION", "specification must be an admitted ArtifactFabricationSpecification@1 or @2", "specification");
}
function refusal(error, type) {
  if (error instanceof Refusal) return freeze({ type, version: 1, code: error.code, message: error.message, path: error.path });
  throw error;
}

/**
 * Admits a closed-world, language-neutral artifact fabrication specification without ambient I/O.
 * Version 2 candidates carry typed epistemic claims and bind the epistemic law; version 1 candidates
 * are the legacy unclaimed form, admitted unchanged (same record, same digest) until their producers migrate.
 */
export function admitArtifactFabricationSpecification(candidate) {
  try {
    if (record(candidate) && candidate.version === 2) return admitSpecificationV2(candidate);
    if (record(candidate) && typeof candidate.version === "number" && candidate.version !== 1) refuse("UNSUPPORTED_CANDIDATE_VERSION", "candidate version must be 1 (legacy, unclaimed) or 2 (epistemic claims)", "candidate");
    exact(candidate, ["type", "version", "source", "artifact", "requirements", "prohibitions", "openQuestions", "constraints", "projections", "acceptanceObligations", "traceability"], "candidate");
    if (candidate.type !== "ArtifactFabricationSpecificationCandidate" || candidate.version !== 1) refuse("INVALID_CANDIDATE", "candidate must be ArtifactFabricationSpecificationCandidate@1", "candidate");
    const requirements = clauses(candidate.requirements, "requirements", "ArtifactFabricationRequirement", "statement", true);
    const prohibitions = clauses(candidate.prohibitions, "prohibitions", "ArtifactFabricationProhibition", "statement", false);
    const clauseIds = new Set(); for (const clause of [...requirements, ...prohibitions]) { if (clauseIds.has(clause.id)) refuse("DUPLICATE_CLAUSE_ID", `settled clauses repeat ${clause.id}`, "candidate"); clauseIds.add(clause.id); }
    const openQuestions = questions(candidate.openQuestions); const blocking = openQuestions.find((question) => question.blocking); if (blocking) refuse("BLOCKING_OPEN_QUESTION", `open question ${blocking.id} blocks fabrication`, `openQuestions.${blocking.id}`);
    const admitted = { type: "ArtifactFabricationSpecification", version: 1, source: source(candidate.source), artifact: artifact(candidate.artifact), requirements, prohibitions, openQuestions, constraints: constraints(candidate.constraints), projections: projections(candidate.projections), acceptanceObligations: obligations(candidate.acceptanceObligations) };
    admitted.traceability = traceability(candidate.traceability, clauseIds, new Set(admitted.constraints.map(({ id: value }) => value)), new Set(admitted.projections.map(({ id: value }) => value)), new Set(admitted.acceptanceObligations.map(({ id: value }) => value)));
    admitted.specificationDigest = semanticId(admitted);
    return freeze(admitted);
  } catch (error) { return refusal(error, "ArtifactFabricationSpecificationRefusal"); }
}

/** Admits an evidence-free, exhaustive realization plan before a fabricator performs effects. */
export function admitArtifactFabricationRealizationPlan(specification, candidate) {
  try {
    admittedSpecification(specification);
    exact(candidate, ["type", "version", "artifactId", "specificationDigest", "projectionIds", "acceptanceObligationIds"], "candidate");
    if (candidate.type !== "ArtifactFabricationRealizationPlanCandidate" || candidate.version !== 1) refuse("INVALID_PLAN_CANDIDATE", "candidate must be ArtifactFabricationRealizationPlanCandidate@1", "candidate");
    if (candidate.artifactId !== specification.artifact.id || candidate.specificationDigest !== specification.specificationDigest) refuse("SPECIFICATION_BINDING_MISMATCH", "plan must bind the admitted artifact id and specification digest", "candidate");
    const coverage = (value, field, known) => {
      if (!Array.isArray(value)) refuse("INVALID_PLAN_COVERAGE", `${field} must be an array`, field);
      const seen = new Set();
      for (const valueId of value) {
        if (typeof valueId !== "string" || !known.has(valueId)) refuse("UNKNOWN_PLAN_REFERENCE", `${field} names an unknown id`, field);
        if (seen.has(valueId)) refuse("DUPLICATE_PLAN_REFERENCE", `${field} repeats ${valueId}`, field);
        seen.add(valueId);
      }
      if (seen.size !== known.size) refuse("INCOMPLETE_PLAN_COVERAGE", `${field} must cover every admitted id`, field);
      return [...seen].sort();
    };
    const projectionIds = coverage(candidate.projectionIds, "projectionIds", new Set(specification.projections.map(({ id: value }) => value)));
    const acceptanceObligationIds = coverage(candidate.acceptanceObligationIds, "acceptanceObligationIds", new Set(specification.acceptanceObligations.map(({ id: value }) => value)));
    return freeze({ type: "ArtifactFabricationRealizationPlan", version: 1, artifactId: specification.artifact.id, specificationDigest: specification.specificationDigest, projectionIds, acceptanceObligationIds, traceability: specification.traceability });
  } catch (error) { return refusal(error, "ArtifactFabricationRealizationPlanRefusal"); }
}

/** Admits evidence that realizes every trace of an admitted artifact fabrication specification. */
export function admitArtifactFabricationRealizationReceipt(specification, candidate) {
  try {
    admittedSpecification(specification);
    exact(candidate, ["type", "version", "artifactId", "specificationDigest", "realizations", "acceptances"], "candidate");
    if (candidate.type !== "ArtifactFabricationRealizationReceiptCandidate" || candidate.version !== 1) refuse("INVALID_RECEIPT_CANDIDATE", "candidate must be ArtifactFabricationRealizationReceiptCandidate@1", "candidate");
    if (candidate.artifactId !== specification.artifact.id || candidate.specificationDigest !== specification.specificationDigest) refuse("SPECIFICATION_BINDING_MISMATCH", "receipt must bind the admitted artifact id and specification digest", "candidate");
    const evidence = (value, path) => { exact(value, ["type", "locator", "digest"], path); if (value.type !== "ArtifactFabricationEvidence" || typeof value.digest !== "string" || !(isNiUri(value.digest) || /^sha256:[a-f0-9]{64}$/u.test(value.digest))) refuse("INVALID_EVIDENCE", `${path} must carry ArtifactFabricationEvidence with a content address or a SHA-256 digest of its bytes`, path); return { type: "ArtifactFabricationEvidence", locator: text(value.locator, `${path}.locator`), digest: value.digest }; };
    const evidenceSet = (value, field, key, known) => { if (!Array.isArray(value)) refuse("INVALID_RECEIPT_EVIDENCE", `${field} must be an array`, field); const seen = new Set(); const result = value.map((item, index) => { const path = `${field}[${index}]`; exact(item, ["type", "version", key, "evidence"], path); if (item.type !== "ArtifactFabricationRealizationEvidence" || item.version !== 1 || !known.has(item[key])) refuse("UNKNOWN_RECEIPT_REFERENCE", `${path} names an unknown ${key}`, path); if (seen.has(item[key])) refuse("DUPLICATE_RECEIPT_EVIDENCE", `${path} repeats ${item[key]}`, path); seen.add(item[key]); return { type: "ArtifactFabricationRealizationEvidence", version: 1, [key]: item[key], evidence: evidence(item.evidence, `${path}.evidence`) }; }); if (seen.size !== known.size) refuse("MISSING_RECEIPT_EVIDENCE", `${field} must cover every admitted ${key}`, field); return result.sort((a, b) => a[key].localeCompare(b[key])); };
    const realizations = evidenceSet(candidate.realizations, "realizations", "projectionId", new Set(specification.projections.map(({ id: value }) => value)));
    const acceptances = evidenceSet(candidate.acceptances, "acceptances", "acceptanceObligationId", new Set(specification.acceptanceObligations.map(({ id: value }) => value)));
    return freeze({ type: "ArtifactFabricationRealizationReceipt", version: 1, artifactId: specification.artifact.id, specificationDigest: specification.specificationDigest, realizations, acceptances, traceability: specification.traceability });
  } catch (error) { return refusal(error, "ArtifactFabricationRealizationReceiptRefusal"); }
}

/*
 * The language-neutral work order of an operation (fabrication line stage 2; the code-fabrication
 * specification of 2026-09-04: a code work order is the meaning-closure, "identity, requirements,
 * prohibitions, laws, standards, input and output schemas, examples, traceability", and MUST NOT
 * carry source or tests). An operation closure states what each operation is, what it takes and
 * returns (JSON Schema), admitted examples as plain data, and exact dependencies named with their
 * ecosystem. It names no file, export, module system or language: those belong to a binding, so one
 * order is fabricated in any language the line has a binding for and its examples hold in every one.
 */

const ECOSYSTEM_VERSION = { npm: /^[0-9]+\.[0-9]+\.[0-9]+$/u, pypi: /^[0-9]+(?:\.[0-9]+)*$/u, racket: /^[0-9]+(?:\.[0-9]+)*$/u, guix: /^[0-9A-Za-z.+-]+$/u };
const schemaValue = (value, path) => { if (typeof value !== "boolean" && !(record(value) && json(value))) refuse("INVALID_SCHEMA", `${path} must be a JSON Schema (object or boolean)`, path); return value; };

/** Admits a language-neutral operation closure, or returns its refusal. */
export function admitOperationMeaningClosure(candidate) {
  try {
    exact(candidate, ["type", "version", "operations", "examples", "dependencies"], "candidate");
    if (candidate.type !== "OperationMeaningClosureCandidate" || candidate.version !== 1) refuse("INVALID_CANDIDATE", "candidate must be OperationMeaningClosureCandidate@1", "candidate");
    if (!Array.isArray(candidate.operations) || candidate.operations.length === 0) refuse("MISSING_OPERATIONS", "operations must name at least one operation", "operations");
    const names = new Set();
    const operations = candidate.operations.map((item, index) => {
      const path = `operations[${index}]`; exact(item, ["name", "description", "inputSchema", "outputSchema"], path);
      const name = id(item.name, `${path}.name`); if (names.has(name)) refuse("DUPLICATE_OPERATION", `operations repeat ${name}`, path); names.add(name);
      return { name, description: text(item.description, `${path}.description`), inputSchema: schemaValue(item.inputSchema, `${path}.inputSchema`), outputSchema: schemaValue(item.outputSchema, `${path}.outputSchema`) };
    });
    if (!Array.isArray(candidate.examples) || candidate.examples.length === 0) refuse("MISSING_EXAMPLES", "examples must admit at least one example", "examples");
    const exampleNames = new Set(); const exemplified = new Set();
    const examples = candidate.examples.map((item, index) => {
      const path = `examples[${index}]`; exact(item, ["name", "operation", "input", "output"], path);
      const name = id(item.name, `${path}.name`); if (exampleNames.has(name)) refuse("DUPLICATE_EXAMPLE", `examples repeat ${name}`, path); exampleNames.add(name);
      if (!names.has(item.operation)) refuse("UNKNOWN_OPERATION", `${path} names an unknown operation`, path); exemplified.add(item.operation);
      if (!json(item.input) || !json(item.output)) refuse("INVALID_EXAMPLE", `${path} input and output must be JSON data`, path);
      return { name, operation: item.operation, input: item.input, output: item.output };
    });
    const unexemplified = operations.find(({ name }) => !exemplified.has(name)); if (unexemplified) refuse("UNEXEMPLIFIED_OPERATION", `operation ${unexemplified.name} has no admitted example`, "examples");
    if (!Array.isArray(candidate.dependencies)) refuse("INVALID_DEPENDENCIES", "dependencies must be an array", "dependencies");
    const seen = new Set();
    const dependencies = candidate.dependencies.map((item, index) => {
      const path = `dependencies[${index}]`; exact(item, ["ecosystem", "name", "version"], path);
      const pattern = ECOSYSTEM_VERSION[item.ecosystem]; if (!pattern) refuse("UNKNOWN_ECOSYSTEM", `${path}.ecosystem must be one of ${Object.keys(ECOSYSTEM_VERSION).join(", ")}`, path);
      const name = text(item.name, `${path}.name`); if (typeof item.version !== "string" || !pattern.test(item.version)) refuse("INEXACT_DEPENDENCY", `${path}.version must be an exact ${item.ecosystem} version`, path);
      const key = `${item.ecosystem}:${name}`; if (seen.has(key)) refuse("DUPLICATE_DEPENDENCY", `dependencies repeat ${key}`, path); seen.add(key);
      return { ecosystem: item.ecosystem, name, version: item.version };
    }).sort((a, b) => `${a.ecosystem}:${a.name}`.localeCompare(`${b.ecosystem}:${b.name}`));
    const admitted = { type: "OperationMeaningClosure", version: 1, operations, examples, dependencies };
    admitted.closureDigest = semanticId(admitted);
    return freeze(admitted);
  } catch (error) { return refusal(error, "OperationMeaningClosureRefusal"); }
}

const words = (name) => name.split("-");
const camel = (name) => words(name).map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1))).join("");
const snake = (name) => words(name).join("_");

/** How each language the line binds names an operation's home and symbol, and which ecosystem it resolves dependencies in. */
export const OPERATION_LANGUAGE_BINDINGS = freeze({
  "javascript-node": { ecosystem: "npm", entry: (name) => ({ module: `src/${name}.mjs`, symbol: camel(name) }) },
  racket: { ecosystem: "racket", entry: (name) => ({ module: `${name}.rkt`, symbol: name }) },
  guile: { ecosystem: "guix", entry: (name, unit) => ({ module: `(${unit} ${name})`, symbol: name }) },
  python: { ecosystem: "pypi", entry: (name, unit) => ({ module: `src/${snake(unit)}/${snake(name)}.py`, symbol: snake(name) }) },
});

/**
 * Bind an admitted operation closure to one language: each operation gains its module and symbol by
 * that language's convention, and only dependencies of that language's ecosystem are carried. A
 * dependency of another ecosystem cannot be resolved there, so binding refuses rather than drops it.
 * `unit` is the package or library name a module-qualified language nests under. The examples and
 * schemas are carried unchanged: the same order is assayed by the same data in every binding.
 */
export function bindOperationMeaningClosure(closure, language, { unit } = {}) {
  try {
    if (!record(closure) || closure.type !== "OperationMeaningClosure" || closure.version !== 1 || typeof closure.closureDigest !== "string") refuse("INVALID_CLOSURE", "closure must be an admitted OperationMeaningClosure@1", "closure");
    const binding = OPERATION_LANGUAGE_BINDINGS[language]; if (!binding) refuse("UNKNOWN_LANGUAGE", `language must be one of ${Object.keys(OPERATION_LANGUAGE_BINDINGS).join(", ")}`, "language");
    if (["guile", "python"].includes(language)) id(unit, "unit");
    const foreign = closure.dependencies.find((item) => item.ecosystem !== binding.ecosystem);
    if (foreign) refuse("FOREIGN_DEPENDENCY", `${foreign.ecosystem}:${foreign.name} cannot be resolved by a ${language} binding`, "dependencies");
    return freeze({
      type: "BoundOperationMeaningClosure", version: 1, language, closureDigest: closure.closureDigest,
      operations: closure.operations.map((operation) => ({ ...operation, ...binding.entry(operation.name, unit) })),
      examples: closure.examples,
      dependencies: Object.fromEntries(closure.dependencies.map(({ name, version }) => [name, version])),
    });
  } catch (error) { return refusal(error, "BoundOperationMeaningClosureRefusal"); }
}
