/**
 * A typed mark: a Mark whose interpretation is selected by a named data type.
 *
 * A Mark is an opaque present datum whose interpretation belongs to its consumer
 * (`mark.mjs`); a typed mark is that specialization stated once. Its content is the
 * canonical form of what the type admitted, and its identity is the content address of
 * `{ kind, type, content }`. Referenced from a predication, a typed mark fills the
 * subject or object slot, the role Obsmetrologia's `Predicating.Entity` names.
 *
 * It is not a cell: a cell is a predication triple with its witnesses (`cell.mjs`).
 * The wire kind `"sign.cell"` predates that distinction and stays, because it is part
 * of every stored typed mark's address.
 */
import { canonicalCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { typedMarkType, semanticReferenceType as typedMarkReferenceType } from "./semantic-carriers.mjs";

const TYPED_MARK = "sign.cell";
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });

export const typedMarkIdentity = (type, content) => semanticId(Object.freeze({ kind: TYPED_MARK, type, content }));
/** Construct one typed mark only after its named data type admits its content. */
export function createTypedMark(type, content) {
  const admitted = admit(type, content);
  if (!admitted.ok) return refused("invalid-content", admitted.refusal.issues.map(issue => `${issue.path || "/"} ${issue.message}`).join("; "));
  try {
    const canonical = canonicalCarrier(admitted.value);
    return accepted(canonicalCarrier({ kind: TYPED_MARK, id: typedMarkIdentity(type.id, canonical), type: type.id, content: canonical }));
  } catch (error) { return refused("invalid-content", error instanceof Error ? error.message : String(error)); }
}
/** Re-admit an addressed typed mark against the receiver's type declaration. */
export function admitTypedMark(type, input) {
  const carrier = admit(typedMarkType, input);
  if (!carrier.ok) return refused("invalid-cell", "typed mark must have kind, id, declared type, and content");
  if (carrier.value.type !== type.id) return refused("invalid-cell", "typed mark's declared type does not match the receiving data type");
  const created = createTypedMark(type, carrier.value.content);
  if (!created.ok) return created;
  return carrier.value.id === created.value.id ? created : refused("identity-mismatch", "typed mark's bytes do not match its advertised identity");
}
/** Check the portable carrier and its address when the content type is intentionally unresolved. */
export function admitTypedMarkCarrier(input) {
  const carrier = admit(typedMarkType, input);
  if (!carrier.ok) return refused("invalid-cell", "typed mark must have kind, id, declared type, and content");
  try {
    const value = canonicalCarrier(carrier.value);
    return value.id === typedMarkIdentity(value.type, value.content) ? accepted(value) : refused("identity-mismatch", "typed mark's bytes do not match its advertised identity");
  } catch (error) { return refused("invalid-content", error instanceof Error ? error.message : String(error)); }
}
export function referenceOf(typedMark) {
  return Object.freeze({ id: typedMark.id, type: typedMark.type });
}
/** Generated schema type for relation endpoint admission. */
export { typedMarkReferenceType };
