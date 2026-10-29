import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";
import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { seavt } from "./row.mjs";
import { appendSeavt, readSeavtAtPath } from "./journal.mjs";
import { validateJson } from "@red-cup-engineering/computer-data-engine/validation";

const FEED = "witness-journal-seavt";
function requiredText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`Semantic record journal ${label} is required`);
  return value;
}
function filesBelow(directory, suffix) {
  const found = [];
  try {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) found.push(...filesBelow(path, suffix));
      else if (item.isFile() && item.name === suffix) found.push(path);
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  return found.sort();
}
function axes(charge) {
  if (!charge || Object.getPrototypeOf(charge) !== Object.prototype || typeof charge.support !== "boolean" || typeof charge.refutation !== "boolean") {
    throw new TypeError("Semantic record journal charge requires independent support and refutation booleans");
  }
  return charge;
}

export function createSemanticRecordJournal({ root, objectKind: defaultObjectKind }) {
  const custodyRoot = resolve(root);
  function record({ objectKind, category, record: value, recordedAt, charge, relation }) {
    const kind = requiredText(objectKind ?? defaultObjectKind, "objectKind"), observed = axes(charge);
    const identity = identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot: EMPTY_WITNESS_ROOT });
    const rows = [seavt(jsonToTerm(identity.id), jsonToTerm(requiredText(category, "category")), jsonToTerm(value), recordedAt)];
    if (relation !== undefined) {
      if (!relation || Object.getPrototypeOf(relation) !== Object.prototype || !Object.hasOwn(relation, "subject") || !Object.hasOwn(relation, "predicate") || !Object.hasOwn(relation, "object")) throw new TypeError("Semantic record journal relation requires subject, predicate, and object");
      rows.push(seavt(jsonToTerm(relation.subject), jsonToTerm(relation.predicate), jsonToTerm(relation.object), recordedAt));
    }
    const result = appendSeavt(custodyRoot, FEED, rows, recordedAt);
    return Object.freeze({ id: identity.id, objectKind: kind, appended: result.appended, charge: Object.freeze({ ...observed }) });
  }
  function query({ objectKind, category }) {
    const kind = requiredText(objectKind ?? defaultObjectKind, "objectKind");
    const paths = filesBelow(join(custodyRoot, "data", "logs"), `${FEED}.jsonl`);
    const records = [];
    for (const path of paths) for (const row of readSeavtAtPath(path)) {
      const rowCategory = termToJson(row.a);
      if (rowCategory !== category) continue;
      const id = termToJson(row.e), value = termToJson(row.v);
      const identity = identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot: EMPTY_WITNESS_ROOT });
      // A feed also holds direct relation facts.  A relation may legitimately
      // use the same predicate as this record category; it is not this
      // object-kind's content projection unless its E/V are that content's
      // identity pair.
      if (identity.id !== id) continue;
      records.push(Object.freeze({ id, objectKind: kind, category, recordedAt: row.t, record: value }));
    }
    return Object.freeze(records);
  }
  return Object.freeze({ root: custodyRoot, record, query });
}

/**
 * Admit one domain-owned JSON record before its semantic-journal effect.
 *
 * The domain supplies its JSON Schema and all semantic journal coordinates;
 * this operation owns neither a domain record kind nor its relation policy.
 * Invalid external data is refused before a journal is constructed or written.
 * @param {{root: string, objectKind: string, category: string, schema: object|boolean, record: unknown, recordedAt: string, charge: {support: boolean, refutation: boolean}, relation?: {subject: unknown, predicate: unknown, object: unknown}}} request
 * @returns {object}
 */
export function recordAdmittedSemanticRecord(request) {
  const admission = validateJson({ value: request?.record, schema: request?.schema });
  if (!admission.valid) return Object.freeze({ refused: "INVALID_SEMANTIC_RECORD", errors: Object.freeze(admission.errors) });
  for (const field of ["root", "objectKind", "category", "recordedAt"]) requiredText(request?.[field], field);
  axes(request?.charge);
  if (request?.relation !== undefined && (!request.relation || Object.getPrototypeOf(request.relation) !== Object.prototype || !Object.hasOwn(request.relation, "subject") || !Object.hasOwn(request.relation, "predicate") || !Object.hasOwn(request.relation, "object"))) throw new TypeError("Semantic record journal relation requires subject, predicate, and object");
  return createSemanticRecordJournal({ root: request.root, objectKind: request.objectKind }).record({
    category: request.category,
    record: request.record,
    recordedAt: request.recordedAt,
    charge: request.charge,
    ...(request.relation === undefined ? {} : { relation: request.relation }),
  });
}

/** Resolve RFC 6901 JSON Pointers without evaluating text or code. */
export function valueAtJsonPointer(value, pointer) {
  if (pointer === "") return value;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) throw new TypeError("JSON Pointer must be empty or start with '/'");
  let current = value;
  for (const token of pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, token)) throw new TypeError(`JSON Pointer does not resolve: ${pointer}`);
    current = current[token];
  }
  return current;
}

/** Bind a data-only template. A binding is exactly {"$pointer":"/parameter/path"}. */
export function bindJsonTemplate(template, parameters) {
  if (Array.isArray(template)) return template.map((item) => bindJsonTemplate(item, parameters));
  if (template && Object.getPrototypeOf(template) === Object.prototype) {
    const keys = Object.keys(template);
    if (keys.length === 1 && keys[0] === "$pointer") return structuredClone(valueAtJsonPointer(parameters, template.$pointer));
    return Object.fromEntries(keys.map((key) => [key, bindJsonTemplate(template[key], parameters)]));
  }
  return structuredClone(template);
}

/** Bind a configured admission request, then admit the complete result before its journal effect. */
export function recordConfiguredSemanticRecord({ configuration, parameters }) {
  if (!configuration || Object.getPrototypeOf(configuration) !== Object.prototype) throw new TypeError("Configured semantic record requires an object configuration");
  return recordAdmittedSemanticRecord(bindJsonTemplate(configuration, parameters));
}

function jsonFiles(root, recursive = false) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const path = join(root, item.name);
    if (item.isDirectory()) return recursive ? jsonFiles(path, true) : [];
    return item.isFile() && item.name.endsWith(".json") ? [path] : [];
  }).sort();
}
function pointerOrNull(value, pointer) {
  try { return valueAtJsonPointer(value, pointer); } catch { return null; }
}

/** Verify local JSON references against admitted records without changing either carrier. */
export function checkConfiguredSemanticRecordReferences(configuration) {
  const sourceRoot = resolve(configuration.sourceRoot);
  const journal = createSemanticRecordJournal({ root: resolve(configuration.journalRoot), objectKind: configuration.objectKind });
  const known = new Set(journal.query({ category: configuration.category }).map((record) => record.id));
  const failures = [];
  for (const path of jsonFiles(sourceRoot, configuration.recursive === true)) {
    const value = JSON.parse(readFileSync(path, "utf8"));
    const reference = pointerOrNull(value, configuration.referencePointer);
    if (typeof reference === "string" && !known.has(reference)) failures.push({ path, reason: `reference ${JSON.stringify(reference)} names no admitted record` });
    if (configuration.requiredWhen && (pointerOrNull(value, configuration.requiredWhen.pointer) ?? configuration.requiredWhen.defaultValue) !== configuration.requiredWhen.equals && reference === null) failures.push({ path, reason: `reference at ${configuration.referencePointer} is required` });
  }
  return failures.length ? { ok: false, refused: "DANGLING_OR_MISSING_SEMANTIC_RECORD_REFERENCE", rows: failures } : { ok: true, rowsChecked: jsonFiles(sourceRoot, configuration.recursive === true).length };
}

/** Project local issue files through admitted response records; this is read-only. */
export function checkConfiguredSemanticRecordResponses(configuration, now = new Date()) {
  const issuesRoot = resolve(configuration.issuesRoot), repositoryRoot = resolve(configuration.repositoryRoot);
  const journal = createSemanticRecordJournal({ root: resolve(configuration.journalRoot), objectKind: configuration.objectKind });
  const responses = journal.query({ category: configuration.category });
  const issues = jsonFiles(issuesRoot, true).map((absolutePath) => {
    const path = relative(repositoryRoot, absolutePath), issue = JSON.parse(readFileSync(absolutePath, "utf8"));
    const answer = responses.find((item) => pointerOrNull(item.record, configuration.responseIssuePathPointer) === path);
    const match = /^(\d{4}-\d{2}-\d{2})-/u.exec(absolutePath.split("/").at(-1));
    const horizonDays = answer ? pointerOrNull(answer.record, configuration.responseHorizonPointer) : configuration.defaultHorizonDays;
    const overdue = !answer && match && Math.floor((now.getTime() - Date.parse(`${match[1]}T00:00:00Z`)) / 86400000) >= horizonDays;
    return { path, id: issue.id ?? issue.name ?? null, date: match?.[1] ?? null, status: answer ? "answered" : overdue ? "overdue" : "open", horizonDays, responsivenessRecordId: answer?.id ?? null };
  });
  return { issues, answered: issues.filter((item) => item.status === "answered").length, open: issues.filter((item) => item.status === "open").length, overdue: issues.filter((item) => item.status === "overdue").length };
}
