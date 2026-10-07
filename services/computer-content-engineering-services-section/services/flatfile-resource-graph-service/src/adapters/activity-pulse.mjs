import { makeCell } from "../kernel/cells.mjs";

const TYPE = "urn:fars:type";
const ACTIVITY_PULSE = "urn:fars:type:activity-pulse";
const ACTIVITY_EVENT = "urn:fars:type:activity-event";
const QUANTITY = "urn:fars:type:quantity";

function atom(value) {
  return encodeURIComponent(String(value));
}

function cell(subject, predicate, object) {
  return makeCell({ subject, predicate, object: String(object) });
}

export function activityPulseResourceGraph(pulse) {
  if (pulse?.type !== "ColonyActivityPulseEnvelope") throw new TypeError("pulse must be a ColonyActivityPulseEnvelope");
  const observedAt = pulse.recordedAt ?? pulse.window?.toInclusive;
  if (!Number.isFinite(Date.parse(observedAt))) throw new TypeError("pulse needs recordedAt or window.toInclusive");
  const resource = `${pulse.providerActor}:pulse:${atom(pulse.window.fromExclusive)}:${atom(pulse.window.toInclusive)}`;
  const cells = [
    cell(resource, TYPE, ACTIVITY_PULSE),
    cell(resource, "urn:fars:provider-actor", pulse.providerActor),
    cell(resource, "urn:fars:settlement-actor", pulse.settlementActor),
    cell(resource, "urn:fars:colony-actor", pulse.colonyActor),
    cell(resource, "urn:fars:window-from-exclusive", pulse.window.fromExclusive),
    cell(resource, "urn:fars:window-to-inclusive", pulse.window.toInclusive),
  ];
  for (const event of pulse.events ?? []) {
    cells.push(cell(resource, "urn:fars:observed-event", event.id));
    cells.push(cell(event.id, TYPE, ACTIVITY_EVENT));
    for (const [predicate, value] of [
      ["urn:fars:event-kind", event.kind], ["urn:fars:event-domain", event.domain],
      ["urn:fars:event-outcome", event.outcome], ["urn:fars:event-summary", event.summary],
      ["urn:fars:occurred-at", event.occurredAt],
    ]) if (value !== undefined && value !== null && String(value) !== "") cells.push(cell(event.id, predicate, value));
    for (const [index, quantity] of (event.quantities ?? []).entries()) {
      const quantityId = `${event.id}:quantity:${index}`;
      cells.push(cell(event.id, "urn:fars:has-quantity", quantityId));
      cells.push(cell(quantityId, TYPE, QUANTITY));
      cells.push(cell(quantityId, "urn:fars:quantity-label", quantity.label));
      cells.push(cell(quantityId, "urn:fars:quantity-amount", quantity.amount));
      cells.push(cell(quantityId, "urn:fars:quantity-unit", quantity.unit));
      if (quantity.displayOrder !== undefined) cells.push(cell(quantityId, "urn:fars:display-order", quantity.displayOrder));
    }
  }
  return Object.freeze({
    resource,
    focus: pulse.colonyActor,
    observedAt,
    cells: Object.freeze(cells),
    diagnostics: Object.freeze((pulse.refusals ?? []).map((refusal) => Object.freeze({ code: "provider-refusal", message: refusal.reason, domain: refusal.domain }))),
  });
}


