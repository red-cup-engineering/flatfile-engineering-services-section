import { makeCell } from "../kernel/cells.mjs";

const TYPE = "urn:fars:type";

function atom(value) { return encodeURIComponent(String(value)); }
function cell(subject, predicate, object) { return makeCell({ subject, predicate, object: String(object) }); }

export function systemdInventoryResourceGraphs(inventory, { observedAt } = {}) {
  if (inventory === null || typeof inventory !== "object" || !Array.isArray(inventory.units) || !Array.isArray(inventory.timers)) throw new TypeError("inventory must contain units and timers arrays");
  if (typeof observedAt !== "string" || observedAt === "") throw new TypeError("observedAt is required");
  const host = String(inventory.host);
  const resources = [];
  for (const unit of inventory.units) {
    if (typeof unit?.unit !== "string") continue;
    const resource = `urn:fars:systemd:${atom(host)}:unit:${atom(unit.unit)}`;
    const cells = [cell(resource, TYPE, "urn:fars:type:systemd-unit"), cell(resource, "urn:fars:host", host), cell(resource, "urn:fars:unit-name", unit.unit)];
    for (const [predicate, value] of [["urn:fars:unit-load", unit.load], ["urn:fars:unit-active", unit.active], ["urn:fars:unit-substate", unit.sub], ["urn:fars:description", unit.description]]) {
      if (value !== undefined && value !== null && String(value) !== "") cells.push(cell(resource, predicate, value));
    }
    resources.push(Object.freeze({ resource, focus: resource, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([]) }));
  }
  for (const timer of inventory.timers) {
    if (typeof timer?.unit !== "string") continue;
    const resource = `urn:fars:systemd:${atom(host)}:timer:${atom(timer.unit)}`;
    const cells = [cell(resource, TYPE, "urn:fars:type:systemd-timer"), cell(resource, "urn:fars:host", host), cell(resource, "urn:fars:unit-name", timer.unit)];
    for (const [predicate, value] of [["urn:fars:timer-activates", timer.activates], ["urn:fars:timer-next-microseconds", timer.next], ["urn:fars:timer-last-microseconds", timer.last]]) {
      if (value !== undefined && value !== null && String(value) !== "") cells.push(cell(resource, predicate, value));
    }
    resources.push(Object.freeze({ resource, focus: resource, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([]) }));
  }
  return Object.freeze(resources);
}


