import { defineType, instantiate } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { canonicalCarrier, coincides } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
/** Opaque present datum: a semiotic carrier, so it has a content address. Payload
 *  interpretation belongs to the selected type or codec. */
export const MarkSchema = {
    type: "object", required: ["kind", "value"],
    properties: { kind: { const: "utterance.mark" }, value: {} },
    additionalProperties: false,
};
const definition = defineType({
    id: "Mark", name: "Mark", description: "An opaque present datum whose interpretation belongs to its consumer.",
    schema: MarkSchema, parents: [],
});
if (!definition.ok)
    throw new TypeError(definition.refusal.message);
/** The common Mark admission contract; specialize its value for an interpreted datum. */
export const MarkType = definition.value;
/** A Mark: a frozen plain carrier, so it is itself content-addressable and survives a transport
 *  round-trip unchanged. Callable with or without `new`. */
export function Mark(value) {
    const carrier = canonicalCarrier({ kind: "utterance.mark", value });
    if (!instantiate(MarkType, carrier).ok)
        throw new TypeError("Mark: value must be present");
    return carrier;
}
export function mark(value) { return Mark(value); }


/** Whether two mark payloads coincide: one content address (identical canonical CBOR).
 *  This is the only place core code reads a Mark payload, and it reads it only to judge
 *  coincidence, never to branch on its content. Content identity survives a transport
 *  round-trip, as reference identity would not. */
export { coincides };

/** Structural guard for a Mark carrier. Boundary-first: a Mark rehydrated from JSON
 *  is a plain object, not a class instance, so membership is judged by shape (kind +
 *  a present value), as content coincidence is — never by `instanceof`, which
 *  would not survive a transport round-trip. */
export function isMark(value) {
    return instantiate(MarkType, value).ok;
}
