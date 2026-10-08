import { makeCell } from "../kernel/cells.mjs";
import { holds, value } from "../kernel/store.mjs";
import { validateProviderOutcome } from "./provider.mjs";
import {
  createProviderRelationWeb,
  observeProviderResource,
  orderedRelations,
  originsProjection,
  relationKey,
  settledStoreProjection,
} from "./relation-web.mjs";

export const FARS_PROVIDED_BY = "urn:fars:provided-by";
export const FARS_OBSERVED_AT = "urn:fars:observed-at";
export const FARS_FOCUS = "urn:fars:focus";

export const cellKey = relationKey;

function diagnostic(provider, value, fallbackCode = "provider-diagnostic") {
  if (typeof value === "string") return Object.freeze({ provider, code: fallbackCode, message: value });
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.freeze({ ...value, provider, code: value.code ?? fallbackCode, message: value.message ?? JSON.stringify(value) });
  }
  return Object.freeze({ provider, code: fallbackCode, message: String(value) });
}

async function observeProvider(provider, context, onProviderError) {
  try {
    return { provider, outcome: validateProviderOutcome(await provider.observe(context), provider.id), failure: null };
  } catch (error) {
    if (onProviderError === "throw") throw error;
    return { provider, outcome: Object.freeze({ resources: Object.freeze([]), diagnostics: Object.freeze([]) }), failure: error };
  }
}

/** Compose independently acquired per-resource graphs into one query store. */
export async function composeProviders(providers, { context = {}, onProviderError = "throw" } = {}) {
  if (!Array.isArray(providers)) throw new TypeError("providers must be an array");
  if (onProviderError !== "throw" && onProviderError !== "diagnose") throw new TypeError("onProviderError must be throw or diagnose");
  const ids = new Set();
  for (const provider of providers) {
    if (provider === null || typeof provider !== "object" || typeof provider.id !== "string" || typeof provider.observe !== "function") throw new TypeError("every provider must be defined by defineProvider");
    if (ids.has(provider.id)) throw new TypeError(`duplicate provider id: ${provider.id}`);
    ids.add(provider.id);
  }

  const observations = await Promise.all(providers.map((provider) => observeProvider(provider, context, onProviderError)));
  const relationWeb = createProviderRelationWeb();
  const resources = [];
  const providerReports = [];
  const diagnostics = [];

  for (const { provider, outcome, failure } of observations) {
    if (failure !== null) {
      diagnostics.push(diagnostic(provider.id, { code: "provider-observation-failed", message: failure instanceof Error ? failure.message : String(failure) }));
      providerReports.push(Object.freeze({ provider: provider.id, status: "failed", resources: 0, cells: 0 }));
      continue;
    }
    providerReports.push(Object.freeze({ provider: provider.id, status: "observed", resources: outcome.resources.length, cells: outcome.resources.reduce((sum, graph) => sum + graph.cells.length, 0) }));
    diagnostics.push(...outcome.diagnostics.map((value) => diagnostic(provider.id, value)));
    for (const graph of outcome.resources) {
      resources.push(Object.freeze({ provider: provider.id, resource: graph.resource, focus: graph.focus, observedAt: graph.observedAt, cellCount: graph.cells.length }));
      observeProviderResource(relationWeb, {
        provider: provider.id,
        resource: graph.resource,
        focus: graph.focus,
        observedAt: graph.observedAt,
        relations: [
          makeCell({ subject: graph.resource, predicate: FARS_PROVIDED_BY, object: provider.id }),
          makeCell({ subject: graph.resource, predicate: FARS_OBSERVED_AT, object: graph.observedAt }),
          makeCell({ subject: graph.resource, predicate: FARS_FOCUS, object: graph.focus }),
          ...graph.cells,
        ],
      });
      diagnostics.push(...graph.diagnostics.map((value) => diagnostic(provider.id,
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? { resource: graph.resource, ...value }
          : { resource: graph.resource, message: String(value) })));
    }
  }

  const cells = orderedRelations(relationWeb);
  return Object.freeze({
    store: settledStoreProjection(relationWeb),
    cells,
    resources: Object.freeze(resources),
    providers: Object.freeze(providerReports),
    diagnostics: Object.freeze(diagnostics),
    relationWeb,
    // Compatibility projection. DREW's occurrence web remains authoritative.
    origins: originsProjection(relationWeb),
  });
}

export function originsOf(composition, cell) {
  return Object.freeze(composition.relationWeb.query(cell).map((observation) => Object.freeze({
    provider: observation.source.provider,
    resource: observation.source.resource,
  })));
}

export function queryRelations(composition, pattern = {}) {
  // This is intentionally the occurrence view: negative observations remain
  // observable here even though they are not designated graph edges.
  return composition.relationWeb.query(pattern);
}

export function queryDesignatedRelations(composition, pattern = {}) {
  const out = [];
  const seen = new Set();
  for (const occurrence of composition.relationWeb.query(pattern)) {
    const key = relationKey(occurrence);
    if (seen.has(key) || !holds(composition.store, occurrence.subject, occurrence.predicate, occurrence.object)) continue;
    seen.add(key);
    out.push(Object.freeze({ subject: occurrence.subject, predicate: occurrence.predicate, object: occurrence.object }));
  }
  return Object.freeze(out);
}

export function neighborhoodOf(composition, term, options = {}) {
  return composition.relationWeb.neighbors(term, options);
}

export function serializeComposition(composition) {
  const reading = ({ positiveEvidence, negativeEvidence }) => {
    if (positiveEvidence && negativeEvidence) return "TOP";
    if (positiveEvidence) return "T";
    if (negativeEvidence) return "F";
    return "BOT";
  };
  return Object.freeze({
    resources: composition.resources,
    providers: composition.providers,
    diagnostics: composition.diagnostics,
    cells: Object.freeze(composition.store.order.map((cell) => {
      const cellValue = value(composition.store, cell.subject, cell.predicate, cell.object);
      return Object.freeze({
        ...cell,
        reading: reading(cellValue),
        designated: cellValue.positiveEvidence,
        origins: originsOf(composition, cell),
      });
    })),
  });
}


