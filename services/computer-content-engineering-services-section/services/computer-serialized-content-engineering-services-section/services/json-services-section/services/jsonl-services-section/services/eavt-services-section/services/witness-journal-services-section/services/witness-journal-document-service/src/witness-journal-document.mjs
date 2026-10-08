import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";

const DOCUMENT_KIND = "witness-journal.document";
const BATCH_KIND = "witness-journal.batch-receipt";
const CATEGORY_PREDICATE = "urn:emsenn:witness-journal:category";

function requiredCustody(custody) {
  if (!custody || typeof custody.put !== "function" || typeof custody.get !== "function") {
    throw new TypeError("WitnessJournal byte custody must be injected explicitly");
  }
  return custody;
}

function requiredCategoryIndex(categoryIndex) {
  if (!categoryIndex || typeof categoryIndex.add !== "function" || typeof categoryIndex.query !== "function") {
    throw new TypeError("WitnessJournal category lookup must be injected explicitly");
  }
  return categoryIndex;
}

function providerBase(agentUrl) {
  if (typeof agentUrl !== "string" || agentUrl === "") throw new Error("agentUrl or an explicit custody/categoryIndex binding is required");
  const url = new URL(agentUrl);
  if (url.pathname.endsWith("/.well-known/agent-card.json")) url.pathname = url.pathname.slice(0, -"/.well-known/agent-card.json".length) || "/";
  return url;
}

async function remote(agentUrl, pathname, { method = "GET", body, signal } = {}) {
  const response = await fetch(new URL(pathname, providerBase(agentUrl)), {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(`WitnessJournal document provider refused HTTP ${response.status}: ${value?.error ?? "unknown"}`);
  return value;
}

function identified(value, objectKind) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
}

function decodedDocument(retained, expectedId) {
  const admitted = admitJsonSemanticContent({ bytes: retained.bytes, token: expectedId, objectKind: DOCUMENT_KIND });
  const document = admitted.value;
  const value = document?.type === "RelationalWitnessJournalDocument" && document?.version === 1
    ? document.value
    : document;
  return Object.freeze({ id: expectedId, type: document?.type ?? "WitnessJournalDocument", term: null, value });
}

export function relationalWitnessJournalDocument(value) {
  return Object.freeze({ type: "RelationalWitnessJournalDocument", version: 1, value: structuredClone(value) });
}

export async function recordWitnessJournalBatch({ agentUrl, batch, signal, custody, categoryIndex }) {
  if (!custody && !categoryIndex) return remote(agentUrl, "/record-batch", { method: "POST", body: { batch }, signal });
  custody = requiredCustody(custody);
  categoryIndex = requiredCategoryIndex(categoryIndex);
  if (!batch || typeof batch !== "object" || typeof batch.graph !== "string" || !Number.isFinite(Date.parse(batch.recordedAt))) {
    throw new TypeError("WitnessJournal batch requires graph and recordedAt");
  }
  const document = identified(batch.document, DOCUMENT_KIND);
  const receiptValue = {
    type: "WitnessJournalBatchReceipt",
    version: 1,
    settlement: batch.settlement,
    graph: batch.graph,
    recordedAt: batch.recordedAt,
    documentNi: document.token,
    assertions: batch.assertions ?? [],
  };
  const receipt = identified(receiptValue, BATCH_KIND);
  const [graphReference, documentReference] = await Promise.all([
    custody.put({ ni: receipt.token, bytes: receipt.bytes, mediaType: "application/sen+cbor" }),
    custody.put({ ni: document.token, bytes: document.bytes, mediaType: "application/sen+cbor" }),
  ]);
  const categories = (batch.assertions ?? []).filter((assertion) =>
    assertion?.subject === batch.graph
      && assertion?.object?.kind === "literal"
      && typeof assertion.object.value === "string");
  const indexes = await Promise.all(categories.map((assertion) => categoryIndex.add({
    predicate: assertion.predicate,
    category: assertion.object.value,
    ni: document.token,
  })));
  return Object.freeze({
    digest: receipt.token,
    documentNi: document.token,
    statementCount: (batch.assertions ?? []).length,
    reference: Object.freeze({
      profile: "org.red-cup-engineering.witness-journal-document-custody.v1",
      graph: graphReference,
      document: documentReference,
      indexes: Object.freeze(indexes),
    }),
  });
}

export async function resolveWitnessJournalDocument(ni, { agentUrl, custody } = {}) {
  if (!custody) return remote(agentUrl, `/document?ni=${encodeURIComponent(ni)}`);
  const retained = await requiredCustody(custody).get(ni);
  return retained ? decodedDocument(retained, ni) : null;
}

export async function queryWitnessJournalDocumentsByCategory(category, {
  agentUrl,
  predicate = CATEGORY_PREDICATE,
  custody,
  categoryIndex,
  maximumPages = 100,
} = {}) {
  if (!custody && !categoryIndex) return remote(agentUrl, `/documents?category=${encodeURIComponent(category)}&predicate=${encodeURIComponent(predicate)}`);
  custody = requiredCustody(custody);
  categoryIndex = requiredCategoryIndex(categoryIndex);
  const documents = new Map();
  let continuationToken;
  for (let pageNumber = 0; pageNumber < maximumPages; pageNumber += 1) {
    const page = await categoryIndex.query(category, { predicate, continuationToken });
    for (const reference of page.references) {
      const retained = await custody.get(reference.ni);
      if (!retained) throw new Error(`WitnessJournal category reference is unavailable: ${reference.ni}`);
      documents.set(reference.ni, decodedDocument(retained, reference.ni));
    }
    continuationToken = page.continuationToken;
    if (continuationToken === undefined) return Object.freeze([...documents.values()].sort((a, b) => a.id.localeCompare(b.id)));
  }
  throw new Error(`WitnessJournal category query exceeded ${maximumPages} pages`);
}

export async function queryWitnessJournalDocumentsByCategories(categories, options = {}) {
  if (!Array.isArray(categories) || categories.some((value) => typeof value !== "string" || value === "") || new Set(categories).size !== categories.length) {
    throw new TypeError("WitnessJournal categories must be a duplicate-free sequence of nonempty strings");
  }
  return new Map(await Promise.all(categories.map(async (category) => [category, await queryWitnessJournalDocumentsByCategory(category, options)])));
}

export function settlementRecordDocument({ category, recordedAt, record }) {
  if (typeof category !== "string" || category === "") throw new TypeError("settlement record category must be nonempty");
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("settlement record recordedAt must be an ISO timestamp");
  return relationalWitnessJournalDocument({ type: "SettlementRecord", category, recordedAt, record });
}

export async function recordSettlementRecord({ agentUrl, signal, settlement, actor, category, recordedAt, record, assertions = [], custody, categoryIndex }) {
  const document = settlementRecordDocument({ category, recordedAt, record });
  const graph = identified(document, DOCUMENT_KIND).token;
  return recordWitnessJournalBatch({ agentUrl, signal, custody, categoryIndex, batch: {
    settlement,
    graph,
    recordedAt,
    document,
    assertions: [
      { subject: actor, predicate: "urn:emsenn:witness-journal:recorded", object: { kind: "iri", value: graph } },
      { subject: graph, predicate: CATEGORY_PREDICATE, object: { kind: "literal", value: category } },
      ...assertions,
    ],
  } });
}

export async function querySettlementRecords(category, options = {}) {
  const documents = await queryWitnessJournalDocumentsByCategory(category, options);
  return Object.freeze(documents
    .filter(({ value }) => value?.type === "SettlementRecord" && value.category === category)
    .sort((left, right) => String(left.value.recordedAt).localeCompare(String(right.value.recordedAt)) || left.id.localeCompare(right.id))
    .map(({ value }) => value.record));
}

export async function querySettlementRecordSnapshot(categories, options = {}) {
  return new Map(await Promise.all(categories.map(async (category) => [category, await querySettlementRecords(category, options)])));
}
