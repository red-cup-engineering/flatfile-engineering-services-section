/**
 * @packageDocumentation
 *
 * sites/enriched - charge-quantale-enriched site form.
 */
import {
  receipt as quantaleEnrichedSheafReceipt,

} from "../analysis/quantale-enriched-sheaf.mjs";
import { siteForm } from "../site.mjs";

export const ENRICHED_SITE_ID = "metroplat/settlements/enriched";
export const ENRICHED_THEOREM_REFERENCE = "Obsmetrologia.QEnriched.q_fuzzy_equivalence_composes";

export function enrichedSiteForm() {
  return siteForm({
    kind: "metroplat.site.form",
    id: ENRICHED_SITE_ID,
    name: "charge-quantale-enriched-site",
    siteKind: "enriched-site",
    complexity: "rich",
    proofStatus: "runtime-finite-receipt",
    theoremReference: ENRICHED_THEOREM_REFERENCE,
    objects: Object.freeze([
      "FOUR reading value",
      "reading quantale",
      "finite Q-category object",
      "Q-functor",
      "q-fuzzy equivalence grade",
      "degree-zero Laplacian fixed point",
    ]),
    morphisms: Object.freeze([
      "Q-functors preserve hom grades upward",
      "q-fuzzy equivalences compose by multiplying grades",
      "strict grade one recovers the round-trip unit bound",
    ]),
    covers: Object.freeze([
      "degree-zero enriched cohomology is carried as finite Laplacian fixedness",
      "full enriched Cech covers over arbitrary sites are not claimed by the runtime receipt",
    ]),
    bulk: {
      id: "metroplat/settlements/enriched/bulk",
      boundaries: Object.freeze([
        {
          id: "metroplat/settlements/enriched/boundary/quantale",
          kind: "schema",
          address: "quantaleEnrichedSheaf.readingQuantale",
          description: "Concrete FOUR/Charge quantale with knowledge order, meet multiplication, and finite suprema.",
        },
        {
          id: "metroplat/settlements/enriched/boundary/qcategory",
          kind: "schema",
          address: "quantaleEnrichedSheaf.qcategory",
          description: "Finite Q-category and Q-functor law receipt.",
        },
        {
          id: "metroplat/settlements/enriched/boundary/fuzzy-equivalence",
          kind: "evidence",
          address: "quantaleEnrichedSheaf.qFuzzyEquivalence",
          description: "Finite q-fuzzy equivalence composition receipt.",
        },
        {
          id: "metroplat/settlements/enriched/boundary/h0",
          kind: "evidence",
          address: "quantaleEnrichedSheaf.h0Laplacian",
          description: "Degree-zero enriched cohomology receipt as Laplacian fixed points.",
        },
      ]),
      constraints: Object.freeze([
        "the reading quantale is generated from FOUR/Charge",
        "Q-categories and functors are finite table structures here",
        "ordinary site/sheaf gluing remains upstream of this enrichment",
      ]),
    },
    frontier: Object.freeze([
      "arbitrary complete quantales, non-finite Q-categories, and full enriched Cech cohomology over arbitrary sites remain proof/topology work",
    ]),
  });
}

export function enrichedSiteWitness() {
  return Object.freeze({
    kind: "metroplat.settlements.enriched.witness",
    site: ENRICHED_SITE_ID,
    form: enrichedSiteForm(),
    receipt: quantaleEnrichedSheafReceipt(),
  });
}
