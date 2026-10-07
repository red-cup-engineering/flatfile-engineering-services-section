/**
 * models/plasma/reconnection-curvature - reconnection as curvature.
 *
 * This captures `Obsmetrologia.Relational.Plasma.ReconnectionCurvature`:
 * frozen-in flux as absence of non-Scott firing, reconnection as its failure,
 * flat-regime prohibition, and a canonical curved reconnection event.
 */

export const fieldLineFlowSchema = {
  $id: "metroplat/models/plasma/reconnection-curvature/field-line-flow",
  type: "object",
  required: ["kind", "update", "history", "nonScottContinuous"],
  properties: {
    kind: { const: "relational.plasma.reconnection.fieldLineFlow" },
    update: { type: "string" },
    history: { type: "string" },
    nonScottContinuous: { type: "boolean" },
  },
  additionalProperties: false,
  title: "FieldLineFlow",
  description: "A field-line flow's update/history readout and whether it is non-Scott continuous.",
};

export const closureRegimeDataSchema = {
  $id: "metroplat/models/plasma/reconnection-curvature/closure-regime-data",
  type: "object",
  required: ["kind", "scottContinuous", "cohomologyVanishes"],
  properties: {
    kind: { const: "relational.plasma.regime" },
    scottContinuous: { type: "boolean" },
    cohomologyVanishes: { type: "boolean" },
  },
  additionalProperties: false,
  title: "ClosureRegimeData",
  description: "Whether the plasma regime is Scott continuous and its cohomology vanishes.",
};

export function fieldLineFlow(update, history, nonScottContinuous) {
  return Object.freeze({
    kind: "relational.plasma.reconnection.fieldLineFlow",
    update,
    history,
    nonScottContinuous,
  });
}

export function frozenIn(flow) {
  return !flow.nonScottContinuous;
}

export function reconnectionEvent(flow) {
  return flow.nonScottContinuous;
}

export function flatRegime(scottContinuous = true) {
  return Object.freeze({
    kind: "relational.plasma.regime",
    scottContinuous,
    cohomologyVanishes: scottContinuous,
  });
}

export function canonicalReconnection() {
  return fieldLineFlow("forallAnteOp", "botTopPrefix", true);
}

export function idealFieldLineFlow() {
  return fieldLineFlow("closure.op", "directedPrefix", false);
}

export function reconnectionCurvature(flow) {
  if (!reconnectionEvent(flow) || frozenIn(flow)) throw new TypeError("reconnectionCurvature: flow is frozen-in");
  return Object.freeze({
    kind: "relational.plasma.reconnection.curvature:witness",
    flow,
    reconnectionEvent: true,
    h1Nonzero: true,
    regimeCurved: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.frozen_in_iff_no_reconnection",
      "Obsmetrologia.Relational.Plasma.reconnection_event_implies_firing",
      "Obsmetrologia.Relational.Plasma.reconnection_event_implies_H1_nonzero",
      "Obsmetrologia.Relational.Plasma.reconnection_event_regime_curved",
    ]),
  });
}

export function idealFlowHasNoReconnection(flow = idealFieldLineFlow()) {
  if (reconnectionEvent(flow)) throw new TypeError("idealFlowHasNoReconnection: flow reconnects");
  return Object.freeze({
    kind: "relational.plasma.reconnection.ideal_no_reconnection:witness",
    flow,
    noReconnection: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.ideal_flow_has_no_reconnection",
      "Obsmetrologia.Relational.Plasma.flat_regime_forbids_reconnection_event",
    ]),
  });
}

export function plasmaReconnectionCurvatureReceipt() {
  return Object.freeze({
    kind: "relational.plasma.reconnection.receipt:witness",
    canonical: reconnectionCurvature(canonicalReconnection()),
    ideal: idealFlowHasNoReconnection(),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.ReconnectionCurvature",
  });
}
