import { Mark, MarkSchema, mark, coincides, isMark } from "./mark.mjs";
import { canonicalCarrier } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
export { Mark, MarkSchema, mark, coincides, isMark };
export const TokenSchema = {
    type: "object",
    required: ["kind", "hand", "mark"],
    properties: {
        kind: { const: "utterance.token" },
        hand: { const: "left" },
        mark: MarkSchema,
    },
    additionalProperties: false,
};
export const ClaimSchema = {
    type: "object",
    required: ["kind", "hand", "mark"],
    properties: {
        kind: { const: "utterance.claim" },
        hand: { const: "right" },
        mark: MarkSchema,
    },
    additionalProperties: false,
};
/** The base admission carrier shape: token + claim, each carrying a Mark. */
const utteranceShape = {
    kind: { const: "utterance.carrier" },
    token: TokenSchema,
    claim: ClaimSchema,
};
/** The base admission carrier schema: one plain JSON-Schema literal with a bare `$id`. */
export const utteranceSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "relating/articulating/utterance",
    type: "object",
    required: ["kind", "token", "claim"],
    properties: utteranceShape,
    additionalProperties: false,
    title: "UtteranceCarrier",
    description: "The base admission carrier: a token and a claim, each carrying a Mark.",
};
/** The articulation cell carrier shape opened from an utterance. */
const articulationCellShape = {
    kind: { const: "utterance.articulation.cell" },
    potentialAperiodicArticulationCell: {
        type: "array",
        prefixItems: [
            utteranceSchema,
            {
                type: "array",
                prefixItems: [
                    { type: "array", prefixItems: [TokenSchema], minItems: 1, maxItems: 1, items: false },
                    { type: "array", minItems: 0, maxItems: 0, items: false },
                ],
                minItems: 2,
                maxItems: 2,
                items: false,
            },
        ],
        minItems: 2,
        maxItems: 2,
        items: false,
    },
};
/** The articulation cell carrier schema opened from an utterance. */
export const articulationCellSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "relating/articulating/articulation-cell",
    type: "object",
    required: ["kind", "potentialAperiodicArticulationCell"],
    properties: articulationCellShape,
    additionalProperties: false,
    title: "ArticulationCell",
    description: "An utterance opened at its potential aperiodic articulation cell.",
};
/** A token: the frozen left-hand utterance carrier holding one mark. Callable with or without `new`. */
export function Token(mark) {
    return canonicalCarrier({ kind: "utterance.token", hand: "left", mark });
}
/** A claim: the frozen right-hand utterance carrier holding one mark. Callable with or without `new`. */
export function Claim(mark) {
    return canonicalCarrier({ kind: "utterance.claim", hand: "right", mark });
}
/** The complete finite enumeration of `RelMath.Mark.Kind`. */
export const markKinds = Object.freeze(["token", "claim"]);
/** Decide membership in the two-element mark-kind carrier. */
export const isMarkKind = (kind) => kind === "token" || kind === "claim";
/** `RelMath.Mark.Kind.two_kinds`: every mark kind is token or claim. */
export const markKindTwoKinds = (kind) => markKinds.includes(kind);
/** `RelMath.Mark.Kind.token_ne_claim`: the two mark roles are distinct — a token and a claim on
 *  the same mark never coincide. */
export const tokenNeClaim = (markCarrier = mark(null)) => !coincides(token(markCarrier), claim(markCarrier));
/** Constructs a Mark wrapping the given value. */
/** Constructs a Token from the given mark. */
export function token(markCarrier) {
    return Token(markCarrier);
}
/** Constructs a Claim from the given mark. */
export function claim(markCarrier) {
    return Claim(markCarrier);
}
/** A hand's datum let in as a Mark: a datum already a Mark is that Mark (marking is idempotent). */
const marked = (datum) => isMark(datum) ? canonicalCarrier(datum) : mark(datum);
/** Constructs an utterance carrier from two hands: left becomes a token, right a claim, each
 *  carrying the Mark of its datum. This is the one utterance (`RelMath.Utterance`). */
export function utterance(left, right) {
    return canonicalCarrier({ kind: "utterance.carrier", token: token(marked(left)), claim: claim(marked(right)) });
}
/** `RelMath.Utterance.at_`: the Mark an utterance carries at a mark kind. */
export function utteranceAt(carrier, kind) {
    if (kind === "token") return carrier.token.mark;
    if (kind === "claim") return carrier.claim.mark;
    throw new TypeError(`utteranceAt: a mark kind is token or claim, not ${JSON.stringify(kind)}`);
}
/** The datum an utterance's token hand marks. */
export const tokenValue = (carrier) => utteranceAt(carrier, "token").value;
/** The datum an utterance's claim hand marks. */
export const claimValue = (carrier) => utteranceAt(carrier, "claim").value;
/** Whether a value is an utterance carrier (by shape, so a decoded carrier qualifies). */
export const isUtterance = (value) => value !== null && typeof value === "object"
    && value.kind === "utterance.carrier" && value.token?.kind === "utterance.token" && value.claim?.kind === "utterance.claim"
    && isMark(value.token.mark) && isMark(value.claim.mark);
/**
 * Articulate an evidence record as its underlying utterance.  A binary claim
 * uses its subject as the token; a ternary claim uses the subject/object pair.
 * Provenance deliberately stays outside the carrier: it describes evidence,
 * rather than changing the cell the utterance names.
 */
export function utterEvidence(entry) {
    if (entry === null || typeof entry !== "object")
        throw new TypeError("utterEvidence: expected an evidence record");
    const valueOf = (input) => isMark(input) ? input.value : input;
    const tokenDatum = entry.object === undefined
        ? valueOf(entry.subject)
        : Object.freeze({ subject: valueOf(entry.subject), object: valueOf(entry.object) });
    return utterance(tokenDatum, valueOf(entry.predicate));
}
/** Form utterance carriers for evidence records in their supplied order. */
export function utterEvidenceSet(entries) {
    return Object.freeze([...entries].map(utterEvidence));
}
/** The innermost `RelMath.Articulating.utter` constructor. */
export function articulatingUtter(carrier) {
    return canonicalCarrier({ kind: "articulating.utter", utterance: carrier });
}
/** The recursive `RelMath.Articulating.pair` constructor. */
export function articulatingPair(carrier, nested) {
    return canonicalCarrier({ kind: "articulating.pair", utterance: carrier, articulating: nested });
}
/** `RelMath.Articulating.head`: the utterance at the head of the recursion. */
export function articulatingHead(carrier) {
    return carrier.utterance;
}
/** `RelMath.Articulating.depth`: the finite recursion depth to the primitive floor. */
export function articulatingDepth(carrier) {
    return carrier.kind === "articulating.utter" ? 0 : articulatingDepth(carrier.articulating) + 1;
}
/** `RelMath.Articulating.floor`: the innermost utterance at the primitive floor. */
export function articulatingFloor(carrier) {
    return carrier.kind === "articulating.utter" ? carrier.utterance : articulatingFloor(carrier.articulating);
}
/** `RelMath.Articulating.utter_ne_pair`: the two constructors remain distinguishable. */
export function articulatingUtterNePair(u, v, a) {
    return !coincides(articulatingUtter(u), articulatingPair(v, a));
}
/** Judges whether two tokens coincide: a witness when their marks coincide, else an obstruction. */
export function tokenIdentity(left, right) {
    return coincides(left.mark.value, right.mark.value)
        ? Object.freeze({ kind: "utterance.coincidence:witness", left, right })
        : Object.freeze({ kind: "utterance.coincidence-obstruction", left, right });
}
/** Judges whether two claims coincide: a witness when their marks coincide, else an obstruction. */
export function claimIdentity(left, right) {
    return coincides(left.mark.value, right.mark.value)
        ? Object.freeze({ kind: "utterance.coincidence:witness", left, right })
        : Object.freeze({ kind: "utterance.coincidence-obstruction", left, right });
}
/**
 * Articulates an utterance carrier: opens the aperiodic articulation category at
 * its potential cell. The carrier's token occupies the token slot and the claim
 * slot remains empty: the raw articulation status is exactly (true, false).
 */
export function articulate(carrier) {
    const pairing = Object.freeze([Object.freeze([carrier.token]), Object.freeze([])]);
    return Object.freeze({
        kind: "utterance.articulation.cell",
        potentialAperiodicArticulationCell: Object.freeze([carrier, pairing]),
    });
}
/** Type guard for the potential (token-present, claim-empty) articulation cell. */
export function isArticulationCell(value) {
    const kind = "kind" in value ? value.kind : undefined;
    const cell = "potentialAperiodicArticulationCell" in value ? value.potentialAperiodicArticulationCell : undefined;
    return kind === "utterance.articulation.cell"
        && Array.isArray(cell)
        && cell.length === 2
        && typeof cell[0] === "object"
        && cell[0] !== null
        && "kind" in cell[0]
        && cell[0].kind === "utterance.carrier"
        && Array.isArray(cell[1])
        && cell[1].length === 2
        && Array.isArray(cell[1][0])
        && cell[1][0].length === 1
        && typeof cell[1][0][0] === "object"
        && cell[1][0][0] !== null
        && cell[1][0][0].kind === "utterance.token"
        && cell[1][0][0].mark?.value !== undefined && cell[0].token?.mark?.value !== undefined
        && coincides(cell[1][0][0].mark.value, cell[0].token.mark.value)
        && Array.isArray(cell[1][1])
        && cell[1][1].length === 0;
}

export const markBoundarySchema = {
    $id: "metroplat/articulation/mark-boundary",
    ...MarkSchema,
    title: "MarkBoundary",
    description: "The opaque raw mark boundary admitted before token/claim pairing.",
};
export function markObservationReport(authority, permitted, reason, details = {}) {
    return Object.freeze({ kind: "utterance.mark-observation", authority, permitted, reason, ...details });
}
