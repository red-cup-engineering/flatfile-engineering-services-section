/**
 * @packageDocumentation
 *
 * sites/settling - finite bitopological Grothendieck-basis site form.
 */
import { siteForm } from "../site.mjs";
import { receipt as bitopologicalSettlingSiteReceipt } from "../analysis/bitopological-settling-site.mjs";

export const SETTLING_SITE_ID = "metroplat/settlements/settling";
export const SETTLING_THEOREM_REFERENCE = "Obsmetrologia.Site.bitopological_site_grothendieck";

export function settlingSiteForm() {
  return siteForm({
    kind: "metroplat.site.form",
    id: SETTLING_SITE_ID,
    name: "bitopological-settling-site",
    siteKind: "grothendieck-site",
    complexity: "bounded",
    proofStatus: "lean-proved",
    theoremReference: SETTLING_THEOREM_REFERENCE,
    objects: Object.freeze(["predicate", "settling stratum", "pairwise-Stone clopen"]),
    morphisms: Object.freeze([
      "fixed-predicate fixed-stratum clopen inclusions are fiber morphisms",
      "settling-stratum advancement is a temporal morphism",
      "cross-stratum content is extracted later by direct limits, not by covers",
    ]),
    covers: Object.freeze([
      "fixed-fiber finite clopen join-covers",
      "identity, pullback, and transitive cover receipts satisfy the finite basis laws",
      "pure temporal families are not covering families",
    ]),
    bulk: {
      id: "metroplat/settlements/settling/bulk",
      boundaries: Object.freeze([
        {
          id: "metroplat/settlements/settling/boundary/receipt",
          kind: "schema",
          address: "bitopologicalSettlingSite.receipt",
          description: "Finite executable receipt for the bitopological settling site laws.",
        },
        {
          id: "metroplat/settlements/settling/boundary/cover",
          kind: "schema",
          address: "bitopologicalSettlingSite.cover",
          description: "Fixed-fiber clopen join-cover witness.",
        },
        {
          id: "metroplat/settlements/settling/boundary/no-temporal-covers",
          kind: "evidence",
          address: "bitopologicalSettlingSite.noTemporalCovers",
          description: "Receipt that temporal advance is morphism data, not topology.",
        },
      ]),
      constraints: Object.freeze([
        "temporal content lives in morphisms, not covers",
        "this runtime form stays within the strict finite fiber",
      ]),
    },
    frontier: Object.freeze([
      "general predicate reindexing and non-finite Grothendieck sites remain proof/kernel obligations",
    ]),
  });
}

export function settlingSiteWitness() {
  return Object.freeze({
    kind: "metroplat.settlements.settling.witness",
    site: SETTLING_SITE_ID,
    form: settlingSiteForm(),
    receipt: bitopologicalSettlingSiteReceipt(),
  });
}
