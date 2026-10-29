/**
 * articulating/utterance — the base object, base carrier, and base morphism.
 *
 * `Mark` is the opaque atom: an immutable carrier wrapping one present value.
 * Core code never inspects a Mark's payload as ordinary data — only a codec
 * boundary may. A `Token` (left hand) and a `Claim` (right hand) each carry a
 * Mark; an `Utterance = (Token, Claim)` is the base admission carrier; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism of relating normalizes back through `Mark → Utterance →
 * articulate`; this module is where that base lives.
 *
 * `UtteranceCarrier` is derived from the plain schema literal. The schema is the carrier's identity and runtime
 * law; this module supplies the declaration, constructors, and morphisms over it.
 */
import type { FromJsonSchema } from "./schema.d.mts";
import { Mark, MarkSchema, mark } from "./mark.mjs";
export { Mark, MarkSchema, mark };
export declare const TokenSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "hand", "mark"];
    readonly properties: {
        readonly kind: {
            readonly const: "utterance.token";
        };
        readonly hand: {
            readonly const: "left";
        };
        readonly mark: any;
    };
    readonly additionalProperties: false;
};
export declare const ClaimSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "hand", "mark"];
    readonly properties: {
        readonly kind: {
            readonly const: "utterance.claim";
        };
        readonly hand: {
            readonly const: "right";
        };
        readonly mark: any;
    };
    readonly additionalProperties: false;
};
/** The base admission carrier schema: one plain JSON-Schema literal with a bare `$id`. */
export declare const utteranceSchema: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "relating/articulating/utterance";
    readonly type: "object";
    readonly required: readonly ["kind", "token", "claim"];
    readonly properties: {
        kind: {
            const: string;
        };
        token: {
            readonly type: "object";
            readonly required: readonly ["kind", "hand", "mark"];
            readonly properties: {
                readonly kind: {
                    readonly const: "utterance.token";
                };
                readonly hand: {
                    readonly const: "left";
                };
                readonly mark: any;
            };
            readonly additionalProperties: false;
        };
        claim: {
            readonly type: "object";
            readonly required: readonly ["kind", "hand", "mark"];
            readonly properties: {
                readonly kind: {
                    readonly const: "utterance.claim";
                };
                readonly hand: {
                    readonly const: "right";
                };
                readonly mark: any;
            };
            readonly additionalProperties: false;
        };
    };
    readonly additionalProperties: false;
    readonly title: "UtteranceCarrier";
    readonly description: "The base admission carrier: a token and a claim, each carrying a Mark.";
};
/** The base admission carrier type, derived from `utteranceSchema`. */
export type UtteranceCarrier = FromJsonSchema<typeof utteranceSchema>;
/** The articulation cell carrier schema opened from an utterance. */
export declare const articulationCellSchema: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "relating/articulating/articulation-cell";
    readonly type: "object";
    readonly required: readonly ["kind", "potentialAperiodicArticulationCell"];
    readonly properties: {
        kind: {
            const: string;
        };
        potentialAperiodicArticulationCell: {
            type: string;
            prefixItems: ({
                readonly $schema: "https://json-schema.org/draft/2020-12/schema";
                readonly $id: "relating/articulating/utterance";
                readonly type: "object";
                readonly required: readonly ["kind", "token", "claim"];
                readonly properties: {
                    kind: {
                        const: string;
                    };
                    token: {
                        readonly type: "object";
                        readonly required: readonly ["kind", "hand", "mark"];
                        readonly properties: {
                            readonly kind: {
                                readonly const: "utterance.token";
                            };
                            readonly hand: {
                                readonly const: "left";
                            };
                            readonly mark: any;
                        };
                        readonly additionalProperties: false;
                    };
                    claim: {
                        readonly type: "object";
                        readonly required: readonly ["kind", "hand", "mark"];
                        readonly properties: {
                            readonly kind: {
                                readonly const: "utterance.claim";
                            };
                            readonly hand: {
                                readonly const: "right";
                            };
                            readonly mark: any;
                        };
                        readonly additionalProperties: false;
                    };
                };
                readonly additionalProperties: false;
                readonly title: "UtteranceCarrier";
                readonly description: "The base admission carrier: a token and a claim, each carrying a Mark.";
            } | {
                type: string;
                prefixItems: ({
                    type: string;
                    prefixItems: {
                        readonly type: "object";
                        readonly required: readonly ["kind", "hand", "mark"];
                        readonly properties: {
                            readonly kind: {
                                readonly const: "utterance.token";
                            };
                            readonly hand: {
                                readonly const: "left";
                            };
                            readonly mark: any;
                        };
                        readonly additionalProperties: false;
                    }[];
                    minItems: number;
                    maxItems: number;
                    items: boolean;
                } | {
                    type: string;
                    minItems: number;
                    maxItems: number;
                    items: boolean;
                    prefixItems?: undefined;
                })[];
                minItems: number;
                maxItems: number;
                items: boolean;
            })[];
            minItems: number;
            maxItems: number;
            items: boolean;
        };
    };
    readonly additionalProperties: false;
    readonly title: "ArticulationCell";
    readonly description: "An utterance opened at its potential aperiodic articulation cell.";
};
/** A token: the immutable left-hand utterance carrier holding one mark. */
export declare class Token {
    readonly kind: "utterance.token";
    readonly hand: "left";
    readonly mark: Mark;
    constructor(mark: Mark);
}
/** A claim: the immutable right-hand utterance carrier holding one mark. */
export declare class Claim {
    readonly kind: "utterance.claim";
    readonly hand: "right";
    readonly mark: Mark;
    constructor(mark: Mark);
}
/** The two RelMath mark roles: identity-bearing token and content-bearing claim. */
export type MarkKind = "token" | "claim";
/** The complete finite enumeration of `RelMath.Mark.Kind`. */
export declare const markKinds: readonly MarkKind[];
/** Decide membership in the two-element mark-kind carrier. */
export declare const isMarkKind: (kind: unknown) => kind is MarkKind;
/** `RelMath.Mark.Kind.two_kinds`: every mark kind is token or claim. */
export declare const markKindTwoKinds: (kind: MarkKind) => boolean;
/** `RelMath.Mark.Kind.token_ne_claim`: the two mark roles are distinct. */
export declare const tokenNeClaim: () => true;
/** The token-side slot of an aperiodic articulation cell. */
export type TokenArticulationSlot = readonly [] | readonly [Token];
/** The claim-side slot of an aperiodic articulation cell. */
export type ClaimArticulationSlot = readonly [] | readonly [Claim];
/** The pairing term of an aperiodic articulation cell. */
export type AperiodicArticulationPairing = readonly [TokenArticulationSlot, ClaimArticulationSlot];
/** An aperiodic articulation cell: a carrier utterance plus its two slots. */
export type AperiodicArticulationCell = readonly [UtteranceCarrier, AperiodicArticulationPairing];
/** The potential aperiodic articulation cell: the token is present and the claim is not. */
export type PotentialAperiodicArticulationCell = readonly [UtteranceCarrier, readonly [readonly [Token], readonly []]];
/** The articulation cell `articulate` opens, carrying the potential aperiodic cell. */
export interface ArticulationCell {
    readonly kind: "utterance.articulation.cell";
    readonly potentialAperiodicArticulationCell: PotentialAperiodicArticulationCell;
}
export interface ArticulatingUtter {
    readonly kind: "articulating.utter";
    readonly utterance: UtteranceCarrier;
}
export interface ArticulatingPair {
    readonly kind: "articulating.pair";
    readonly utterance: UtteranceCarrier;
    readonly articulating: Articulating;
}
/** Finite recursive carrier for `RelMath.Articulating`. */
export type Articulating = ArticulatingUtter | ArticulatingPair;
/** A witness that two marks coincide. */
export interface MarkCoincidenceWitness<Carrier> {
    readonly kind: "utterance.coincidence:witness";
    readonly left: Carrier;
    readonly right: Carrier;
}
/** An obstruction to two marks coinciding. */
export interface MarkCoincidenceObstruction<Carrier> {
    readonly kind: "utterance.coincidence-obstruction";
    readonly left: Carrier;
    readonly right: Carrier;
}
/** The result of judging two token/claim carriers coincident. */
export type TokenIdentityJudgment = MarkCoincidenceWitness<Token> | MarkCoincidenceObstruction<Token>;
/** The result of judging two claim carriers coincident. */
export type ClaimIdentityJudgment = MarkCoincidenceWitness<Claim> | MarkCoincidenceObstruction<Claim>;
/** Constructs a Mark wrapping the given value. */
/** Constructs a Token from the given mark. */
export declare function token(markCarrier: Mark): Token;
/** Constructs a Claim from the given mark. */
export declare function claim(markCarrier: Mark): Claim;
/** Constructs an utterance carrier from two marks: left becomes a token, right a claim. */
export declare function utterance(left: Mark, right: Mark): UtteranceCarrier;
/** The innermost `RelMath.Articulating.utter` constructor. */
export declare function articulatingUtter(carrier: UtteranceCarrier): ArticulatingUtter;
/** The recursive `RelMath.Articulating.pair` constructor. */
export declare function articulatingPair(carrier: UtteranceCarrier, nested: Articulating): ArticulatingPair;
/** `RelMath.Articulating.head`: the utterance at the head of the recursion. */
export declare function articulatingHead(carrier: Articulating): UtteranceCarrier;
/** `RelMath.Articulating.depth`: the finite recursion depth to the primitive floor. */
export declare function articulatingDepth(carrier: Articulating): number;
/** `RelMath.Articulating.floor`: the innermost utterance at the primitive floor. */
export declare function articulatingFloor(carrier: Articulating): UtteranceCarrier;
/** `RelMath.Articulating.utter_ne_pair`: the two constructors remain distinguishable. */
export declare function articulatingUtterNePair(_u: UtteranceCarrier, _v: UtteranceCarrier, _a: Articulating): true;
/** Whether two mark payloads coincide: identical primitives, or structurally
 *  equal plain JSON. This is the only place core code reads a Mark payload, and
 *  it reads it only to judge coincidence — never to branch on its content.
 *
 *  Structural (value) coincidence, not reference identity: this package is
 *  boundary-first, so carriers are routinely reconstructed from JSON with no
 *  shared references. Coincidence must survive a transport round-trip; reference
 *  identity would not. (This is the one deliberate divergence from the prior
 *  reference-identity carrier coincidence.) */
export declare function coincides(left: unknown, right: unknown): boolean;
/** Structural guard for a Mark carrier. Boundary-first: a Mark rehydrated from JSON
 *  is a plain object, not a class instance, so membership is judged by shape (kind +
 *  a present value), the same stance `coincides` takes — never by `instanceof`, which
 *  would not survive a transport round-trip. */
export declare function isMark(value: unknown): value is Mark;
/** Judges whether two tokens coincide: a witness when their marks coincide, else an obstruction. */
export declare function tokenIdentity(left: Token, right: Token): TokenIdentityJudgment;
/** Judges whether two claims coincide: a witness when their marks coincide, else an obstruction. */
export declare function claimIdentity(left: Claim, right: Claim): ClaimIdentityJudgment;
/**
 * Articulates an utterance carrier: opens the aperiodic articulation category at
 * its potential cell. The carrier's token occupies the token slot and the claim
 * slot remains empty: the raw articulation status is exactly (true, false).
 */
export declare function articulate(carrier: UtteranceCarrier): ArticulationCell;
/** Type guard for the potential (token-present, claim-empty) articulation cell. */
export declare function isArticulationCell(value: object): value is ArticulationCell;

export declare const markBoundarySchema: any;
export type MarkObservationAuthority = "boundary-admission" | "coincidence-witness" | "projection-lens" | "opacity-violation";
export interface MarkObservationReport {
    readonly kind: "utterance.mark-observation";
    readonly authority: MarkObservationAuthority;
    readonly permitted: boolean;
    readonly lens?: string;
    readonly witness?: string;
    readonly reason: string;
}
export declare function markObservationReport(authority: MarkObservationAuthority, permitted: boolean, reason: string, details?: Pick<MarkObservationReport, "lens" | "witness">): MarkObservationReport;
