/** Persistence boundary for SignCell typed marks in the EAVT record store.
 *
 * A SignCell reference's `type` is the declared data type (for example `Mark`),
 * while the store uses lowercase collection names. Keep that semantic reference
 * unchanged and resolve its address in the fixed `typed-mark` collection.
 */
const COLLECTION = "typed-mark";

/** Store the identity basis at the exact SignCell typed-mark address. */
export function putTypedMark(put, typedMark, referenceOf) {
  if (typeof put !== "function" || typeof referenceOf !== "function") throw new TypeError("typed-mark writer needs the current store and SignCell reference writers");
  const reference = referenceOf(typedMark);
  const basis = { kind: typedMark.kind, type: typedMark.type, content: typedMark.content };
  const address = put(COLLECTION, basis);
  if (address !== reference.id) throw new TypeError("typed-mark identity basis does not match its SignCell address");
  return reference;
}

/** Resolve a semantic reference from the typed-mark collection and re-admit it. */
export function getTypedMark(store, root, reference, type, admitTypedMark) {
  if (typeof store?.get !== "function" || typeof admitTypedMark !== "function" || !type) throw new TypeError("typed-mark reader needs the current store and SignCell receiver");
  if (reference?.type !== type.id || typeof reference.id !== "string") throw new TypeError("typed-mark reference does not name its declared SignCell type");
  const basis = store.get(root, COLLECTION, reference.id);
  if (!basis || basis.type !== reference.type) throw new TypeError("typed-mark address is absent or declares a different SignCell type");
  const admitted = admitTypedMark(type, { ...basis, id: reference.id });
  if (!admitted?.ok || admitted.value.id !== reference.id) throw new TypeError("stored typed-mark does not re-admit at its SignCell identity");
  return admitted.value;
}
