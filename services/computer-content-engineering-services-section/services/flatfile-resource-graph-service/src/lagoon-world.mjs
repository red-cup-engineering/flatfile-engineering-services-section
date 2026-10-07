import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { constitute } from "@red-cup-engineering/eavt/constitute-entity";
import { foldEavtEvidence } from "@red-cup-engineering/eavt/fold-eavt-evidence";
import { entities } from "@red-cup-engineering/eavt/list-entities";
import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { relateEavtRows } from "@red-cup-engineering/eavt/relate-eavt-rows";

function attributesOf(address, rows) {
  return foldEavtEvidence({ subject: address, rows }).fiber.find((cell) => cell.predicate === "constituted")?.object;
}

export function findWorldAddressByAttribute(rows, key, value) {
  return entities(rows).find((address) => attributesOf(address, rows)?.[key] === value);
}

export function findWorldAddressByName(rows, name) {
  return findWorldAddressByAttribute(rows, "name", name);
}

/** Read a named place and its settled occupants from a Flatfile EAVT world. */
export function lookWorld(tracePath, placeName, { recentDutyLimit = 10 } = {}) {
  const rows = readEavtEntries({ path: tracePath });
  const address = findWorldAddressByName(rows, placeName);
  if (address === undefined) {
    return Object.freeze({ place: placeName, address: null, placeAttributes: null, things: Object.freeze([]) });
  }
  const thing = (entity) => Object.freeze({
    address: entity,
    attributes: attributesOf(entity, rows),
    fiber: foldEavtEvidence({ subject: entity, rows, converse: {} }).fiber,
  });
  const genesisT = (entity) => rows.find((row) => row.e === entity && row.a === "constituted")?.t;
  const recentDuties = relateEavtRows({ rows, predicate: "reported-at", object: address }).subjects
    .map((entity) => ({ entity, t: genesisT(entity) }))
    .sort((left, right) => (right.t ?? 0) - (left.t ?? 0))
    .slice(0, recentDutyLimit)
    .map(({ entity }) => thing(entity));
  return Object.freeze({
    place: placeName,
    address,
    placeAttributes: attributesOf(address, rows),
    things: Object.freeze(relateEavtRows({ rows, predicate: "located-in", object: address }).subjects.map(thing)),
    recentDuties: Object.freeze(recentDuties),
  });
}

/** Append one location assertion for an already constituted world actor. */
export function moveInWorld(tracePath, actor, placeName, t) {
  const rows = readEavtEntries({ path: tracePath });
  const address = findWorldAddressByName(rows, placeName);
  if (address === undefined) throw new TypeError(`moveInWorld: no constituted place named ${JSON.stringify(placeName)}`);
  const row = { e: actor, a: "located-in", v: address, t };
  appendEavtRow({ path: tracePath, row });
  return Object.freeze({ actor, place: placeName, address, row: Object.freeze(row) });
}

/** Constitute and append a world utterance attributed to its speaker and place. */
export function speakInWorld(tracePath, speaker, placeName, text, t) {
  const rows = readEavtEntries({ path: tracePath });
  const place = findWorldAddressByName(rows, placeName);
  if (place === undefined) throw new TypeError(`speakInWorld: no constituted place named ${JSON.stringify(placeName)}`);
  const { address, genesis: genesisRow } = constitute({ kind: "utterance", attributes: { text }, t });
  const spokenByRow = { e: address, a: "spoken-by", v: speaker, t };
  const spokenAtRow = { e: address, a: "spoken-at", v: place, t };
  appendEavtRow({ path: tracePath, row: genesisRow });
  appendEavtRow({ path: tracePath, row: spokenByRow });
  appendEavtRow({ path: tracePath, row: spokenAtRow });
  return Object.freeze({ address, place: placeName, genesisRow, spokenByRow, spokenAtRow });
}
