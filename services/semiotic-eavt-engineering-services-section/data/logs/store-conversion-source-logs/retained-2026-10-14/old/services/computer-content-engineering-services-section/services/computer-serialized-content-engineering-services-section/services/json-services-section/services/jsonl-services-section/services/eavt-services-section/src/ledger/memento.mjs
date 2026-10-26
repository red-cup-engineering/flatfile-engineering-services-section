/**
 * ledger/memento - RFC 7089 datetime negotiation as state@T over RWIL.
 */

import {
  mementoSnapshotCarrier,
  mementoSnapshotSchema,
  timeMapCarrier,
  timeMapSchema,
} from "./memento-schema.mjs";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { projectStateView, } from "./state.mjs";
import { eavtId } from "@red-cup-engineering/eavt-services-section/row";

export {
  mementoSnapshotCarrier,
  mementoSnapshotSchema,
  timeMapCarrier,
  timeMapSchema,
} from "./memento-schema.mjs";

export const MEMENTO_DATETIME_HEADER = "Memento-Datetime";
export const ACCEPT_DATETIME_HEADER = "Accept-Datetime";

function datetimeOf(value) {
  return typeof value === "string" ? value : canonical(value);
}

function compareDatetime(left, right) {
  const l = typeof left === "string" ? left : datetimeOf(left);
  const r = typeof right === "string" ? right : datetimeOf(right);
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (Number.isFinite(ld) && Number.isFinite(rd)) return ld - rd;
  return l.localeCompare(r);
}

function prefixAt(log, asOf) {
  return Object.freeze(log.filter((row) => compareDatetime(row.t, asOf) <= 0));
}

export function projectStateAt(log, functional, asOf) {
  return mementoSnapshotCarrier.assert(Object.freeze({
    kind: "relating.ledger.memento.snapshot",
    datetime: asOf,
    state: projectStateView(prefixAt(log, asOf), functional),
  }), "memento snapshot");
}

export function availableMementoDatetimes(log) {
  return Object.freeze([...new Set(log.map((row) => datetimeOf(row.t)))].sort(compareDatetime));
}

export function timeMap(log, original = "") {
  const snapshots = availableMementoDatetimes(log).map((datetime) => Object.freeze({
    datetime,
    witnesses: prefixAt(log, datetime).length,
  }));
  return timeMapCarrier.assert(Object.freeze({
    kind: "relating.ledger.memento.timemap",
    original,
    snapshots: Object.freeze(snapshots),
  }), "memento timemap");
}

function selectedDatetime(log, requested) {
  const available = availableMementoDatetimes(log).filter((datetime) => compareDatetime(datetime, requested) <= 0);
  return available.at(-1) ?? requested;
}

export function readMementoState(
  log,
  functional,
  request,
) {
  return projectStateAt(log, functional, selectedDatetime(log, request.acceptDatetime));
}

function linkHeader(request, datetime) {
  const links = [
    request.original === undefined ? undefined : `<${request.original}>; rel="original"`,
    request.timegate === undefined ? undefined : `<${request.timegate}>; rel="timegate"`,
    request.timemap === undefined ? undefined : `<${request.timemap}>; rel="timemap"; type="application/json"`,
    `<${request.original ?? ""}>; rel="memento"; datetime="${datetime}"`,
  ].filter((value) => value !== undefined);
  return links.join(", ");
}

export function mementoStateResponse(
  log,
  functional,
  request,
) {
  const snapshot = readMementoState(log, functional, request);
  const headers = {
    [MEMENTO_DATETIME_HEADER]: snapshot.datetime,
    vary: ACCEPT_DATETIME_HEADER,
  };
  const link = linkHeader(request, snapshot.datetime);
  if (link.length > 0) headers.link = link;
  return {
    status: 200,
    type: "application/json; charset=utf-8",
    headers,
    body: `${JSON.stringify(snapshot, null, 2)}\n`,
  };
}

export function mementoProjectionMonotone(log, datetimes) {
  let prior = new Set();
  for (const datetime of [...datetimes].sort(compareDatetime)) {
    const current = new Set(prefixAt(log, datetime).map(eavtId));
    for (const id of prior) if (!current.has(id)) return false;
    prior = current;
  }
  return true;
}

export function mementoSnapshotValue(value) {
  return requireJsonValue(value, "memento snapshot");
}
