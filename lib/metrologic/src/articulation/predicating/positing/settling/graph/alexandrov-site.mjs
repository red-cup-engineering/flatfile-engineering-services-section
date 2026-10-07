/**
 * @packageDocumentation
 *
 * sites/alexandrov - bounded Alexandrov/Husainov sub-site form.
 */
import {
  receipt as alexandrovHusainovReceipt,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/alexandrov-husainov";
import { siteForm } from "../site.mjs";

export const ALEXANDROV_SITE_ID = "metroplat/settlements/alexandrov";
export const ALEXANDROV_THEOREM_REFERENCE = "Obsmetrologia.Alexandrov.husainov_cech_acyclic_on_bounded_sites";

export function alexandrovSiteForm() {
  return siteForm({
    kind: "metroplat.site.form",
    id: ALEXANDROV_SITE_ID,
    name: "bounded-alexandrov-subsite",
    siteKind: "bounded-subsite",
    complexity: "bounded",
    proofStatus: "runtime-finite-receipt",
    theoremReference: ALEXANDROV_THEOREM_REFERENCE,
    objects: Object.freeze([
      "finite poset point",
      "Alexandrov open up-set",
      "bounded finite cover",
      "Cech acyclicity boundary",
    ]),
    morphisms: Object.freeze([
      "monotone maps are the continuous maps between finite Alexandrov spaces",
      "specialization recovers the poset order on the finite receipt",
    ]),
    covers: Object.freeze([
      "open covers are finite families of up-sets in a bounded Alexandrov site",
      "Cech H1 vanishes on the bounded strict/Scott side carried by the receipt",
    ]),
    bulk: {
      id: "metroplat/settlements/alexandrov/bulk",
      boundaries: Object.freeze([
        {
          id: "metroplat/settlements/alexandrov/boundary/topology",
          kind: "schema",
          address: "alexandrovHusainov.topology",
          description: "Finite Alexandrov topology receipt: up-sets, principal opens, finite intersections/unions, and specialization recovery.",
        },
        {
          id: "metroplat/settlements/alexandrov/boundary/continuous-monotone",
          kind: "evidence",
          address: "alexandrovHusainov.continuousMonotone",
          description: "Finite exhaustive receipt that monotone maps are continuous for Alexandrov spaces.",
        },
        {
          id: "metroplat/settlements/alexandrov/boundary/husainov",
          kind: "evidence",
          address: "alexandrovHusainov.husainovBoundary",
          description: "Documented Cech-side Husainov boundary for bounded finite sites.",
        },
      ]),
      constraints: Object.freeze([
        "this sub-site is finite and bounded",
        "derived-functor comparison is not implemented as a runtime receipt",
        "arbitrary Alexandrov intersections and non-finite sites remain proof/kernel obligations",
      ]),
    },
    frontier: Object.freeze([
      "Husainov Cech-vs-derived-functor comparison, injective/flasque resolutions, and non-finite Alexandrov spaces remain frontier material",
    ]),
  });
}

export function alexandrovSiteWitness() {
  return Object.freeze({
    kind: "metroplat.settlements.alexandrov.witness",
    site: ALEXANDROV_SITE_ID,
    form: alexandrovSiteForm(),
    receipt: alexandrovHusainovReceipt(),
  });
}
