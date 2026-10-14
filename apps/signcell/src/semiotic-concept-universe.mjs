import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "./typed-mark.mjs";

const freeze = (value) => Object.freeze(value);
const text = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be non-empty text`);
  return value;
};
const strings = (value, label) => {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.some((item) => typeof item !== "string" || item.trim() === "")) throw new TypeError(`${label} must contain only non-empty text`);
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
};
const json = (value, label) => {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { throw new TypeError(`${label} must be JSON data`); }
};

export const semioticConceptUniverseType = defineSchemaType({
  $id: "https://schemas.561.group/computer/semiotic-concept-universe-v2.schema.json",
  title: "Semiotic concept universe",
  description: "A content-addressed cut of independently sourced concepts, unverified identity claims, references and diagnostics; authored same_as never merges identities.",
  type: "object",
  required: ["kind", "version", "concepts", "references", "diagnostics"],
  additionalProperties: false,
  properties: {
    kind: { const: "semiotic-concept-universe" },
    version: { const: 2 },
    concepts: { type: "array", items: { type: "object" } },
    references: { type: "array", items: { type: "object" } },
    diagnostics: { type: "array", items: { type: "object" } },
  },
});

function normalizedAnnotation(value, conceptId, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`concept ${conceptId} annotation ${index} must be an object`);
  const kind = text(value.kind, `concept ${conceptId} annotation ${index}.kind`);
  const provenance = value.provenance === undefined ? null : json(value.provenance, `concept ${conceptId} annotation ${index}.provenance`);
  if (kind === "reference") return freeze({ kind, target: text(value.target, `concept ${conceptId} annotation ${index}.target`), ...(provenance === null ? {} : { provenance }) });
  if (kind === "atom") return freeze({ kind, value: text(value.value, `concept ${conceptId} annotation ${index}.value`), ...(provenance === null ? {} : { provenance }) });
  if (kind === "attribute") return freeze({ kind, key: text(value.key, `concept ${conceptId} annotation ${index}.key`), value: json(value.value, `concept ${conceptId} annotation ${index}.value`), ...(provenance === null ? {} : { provenance }) });
  if (kind === "failure") return freeze({ kind, reason: text(value.reason, `concept ${conceptId} annotation ${index}.reason`), ...(provenance === null ? {} : { provenance }) });
  throw new TypeError(`concept ${conceptId} annotation ${index}.kind is unsupported`);
}

function normalizedConcept(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("each concept declaration must be an object");
  const id = text(input.id, "concept.id");
  const annotations = (input.annotations ?? []).map((value, index) => normalizedAnnotation(value, id, index));
  if (!Array.isArray(input.annotations ?? [])) throw new TypeError(`concept ${id}.annotations must be an array`);
  const attributes = input.attributes === undefined ? {} : json(input.attributes, `concept ${id}.attributes`);
  const source = input.source === undefined ? null : json(input.source, `concept ${id}.source`);
  return freeze({
    id,
    title: text(input.title, `concept ${id}.title`),
    body: typeof input.body === "string" ? input.body : (() => { throw new TypeError(`concept ${id}.body must be text`); })(),
    tags: freeze(strings(input.tags, `concept ${id}.tags`)),
    sameAs: freeze(strings(input.sameAs, `concept ${id}.sameAs`)),
    publication: freeze({
      enabled: input.publication?.enabled !== false,
      channels: freeze(strings(input.publication?.channels, `concept ${id}.publication.channels`)),
      status: input.publication?.status === undefined || input.publication?.status === null ? null : text(input.publication.status, `concept ${id}.publication.status`),
    }),
    annotations: freeze(annotations),
    attributes: freeze(attributes),
    ...(source === null ? {} : { source: freeze(source) }),
  });
}

/** Author assertions of sameness remain disputed identity claims until independently qualified. */
export function createSemioticConceptUniverse({ concepts } = {}) {
  if (!Array.isArray(concepts)) throw new TypeError("concepts must be an array");
  const normalized = concepts.map(normalizedConcept).sort((left, right) => left.id.localeCompare(right.id));
  const known = new Set(normalized.map(({id}) => id));
  if (known.size !== normalized.length) throw new TypeError("concept ids must be unique");
  const references = [];
  const diagnostics = [];
  for (const concept of normalized) {
    for (const alias of concept.sameAs) {
      const status = known.has(alias) ? "unverified-identity" : "unresolved-identity";
      references.push(freeze({source:concept.id, sourceConcept:concept.id, target:alias,
        requestedTarget:alias, relation:"claimed-identity", status, annotation:null}));
      diagnostics.push(freeze({code:status, concept:concept.id, target:alias}));
    }
    for (const [index, annotation] of concept.annotations.entries()) {
      if (annotation.kind === "failure") diagnostics.push(freeze({code:"annotation-failure",
        concept:concept.id, annotation:index, reason:annotation.reason}));
      if (annotation.kind !== "reference") continue;
      const status = known.has(annotation.target) ? "resolved" : "unresolved";
      references.push(freeze({source:concept.id,sourceConcept:concept.id,target:annotation.target,
        requestedTarget:annotation.target,relation:"reference",status,annotation:index}));
      if (status === "unresolved") diagnostics.push(freeze({code:"unresolved-reference",
        concept:concept.id,target:annotation.target,annotation:index}));
    }
  }
  const content = freeze({
    kind:"semiotic-concept-universe",version:2,concepts:freeze(normalized),
    references:freeze(references.sort((a,b) => a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target) || a.relation.localeCompare(b.relation) ||
      (a.annotation ?? -1) - (b.annotation ?? -1))),
    diagnostics:freeze(diagnostics.sort((a,b) => a.code.localeCompare(b.code) ||
      a.concept.localeCompare(b.concept) || (a.annotation ?? -1) - (b.annotation ?? -1))),
  });
  return createTypedMark(semioticConceptUniverseType,content);
}

function universeContent(universe) {
  if (!universe || universe.kind !== "sign.cell" || universe.type !== semioticConceptUniverseType.id) throw new TypeError("universe must be a semiotic concept universe SignCell");
  return universe.content;
}

/** Select canonical publication records without giving publication ownership of the source universe. */
/** Publish independently named concepts, never merge two authored subjects on a same_as claim. */
export function selectSemioticConceptPublication(universe, { channels, statuses } = {}) {
  const content = universeContent(universe);
  const wantedChannels = new Set(strings(channels,"channels").map(value=>value.toLowerCase()));
  const wantedStatuses = new Set(strings(statuses,"statuses").map(value=>value.toLowerCase()));
  const records = [];
  for (const concept of content.concepts) {
    const channelsForConcept = new Set(concept.publication.channels.map(value=>value.toLowerCase()));
    const status = concept.publication.status?.toLowerCase();
    if (!concept.publication.enabled ||
        (wantedChannels.size > 0 && ![...wantedChannels].some(channel=>channelsForConcept.has(channel))) ||
        (wantedStatuses.size > 0 && !wantedStatuses.has(status))) continue;
    records.push(freeze({
      id:concept.id, title:concept.title, body:concept.body,
      tags:concept.tags, status:concept.publication.status,
      channels:freeze([...channelsForConcept].sort()),
      claimedAliases:concept.sameAs, concepts:freeze([concept]),
      references:freeze(content.references.filter(ref=>ref.source===concept.id)),
      diagnostics:freeze(content.diagnostics.filter(diagnostic=>diagnostic.concept===concept.id)),
    }));
  }
  return freeze(records.sort((a,b)=>a.id.localeCompare(b.id)));
}

/** Compare the user-visible semantic cut: source concepts, references, and diagnostics. */
export function differentiateSemioticConceptUniverses(previous, current) {
  const before = previous === null || previous === undefined ? null : universeContent(previous);
  const after = universeContent(current);
  const changes = (left, right, key) => {
    const a = new Map((left ?? []).map((value) => [key(value), value]));
    const b = new Map(right.map((value) => [key(value), value]));
    return freeze({ added: freeze([...b.keys()].filter((value) => !a.has(value)).sort()), removed: freeze([...a.keys()].filter((value) => !b.has(value)).sort()), changed: freeze([...a.keys()].filter((value) => b.has(value) && JSON.stringify(a.get(value)) !== JSON.stringify(b.get(value))).sort()) });
  };
  return freeze({ baselinePresent: before !== null, concepts: changes(before?.concepts, after.concepts, (value) => value.id), references: changes(before?.references, after.references, (value) => `${value.source}\u001f${value.target}\u001f${value.annotation}`), diagnostics: changes(before?.diagnostics, after.diagnostics, (value) => `${value.code}\u001f${value.concept}\u001f${value.annotation ?? ""}`) });
}
