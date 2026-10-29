/**
 * positing/bilattice-charge — the four-valued bilattice of charge.
 *
 * Belnap's FOUR as a charge: a pair of independent sides (truth, falsity), each
 * "absent" or "present", naming `absurd` (neither), `potential` (truth only),
 * `active` (falsity only), `stable` (both). A `ChargeCarrier` also bears the
 * evidence — the witness Marks — accumulated on each side. Two orders share the
 * underlying sides: the KNOWLEDGE order grows both sides; the TRUTH order grows
 * truth and shrinks falsity. Negation swaps the sides; conflation complements and
 * swaps; together with identity and their composite they form the Klein-four
 * gauge group acting on the values.
 *
 * Charges are never admitted directly — they are constructed from evidence and
 * joined; positing/settling derive them. Evidence is deduped by STRUCTURAL
 * content coincidence (this package is content-addressed and boundary-first), so
 * two witnesses with equal payloads count once and survive a transport round-trip.
 */
import type { FromJsonSchema } from "./schema.d.mts";
import { Mark } from "./mark.mjs";
import { type TwistValue } from "./twist-product.mjs";
/** The four bilattice charge value names. */
import type { ChargeValueName } from "./generated/semantic-carriers.mjs";
export type { ChargeValueName } from "./generated/semantic-carriers.mjs";
/** A charge side coordinate name. */
export type ChargeSideName = "absent" | "present";
/** One side coordinate of a charge. */
export type ChargeSide = FromJsonSchema<typeof ChargeSideSchema>;
/** A charge point: [truth, falsity] sides. */
export type ChargeCoordinates = TwistValue<ChargeSide>;
/** A named point of the four-element bilattice. */
export interface ChargeValue {
    readonly kind: "bilattice-charge.value";
    readonly name: ChargeValueName;
    readonly coordinates: ChargeCoordinates;
}
/** A charge bearing evidence: the side coordinates and the witness lists per side. */
export type ChargeCarrier = FromJsonSchema<typeof ChargeCarrierSchema>;
export declare const ChargeSideSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "name"];
    readonly properties: {
        readonly kind: {
            readonly const: "bilattice-charge.side";
        };
        readonly name: {
            readonly enum: readonly ["absent", "present"];
        };
    };
    readonly additionalProperties: false;
};
export declare const ChargeCarrierSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "value", "evidence"];
    readonly properties: {
        readonly kind: {
            readonly const: "bilattice-charge.carrier";
        };
        readonly value: {
            readonly type: "array";
            readonly prefixItems: readonly [{
                readonly type: "object";
                readonly required: readonly ["kind", "name"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "bilattice-charge.side";
                    };
                    readonly name: {
                        readonly enum: readonly ["absent", "present"];
                    };
                };
                readonly additionalProperties: false;
            }, {
                readonly type: "object";
                readonly required: readonly ["kind", "name"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "bilattice-charge.side";
                    };
                    readonly name: {
                        readonly enum: readonly ["absent", "present"];
                    };
                };
                readonly additionalProperties: false;
            }];
            readonly minItems: 2;
            readonly maxItems: 2;
            readonly items: false;
        };
        readonly evidence: {
            readonly type: "array";
            readonly prefixItems: readonly [{
                readonly type: "array";
                readonly items: any;
            }, {
                readonly type: "array";
                readonly items: any;
            }];
            readonly minItems: 2;
            readonly maxItems: 2;
            readonly items: false;
        };
    };
    readonly description: "A charge bearing evidence: the [truth, falsity] side coordinates and the witness Marks per side.";
    readonly additionalProperties: false;
};
/** The finite carrier of the charge bilattice: its sides and four values. */
export interface ChargeFiniteAlgebraCarrier {
    readonly kind: "bilattice-charge.finiteAlgebra";
    readonly sides: readonly ChargeSide[];
    readonly values: readonly ChargeValue[];
}
/** An ordered pair of charges. */
export interface ChargePair {
    readonly left: ChargeCarrier;
    readonly right: ChargeCarrier;
}
/** All charge side names. */
export declare const chargeSideNames: readonly ChargeSideName[];
/** All charge value names. */
export declare const chargeValueNames: readonly ChargeValueName[];
/** Construct a charge side. */
export declare const chargeSide: (name: ChargeSideName) => ChargeSide;
/** Construct a charge value by name, resolving its side coordinates.
 *
 * @example
 * ```ts
 * chargeValue("active").coordinates.map(chargeSideName)
 * // ["absent", "present"]
 * ```
 */
export declare function chargeValue(name: ChargeValueName): ChargeValue;
/** All four charge values. */
export declare const chargeValues: readonly ChargeValue[];
/** The finite-algebra carrier of the charge bilattice. */
export declare const chargeFiniteAlgebra: ChargeFiniteAlgebraCarrier;
/** The name of a charge side. */
export declare const chargeSideName: (side: ChargeSide) => ChargeSideName;
/** The name of a charge value. */
export declare const chargeValueName: (value: ChargeValue) => ChargeValueName;
/** The two-coordinate specialization of the shared twist-product program. */
export declare const chargeTwist: any;
/** Whether a string names a charge value. */
export declare function isChargeValueName(value: string): value is ChargeValueName;
/** Whether a string names a charge side. */
export declare function isChargeSideName(value: string | undefined): value is ChargeSideName;
/** Type guard for a charge side. */
export declare function isChargeSide(value: unknown): value is ChargeSide;
/** Type guard for a charge value. */
export declare function isChargeValue(value: unknown): value is ChargeValue;
/** Type guard for a charge carrier. */
export declare function isCharge(value: unknown): value is ChargeCarrier;
/** Coerce a string to a charge value name, or throw. */
export declare function asChargeValueName(value: string): ChargeValueName;
/** Coerce a value or name to a charge value. */
export declare function asChargeValue(value: ChargeValue | ChargeValueName): ChargeValue;
/** Construct a charge carrier from a value and optional evidence. */
export declare function charge(value: ChargeValue, evidence?: readonly [readonly Mark[], readonly Mark[]]): ChargeCarrier;
/** The coordinate pair a charge carries. */
export declare const present: (c: ChargeCarrier) => ChargeCoordinates;
/** Whether two charge values name the same value. */
export declare const sameChargeValue: (left: ChargeValue, right: ChargeValue) => boolean;
/** Whether two charge carriers denote the same value. */
export declare function sameCharge(left: ChargeCarrier, right: ChargeCarrier): boolean;
/** The charge value named by a carrier's coordinates. */
export declare function valueOf(c: ChargeCarrier): ChargeValue;
/** Name a point of the finite charge specialization. */
export declare function chargeValueAt([truth, falsity]: ChargeCoordinates): ChargeValue;
/** The knowledge-order bottom: absurd with no evidence. */
export declare const bottom: ChargeCarrier;
/** A potential carrier whose positive side carries the given witness. */
export declare const witnessedPotential: (witness: Mark) => ChargeCarrier;
/** Negate a charge: swap truth and falsity sides and their evidence. */
export declare function negate(c: ChargeCarrier): ChargeCarrier;
/** Conflate a charge: complement and swap both sides, keeping evidence. */
export declare function conflate(c: ChargeCarrier): ChargeCarrier;
/** Knowledge-order join: both sides grow. */
export declare const joinKnowledge: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier;
/** Knowledge-order meet: both sides shrink. */
export declare const meetKnowledge: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier;
/** Truth-order join: truth grows, falsity shrinks. */
export declare const joinTruth: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier;
/** Truth-order meet: truth shrinks, falsity grows. */
export declare const meetTruth: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier;
/** Knowledge-order join of values (evidence ignored).
 *
 * @example
 * ```ts
 * chargeValueName(joinKnowledgeValue(chargeValue("active"), chargeValue("stable")))
 * // "stable"
 * ```
 */
export declare const joinKnowledgeValue: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** Knowledge-order meet of values. */
export declare const meetKnowledgeValue: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** Truth-order join of values. */
export declare const joinTruthValue: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** Truth-order meet of values. */
export declare const meetTruthValue: (left: ChargeValue, right: ChargeValue) => ChargeValue;
/** Negation of a charge value. */
export declare const negateValue: (value: ChargeValue) => ChargeValue;
/** Conflation of a charge value. */
export declare const conflateValue: (value: ChargeValue) => ChargeValue;
/** A FOUR census — the cell count at each bilattice corner of a settled cover. */
export interface FourCensus {
    readonly potential: number;
    readonly active: number;
    readonly stable: number;
    readonly absurd: number;
}
/** Census a list of charge values into the FOUR corners — the count at each bilattice value
 *  (absurd ⊥ / potential t / active f / stable ⊤). The shared per-cover tally every face's
 *  local-section reading needs; faculties map their own cells to charge values and parameterize
 *  this rather than re-implementing the count. */
export declare function fourCensus(values: readonly ChargeValue[]): FourCensus;
/** Census a list of charge-value NAMES into the FOUR corners (the name-level form of
 *  `fourCensus`, for readings that already carry the bilattice value name). */
export declare function fourCensusOfNames(names: readonly ChargeValueName[]): FourCensus;
/** The KNOWLEDGE-order join (∨_k) over a list of charge values — the collective standing the
 *  whole cover accumulates to. "The fixed point settling reaches is a join" (content/…/join.md),
 *  the least upper bound of the graded chain; ≤_k accumulates monotonically, top ⊤ = told-both
 *  (content/…/knowledge-order.md). Folds `joinKnowledgeValue` from the ≤_k bottom ⊥ (absurd);
 *  the empty list is ⊥. */
export declare const knowledgeAggregate: (values: readonly ChargeValue[]) => ChargeValue;
/** The ∨_k collective standing read directly off a FOUR census — the closed form of
 *  `knowledgeAggregate` (equal by idempotence + associativity of ∨_k): ⊤ stable if any cell is
 *  stable OR both for (potential) and against (active) are present (potential ∨_k active =
 *  ⟨1,0⟩ ∨_k ⟨0,1⟩ = ⟨1,1⟩); else the lone present side; else ⊥ absurd (nothing accumulated). */
export declare function knowledgeAggregateOfCensus(census: FourCensus): ChargeValueName;
/** The TRUTH-order join (∨_t) over a list of charge values — the collective LEAN, which way the
 *  whole cover leans on the truth order (∨_t raises truth, lowers falsity; potential t is the ≤_t
 *  top, active f the bottom — content/…/truth-order.md, negation antitone). The DUAL of
 *  `knowledgeAggregate` (the ≤_k accumulation): where ∨_k measures HOW MUCH is settled, ∨_t reads
 *  WHICH WAY it leans. Folds `joinTruthValue` from the ≤_t bottom (active); the empty list is
 *  absurd ⊥ (no lean — special-cased, not the ≤_t bottom, since "nothing said" is not "leans
 *  against"). */
export declare const truthAggregate: (values: readonly ChargeValue[]) => ChargeValue;
/** The ∨_t collective LEAN read directly off a FOUR census — the closed form of `truthAggregate`
 *  (∨_t = ⟨max truth, min falsity⟩): the truth side is present iff ANY cell has truth present
 *  (potential or stable), the falsity side iff EVERY cell has falsity present (every cell active or
 *  stable — no potential, no absurd). So: potential if any-truth and not-all-falsity (leans FOR);
 *  active if all-falsity and no-truth (leans AGAINST); stable if both (polarized — told-both wins);
 *  absurd if neither (empty / nothing said). */
export declare function truthAggregateOfCensus(census: FourCensus): ChargeValueName;
/** The KNOWLEDGE-order MEET (∧_k) over a list of charge values — the CONSENSUS, the maximum
 *  information shared by ALL cells (the network-sheaf H⁰ global section = the categorical limit;
 *  content/…/sheaf/network-sheaf-consensus-on-agent-graphs.md: consensus = ⋀_k over agents). Dual
 *  to `knowledgeAggregate` (the ∨_k join / disagreement-inclusive accumulation): consensus ⪯_k
 *  aggregate always, strict at disagreement loci. Folds `meetKnowledgeValue` from the ≤_k TOP ⊤
 *  (stable); the empty list is ⊤ (vacuous — everything trivially shared). */
export declare const knowledgeMeet: (values: readonly ChargeValue[]) => ChargeValue;
/** The ∧_k consensus read directly off a FOUR census — the closed form of `knowledgeMeet`
 *  (∧_k = componentwise MIN of the twist-product coordinates): the meet's truth side is present
 *  iff EVERY cell has truth present (no active, no absurd), the falsity side iff every cell has
 *  falsity present (no potential, no absurd). So ⊤ stable iff all cells stable; potential iff all
 *  on the for-side (potential/stable, ≥1 potential); active iff all on the against-side; else ⊥
 *  absurd (a for/against split, or any absurd cell — no shared information). Empty census = ⊤. */
export declare function knowledgeMeetOfCensus(census: FourCensus): ChargeValueName;
/** Whether left ≤ right in the knowledge order. */
export declare function leqKnowledge(left: ChargeCarrier, right: ChargeCarrier): boolean;
/** The right charge of a pair when left ≤ right in the knowledge order, else throw. */
export declare function compareKnowledge(pair: ChargePair): ChargeCarrier;
/** The knowledge-order join of a pair, accumulating evidence. */
export declare const aggregate: (pair: ChargePair) => ChargeCarrier;
/** Whether left ≤ right in the truth order (truth grows, falsity shrinks). */
export declare function leqTruth(left: ChargeCarrier, right: ChargeCarrier): boolean;
export interface ChargeBilatticeLawReceipt {
    readonly kind: "bilattice-charge.laws:witness";
    readonly knowledgeJoinCommutative: boolean;
    readonly knowledgeMeetCommutative: boolean;
    readonly knowledgeJoinAssociative: boolean;
    readonly knowledgeMeetAssociative: boolean;
    readonly knowledgeJoinIdempotent: boolean;
    readonly knowledgeMeetIdempotent: boolean;
    readonly knowledgeAbsorptionJoinMeet: boolean;
    readonly knowledgeAbsorptionMeetJoin: boolean;
    readonly truthJoinCommutative: boolean;
    readonly truthMeetCommutative: boolean;
    readonly truthJoinAssociative: boolean;
    readonly truthMeetAssociative: boolean;
    readonly knowledgeBottomJoinIdentity: boolean;
    readonly knowledgeTopMeetIdentity: boolean;
    readonly knowledgeBottomLeast: boolean;
    readonly knowledgeTopGreatest: boolean;
    readonly knowledgeMeetDistributesOverKnowledgeJoin: boolean;
    readonly truthMeetDistributesOverKnowledgeJoin: boolean;
    readonly negationInvolutive: boolean;
    readonly negationPreservesKnowledgeOrder: boolean;
    readonly negationReversesTruthOrder: boolean;
    readonly negationSwapsTruthPoles: boolean;
    readonly negationFixesKnowledgePoles: boolean;
}
/** Exhaustive finite receipt for the RelMath `Charge` bilattice laws. */
export declare function chargeBilatticeLawReceipt(): ChargeBilatticeLawReceipt;
/** Whether a charge is the top (absurd). */
export declare function isTop(c: ChargeCarrier): boolean;
/** Whether a charge is the bottom (potential). */
export declare function isBottom(c: ChargeCarrier): boolean;
/** A gauge group element acting on charge values. */
export type GaugeElementName = "id" | "negation" | "conflation" | "double";
export type GaugeOrderEffectName = "preserves-both" | "preserves-knowledge-reverses-truth" | "reverses-knowledge-preserves-truth" | "reverses-both";
export interface KleinFourGaugeReceipt {
    readonly kind: "bilattice-charge.kleinFourGauge:witness";
    readonly theorem: "RelMath.KleinFour.K4.isGroup";
    readonly elements: readonly GaugeElementName[];
    readonly orderFour: true;
    readonly closure: true;
    readonly associative: true;
    readonly identity: true;
    readonly selfInverse: true;
    readonly abelian: true;
    readonly actionHomomorphism: true;
    readonly generatedByNegationConflation: true;
    readonly negationOrbit: readonly ChargeValueName[];
    readonly conflationOrbit: readonly ChargeValueName[];
    readonly negationFixed: readonly ChargeValueName[];
    readonly conflationFixed: readonly ChargeValueName[];
    readonly orderEffects: Readonly<Record<GaugeElementName, GaugeOrderEffectName>>;
}
/** All gauge element names. */
export declare const gaugeElementNames: readonly GaugeElementName[];
/** Apply a gauge element to a charge value. */
export declare function gauge(sigma: GaugeElementName, value: ChargeValue): ChargeValue;
/** The K4 multiplication, derived from action composition: `left` after `right`. */
export declare function gaugeMul(left: GaugeElementName, right: GaugeElementName): GaugeElementName;
export declare function gaugeOrderEffect(element: GaugeElementName): GaugeOrderEffectName;
/** The charge values fixed by a gauge element. */
export declare const fixedSet: (sigma: GaugeElementName) => readonly ChargeValue[];
/** Bundle the finite Node shadow of `RelMath.KleinFour.K4.isGroup`. */
export declare function kleinFourGaugeReceipt(): KleinFourGaugeReceipt;
/** A witness that a labeling is self-dual under a gauge element. */
export interface FiringPatternSelfDualityWitness {
    readonly kind: "bilattice-charge.firingPatternSelfDuality:witness";
    readonly labeling: readonly ChargeValue[];
    readonly gaugeElement: GaugeElementName;
    readonly fixed: readonly ChargeValue[];
}
/** An obstruction to self-duality of a labeling under a gauge element. */
export interface FiringPatternSelfDualityObstruction {
    readonly kind: "bilattice-charge.firingPatternSelfDuality-obstruction";
    readonly labeling: readonly ChargeValue[];
    readonly gaugeElement: GaugeElementName;
    readonly fixed: readonly ChargeValue[];
    readonly moving: readonly ChargeValue[];
}
/** The result of testing a labeling for self-duality under a gauge element. */
export type FiringPatternSelfDualityJudgment = FiringPatternSelfDualityWitness | FiringPatternSelfDualityObstruction;
/** Test a labeling for self-duality under a gauge element. */
export declare function firingPatternSelfDuality(labeling: readonly ChargeValue[], sigma: GaugeElementName): FiringPatternSelfDualityJudgment;
/** A witness that two charge values are identical. */
export interface ChargeValueIdentityWitness {
    readonly kind: "bilattice-charge.valueIdentity:witness";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
}
/** An obstruction to identity of two charge values. */
export interface ChargeValueIdentityObstruction {
    readonly kind: "bilattice-charge.valueIdentity-obstruction";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
}
/** The result of comparing two charge values for identity. */
export type ChargeValueIdentityJudgment = ChargeValueIdentityWitness | ChargeValueIdentityObstruction;
/** Compare two charge values for identity. */
export declare function chargeValueIdentity(left: ChargeValue, right: ChargeValue): ChargeValueIdentityJudgment;
/** A witness that left ≤ right in the named order. */
export interface OrderLeqWitness {
    readonly kind: "bilattice-charge.orderLeq:witness";
    readonly order: "knowledge" | "truth";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly join: ChargeValue;
}
/** An obstruction to left ≤ right in the named order. */
export interface OrderLeqObstruction {
    readonly kind: "bilattice-charge.orderLeq-obstruction";
    readonly order: "knowledge" | "truth";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly join: ChargeValue;
}
/** The result of testing the order relation between two charge values. */
export type OrderLeqJudgment = OrderLeqWitness | OrderLeqObstruction;
/** Whether one charge value is ≤ another in the knowledge order. */
export declare const knowledgeLeq: (left: ChargeValue, right: ChargeValue) => OrderLeqJudgment;
/** Whether one charge value is ≤ another in the truth order. */
export declare const truthLeq: (left: ChargeValue, right: ChargeValue) => OrderLeqJudgment;
