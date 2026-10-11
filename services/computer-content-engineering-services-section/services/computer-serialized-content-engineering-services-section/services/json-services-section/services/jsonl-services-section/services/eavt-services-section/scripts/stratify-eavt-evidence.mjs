import { unique } from "./deduplicate-rows.mjs";
import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { saturateEavtTrace } from "./saturate-eavt-trace.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { closeStateView } from "@red-cup-engineering/eavt-services-section/ledger/state-fold";
import { costlierRegime } from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";
import { closeOrdinalProcess, closureProcess, closureReadout, stabilizingSup } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["subject", "rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["entity", "asserted", "saturated", "settled", "closure"],
});
const traceIdentity = (rows) => rows.map((row) => identifyContentAddressedRow({ row }).identity).join("\n");
const sameTrace = (left, right) => traceIdentity(left) === traceIdentity(right);
// σ as a closure process: iterate saturation from the asserted trace until it is its own
// saturation. Its stage and regime are the ordinal closure engine's readout, not declared.
function saturationPass(asserted, retract) {
  const lattice = { bottom: asserted, eq: sameTrace, sup: stabilizingSup({ eq: sameTrace }) };
  return closureReadout(closeOrdinalProcess(closureProcess(lattice, (rows) => saturateEavtTrace({ rows, retract }).rows)));
}
export function stratifyEavtEvidence(value = {}) {
  if (typeof value.subject !== "string" || value.subject.length === 0)
    throw new TypeError("subject must be a non-empty string");
  const retract = value.retract !== false,
    assertedTrace = unique(value.rows),
    saturatedTrace = saturateEavtTrace({ rows: assertedTrace, retract }).rows,
    saturated = saturatedTrace.filter((row) => row.e === value.subject),
    // Δ is the join of the subject's saturated rows (S ↦ S ∨ atoms): its stage and regime are
    // the state fold's own certified closure readout.
    transfer = closeStateView(saturated, new Set(value.functional ?? [])).readout,
    saturation = saturationPass(assertedTrace, retract),
    kappa = saturation.stage === null || transfer.stage === null ? null : Math.max(saturation.stage, transfer.stage);
  return {
    entity: value.subject,
    asserted: assertedTrace.filter((row) => row.e === value.subject),
    saturated,
    settled: foldEavtEvidence({
      ...value,
      rows: saturatedTrace,
      retract: false,
    }),
    closure: { saturation: saturation.stage, transfer: transfer.stage, kappa, regime: costlierRegime(saturation.regime, transfer.regime) },
  };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(stratifyEavtEvidence(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
