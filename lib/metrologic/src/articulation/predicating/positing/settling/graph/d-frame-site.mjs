/**
 * @packageDocumentation
 *
 * sites/dframe - d-frame-valued refinement of the settling site.
 */
import {
  receipt as dFrameReceipt,

} from "../analysis/d-frame.mjs";
import { siteForm } from "../site.mjs";

export const DFRAME_SITE_ID = "metroplat/settlements/dframe";
export const DFRAME_THEOREM_REFERENCE = "Obsmetrologia.DFrame.dframe_valued_sheaf";

export function dframeSiteForm() {
  return siteForm({
    kind: "metroplat.site.form",
    id: DFRAME_SITE_ID,
    name: "d-frame-valued-site",
    siteKind: "enriched-site",
    complexity: "rich",
    proofStatus: "runtime-finite-receipt",
    theoremReference: DFRAME_THEOREM_REFERENCE,
    objects: Object.freeze([
      "positive frame",
      "negative frame",
      "consistency relation",
      "totality relation",
      "clopen valuation mask",
    ]),
    morphisms: Object.freeze([
      "restriction along a clopen mask is meet-preserving",
      "restriction is monotone and preserves consistency in the finite receipt",
    ]),
    covers: Object.freeze([
      "totality is read as a two-sided covering relation",
      "consistency and totality refine the same finite settling support",
    ]),
    bulk: {
      id: "metroplat/settlements/dframe/bulk",
      boundaries: Object.freeze([
        {
          id: "metroplat/settlements/dframe/boundary/powerset-frame",
          kind: "schema",
          address: "dFrame.powersetFrame",
          description: "Finite powerset-frame receipt with meet and finite-sup laws.",
        },
        {
          id: "metroplat/settlements/dframe/boundary/canonical",
          kind: "schema",
          address: "dFrame.canonical",
          description: "Canonical bitopological d-frame: consistency is disjointness and totality is covering.",
        },
        {
          id: "metroplat/settlements/dframe/boundary/valued-sheaf",
          kind: "evidence",
          address: "dFrame.valuedSheaf",
          description: "Finite d-frame-valued settling sheaf receipt over valued cells and clopen masks.",
        },
      ]),
      constraints: Object.freeze([
        "ordinary fixed-fiber site and sheaf restriction are upstream of this refinement",
        "finite powerset frames stand in for the runtime receipt only",
        "general d-frame morphism categories and non-finite frame-valued cohomology are not runtime receipts",
      ]),
    },
    frontier: Object.freeze([
      "arbitrary Prop-valued frames, infinitary suprema, general d-frame morphism categories, and non-finite frame-valued sheaf cohomology remain proof/kernel obligations",
    ]),
  });
}

export function dframeSiteWitness() {
  return Object.freeze({
    kind: "metroplat.settlements.dframe.witness",
    site: DFRAME_SITE_ID,
    form: dframeSiteForm(),
    receipt: dFrameReceipt(),
  });
}
