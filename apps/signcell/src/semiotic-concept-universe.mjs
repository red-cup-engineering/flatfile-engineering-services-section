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
  $id: "https://schemas.561.group/computer/semiotic-concept-universe.schema.json",
  title: "Semiotic concept universe",
  description: "A closed, content-addressed cut of declared concepts, their identity classes, annotations, references, and diagnostics.",
  type: "object",
  required: ["kind", "version", "concepts", "equivalenceClasses", "references", "diagnostics"],
  additionalProperties: false,
  properties: {
    kind: { const: "semiotic-concept-universe" },
    version: { const: 1 },
    concepts: { type: "array", items: { type: "object" } },
    equivalenceClasses: { type: "array", items: { type: "object" } },
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

function identityClasses(concepts) {
  const parent = new Map();
  const find = (value) => {
    if (!parent.has(value)) parent.set(value, value);
    const direct = parent.get(value);
    if (direct === value) return value;
    const representative = find(direct);
    parent.set(value, representative);
    return representative;
  };
  const unite = (left, right) => {
    const a = find(left), b = find(right);
    if (a === b) return;
    if (a.localeCompare(b) < 0) parent.set(b, a);
    else parent.set(a, b);
  };
  for (const concept of concepts) {
    find(concept.id);
    for (const alias of concept.sameAs) unite(concept.id, alias);
  }
  const members = new Map();
  for (const id of parent.keys()) {
    const representative = find(id);
    const group = members.get(representative) ?? [];
    group.push(id);
    members.set(representative, group);
  }
  const representativeOf = new Map([...parent.keys()].map((id) => [id, find(id)]));
  return {
    representativeOf,
    classes: freeze([...members].map(([representative, memberIds]) => freeze({ representative, members: freeze(memberIds.sort((a, b) => a.localeCompare(b))) })).sort((a, b) => a.representative.localeCompare(b.representative))),
  };
}

/**
 * Admit concept declarations as one immutable SignCell. Identity equivalence never
 * discards competing source records: it merely supplies a deterministic class key.
 */
export function createSemioticConceptUniverse({ concepts } = {}) {
  if (!Array.isArray(concepts)) throw new TypeError("concepts must be an array");
  const normalized = concepts.map(normalizedConcept).sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(normalized.map(({ id }) => id)).size !== normalized.length) throw new TypeError("concept ids must be unique");
  const identity = identityClasses(normalized);
  const knownRepresentatives = new Set(normalized.map(({ id }) => identity.representativeOf.get(id)));
  const references = [];
  const diagnostics = [];
  for (const concept of normalized) {
    const source = identity.representativeOf.get(concept.id);
    for (const [index, annotation] of concept.annotations.entries()) {
      if (annotation.kind === "failure") diagnostics.push(freeze({ code: "annotation-failure", concept: concept.id, annotation: index, reason: annotation.reason }));
      if (annotation.kind !== "reference") continue;
      const target = identity.representativeOf.get(annotation.target) ?? annotation.target;
      const status = knownRepresentatives.has(target) ? "resolved" : "unresolved";
      references.push(freeze({ source, sourceConcept: concept.id, target, requestedTarget: annotation.target, status, annotation: index }));
      if (status === "unresolved") diagnostics.push(freeze({ code: "unresolved-reference", concept: concept.id, target: annotation.target, representative: target, annotation: index }));
    }
  }
  const content = freeze({
    kind: "semiotic-concept-universe", version: 1, concepts: freeze(normalized), equivalenceClasses: identity.classes,
    references: freeze(references.sort((left, right) => left.source.localeCompare(right.source) || left.target.localeCompare(right.target) || left.annotation - right.annotation)),
    diagnostics: freeze(diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.concept.localeCompare(right.concept) || (left.annotation ?? -1) - (right.annotation ?? -1))),
  });
  return createTypedMark(semioticConceptUniverseType, content);
}

function universeContent(universe) {
  if (!universe || universe.kind !== "sign.cell" || universe.type !== semioticConceptUniverseType.id) throw new TypeError("universe must be a semiotic concept universe SignCell");
  return universe.content;
}

/** Select canonical publication records without giving publication ownership of the source universe. */
export function selectSemioticConceptPublication(universe, { channels, statuses } = {}) {
  const content = universeContent(universe);
  const wantedChannels = new Set(strings(channels, "channels").map((value) => value.toLowerCase()));
  const wantedStatuses = new Set(strings(statuses, "statuses").map((value) => value.toLowerCase()));
  const byRepresentative = new Map();
  for (const concept of content.concepts) {
    const group = content.equivalenceClasses.find((entry) => entry.members.includes(concept.id));
    const representative = group?.representative ?? concept.id;
    const members = byRepresentative.get(representative) ?? [];
    members.push(concept);
    byRepresentative.set(representative, members);
  }
  const records = [];
  for (const [id, members] of byRepresentative) {
    const ordered = [...members].sort((left, right) => (left.id !== id) - (right.id !== id) || left.id.localeCompare(right.id));
    const primary = ordered[0];
    const channelsForClass = new Set(ordered.flatMap((concept) => concept.publication.channels.map((channel) => channel.toLowerCase())));
    const statusesForClass = new Set(ordered.map((concept) => concept.publication.status?.toLowerCase()).filter(Boolean));
    const enabled = ordered.some((concept) => concept.publication.enabled);
    if (!enabled || (wantedChannels.size > 0 && ![...wantedChannels].some((channel) => channelsForClass.has(channel))) || (wantedStatuses.size > 0 && ![...wantedStatuses].some((status) => statusesForClass.has(status))) ) continue;
    records.push(freeze({ id, title: primary.title, body: primary.body, tags: freeze([...new Set(ordered.flatMap((concept) => concept.tags))].sort((a, b) => a.localeCompare(b))), status: primary.publication.status,
      channels: freeze([...channelsForClass].sort((a, b) => a.localeCompare(b))), aliases: freeze(content.equivalenceClasses.find((entry) => entry.representative === id)?.members.filter((member) => member !== id) ?? []),
      concepts: freeze(ordered), references: freeze(content.references.filter((reference) => reference.source === id)), diagnostics: freeze(content.diagnostics.filter((diagnostic) => ordered.some((concept) => concept.id === diagnostic.concept))),
    }));
  }
  return freeze(records.sort((left, right) => left.id.localeCompare(right.id)));
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
