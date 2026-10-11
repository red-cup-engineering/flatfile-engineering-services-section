import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
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
function refusal(error, type) {
  if (error instanceof Refusal) return freeze({ type, version: 1, code: error.code, message: error.message, path: error.path });
  throw error;
}

/** Admits a closed-world, language-neutral artifact fabrication specification without ambient I/O. */
export function admitArtifactFabricationSpecification(candidate) {
  try {
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
    if (!record(specification) || specification.type !== "ArtifactFabricationSpecification" || specification.version !== 1 || typeof specification.specificationDigest !== "string") refuse("INVALID_SPECIFICATION", "specification must be an admitted ArtifactFabricationSpecification@1", "specification");
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
    if (!record(specification) || specification.type !== "ArtifactFabricationSpecification" || specification.version !== 1 || typeof specification.specificationDigest !== "string") refuse("INVALID_SPECIFICATION", "specification must be an admitted ArtifactFabricationSpecification@1", "specification");
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
