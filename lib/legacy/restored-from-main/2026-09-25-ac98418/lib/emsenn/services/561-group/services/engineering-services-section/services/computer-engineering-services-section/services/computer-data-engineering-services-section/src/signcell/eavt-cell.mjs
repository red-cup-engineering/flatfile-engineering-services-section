/** EAVT rows and charged cells: a row states its cell with witnessed potential
 *  (its time the witness); a charged cell gives back one row per present-side
 *  witness. The absent side is never a row: falsity is derived, not stated. */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { mark } from "./mark.mjs";

/** The cell an EAVT tuple states, charged with its witnessed potential. */
export function eavtToCell(row) {
  const [entity, attribute, value, time] = row;
  return { cell: { subject: entity, predicate: attribute, object: value }, charge: witnessedPotential(mark(time)) };
}

/** A charged cell's EAVT tuples, one per present-side witness. */
export function cellToEavt(charged) {
  const { subject: e, predicate: a, object: v } = charged.cell;
  return charged.charge.evidence[0].map((t) => [e, a, v, requireJsonValue(t.value, "time witness")]);
}
