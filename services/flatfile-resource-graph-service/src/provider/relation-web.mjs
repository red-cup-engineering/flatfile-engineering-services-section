import { createRelationWeb, relationKey } from "@red-cup-engineering/eavt/relation-web";
import {
  foldIndependentEvidence,
  identifyContentAddressedRow,
  independentEvidenceRow,
  unique,
} from "@red-cup-engineering/eavt";
import { four } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const freezeList = (values) => Object.freeze([...values]);

/**
 * DREW owns aggregate relation identity, occurrence provenance, and query.
 * The flatfile engine retains provider acquisition and resource/corpus lifecycle around it.
 */
export function createProviderRelationWeb() {
  return createRelationWeb();
}

export function observeProviderResource(web, { provider, resource, focus, observedAt, relations }) {
  return web.observe({
    source: Object.freeze({
      kind: "flatfile.provider-resource-observation",
      provider,
      resource,
      focus,
      observedAt,
    }),
    relations,
  });
}

export function orderedRelations(web) {
  return freezeList(web.events().flatMap((event) => event.relations));
}

export function originsProjection(web) {
  const origins = new Map();
  for (const observation of web.query()) {
    const key = relationKey(observation);
    const existing = origins.get(key) ?? [];
    existing.push(Object.freeze({
      provider: observation.source.provider,
      resource: observation.source.resource,
    }));
    origins.set(key, existing);
  }
  for (const [key, values] of origins) origins.set(key, freezeList(values));
  return origins;
}

const polaritySide = (polarity) => {
  if (polarity === undefined || polarity === "for" || polarity === "positive") return "positive";
  if (polarity === "against" || polarity === "negative") return "negative";
  throw new TypeError(`flatfile has no independent-evidence polarity mapping for ${JSON.stringify(polarity)}`);
};

/**
 * Project DREW occurrences to Computer's exact EAVT evidence carrier.
 *
 * The identities stay deliberately separate:
 * - semanticIdentity identifies the oriented predication;
 * - occurrenceIdentity identifies DREW's observed occurrence;
 * - custody identifies the provider/resource that supplied it;
 * - rowId identifies only the exact EAVT evidence row content.
 */
export function evidenceProjection(web) {
  return freezeList(web.query().map((observation) => {
    const custody = Object.freeze({
      provider: observation.source.provider,
      resource: observation.source.resource,
    });
    const row = independentEvidenceRow({
      subject: observation.subject,
      predicate: observation.predicate,
      object: observation.object,
      side: polaritySide(observation.polarity),
      by: observation.source.provider,
      witness: Object.freeze({
        kind: "flatfile.drew-relation-occurrence",
        occurrence: observation.address,
        custody,
        ...(Object.hasOwn(observation, "evidence") ? { evidence: observation.evidence } : {}),
      }),
    });
    return Object.freeze({
      semanticIdentity: relationKey(observation),
      occurrenceIdentity: observation.address,
      custody,
      rowId: identifyContentAddressedRow({ row }).identity,
      row,
    });
  }));
}

/** Computer-backed FOUR settlement, projected to the flatfile public store shape. */
export function settledStoreProjection(web, { claims = [] } = {}) {
  if (!Array.isArray(claims)) throw new TypeError("claims must be an array");
  const observations = web.query();
  const ordered = [];
  const bySemanticIdentity = new Map();
  for (const claim of [...claims, ...observations]) {
    const key = relationKey(claim);
    if (bySemanticIdentity.has(key)) continue;
    const cell = Object.freeze({ subject: claim.subject, predicate: claim.predicate, object: claim.object });
    bySemanticIdentity.set(key, cell);
    ordered.push(cell);
  }

  const projected = evidenceProjection(web);
  const rows = unique(projected.map(({ row }) => row));
  const rowsBySubject = new Map();
  for (const row of rows) {
    const subjectRows = rowsBySubject.get(row.e) ?? [];
    subjectRows.push(row);
    rowsBySubject.set(row.e, subjectRows);
  }
  const values = new Map();
  const sections = new Map();
  const claimsBySubject = new Map();
  for (const cell of ordered) {
    const subjectClaims = claimsBySubject.get(cell.subject) ?? [];
    subjectClaims.push(cell);
    claimsBySubject.set(cell.subject, subjectClaims);
  }
  for (const [subject, subjectClaims] of claimsBySubject) {
    const folded = foldIndependentEvidence({ subject, claims: subjectClaims, rows: rowsBySubject.get(subject) ?? [] });
    const section = { affirmed: [], denied: [], contradicted: [] };
    for (const { predicate, object, value: { pos, neg } } of folded.fiber) {
      const target = pos && neg ? section.contradicted : pos ? section.affirmed : neg ? section.denied : null;
      target?.push(Object.freeze({ predicate, object }));
    }
    sections.set(subject, Object.freeze(section));
    for (const cell of folded.fiber) {
      values.set(relationKey({ subject, predicate: cell.predicate, object: cell.object }),
        four(Boolean(cell.value.pos), Boolean(cell.value.neg)));
    }
  }
  return Object.freeze({
    values,
    order: freezeList(ordered),
    identityKey: relationKey,
    evidence: projected,
    rows: freezeList(rows),
    sections,
  });
}

export { relationKey };
