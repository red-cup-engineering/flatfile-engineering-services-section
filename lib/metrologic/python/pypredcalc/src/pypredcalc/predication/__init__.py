"""Predication-native data primitives.

Realized:

- ``entity_set`` — :class:`EntitySet` ordered carrier of subjects / objects.
- ``calculator`` — :class:`PredicationCalculator`, the concrete FOUR-valued
  predication category calculator façade.
- ``fiber_valuation`` — :class:`FiberValuation`, the predication-fiber-algebra
  ``A_p = L^⋈ E×E`` parameterised by an arbitrary twist bilattice.
- ``predicate_category`` — :class:`PredicateSet`, :class:`PredicationCellSet`,
  :class:`PredicateCategory`, and the four canonical predicate-morphism
  classes (specialization, converse, subject/object projection).
- ``functor`` — :class:`PredicateFunctor` between two
  :class:`PredicateCategory` instances.
- ``fibration`` — :class:`PredicationFibration`, the explicit A1-A3
  cloven predication fibration under the hyperdoctrine surface.
- ``hyperdoctrine`` — :class:`PredicationHyperdoctrine`, aggregate of the
  hyperdoctrine surface (B1k/B1t/B2k/B2t/B3/B4) with ergonomic methods.
- ``index_map`` — :class:`IndexMap` and :func:`beck_chevalley_witness`,
  the cellwise base-change reduction for Beck-Chevalley.
- ``closure`` — :class:`ClosureOperator`, the per-fiber 𝒞-natural
  closure operator (corpus ``morphisms/closure-operator``).
- ``closure_rule`` — the fiber-atom rule language
  (:class:`CellAtom`, :class:`And`, :class:`Or`,
  :class:`FiberClosureRule`).
- ``closure_rule_system`` — :class:`FiberClosureRuleSystem` and the
  :class:`CrossFiberClosureOperator` it generates.
- ``settling`` — :class:`PredicationSettling`, the run-to-fixed-point
  runtime over a closure operator.
- ``closure_monad`` — the closure 2-monad ``Cl`` and the Cl-algebra check
  (corpus ``morphisms/closure-2-monad`` + ``theorems/closure-algebras-are-c-closed``).
- ``closure_comonad`` — the dualized closure comonad ``Cl*`` and the
  algebra/coalgebra correspondence (corpus
  ``morphisms/dualized-closure-2-comonad`` +
  ``theorems/closure-algebra-coalgebra-correspondence``).
- ``parameter_base`` — :class:`ParameterBase` and :class:`BaseMorphism`,
  realising ``objects/parameter-base-category`` and providing
  componentwise base-change.
- ``positing`` — :class:`PositingMorphism` and FOUR speech-act classes,
  making observation-side evidence injection explicit.
- ``cell``, ``store``, ``valuation``, ``bridge`` — observation-side
  ingest primitives kept on the FOUR-typed ``BilatticeValue`` alphabet.
"""

from .bridge import fibers_to_store, store_to_fibers
from .calculator import OperationalStep, PredicationCalculator
from .cell import PredicationCell
from .closure import (
    ClosureAxiomCheck,
    ClosureAxiomWitness,
    ClosureOperator,
    identity_closure,
)
from .closure_comonad import (
    ClCoalgebraWitness,
    ClStarComultiplicationWitness,
    ClStarCounitWitness,
    DualizedClosureComonad,
    DualizedClosureComonadLawWitness,
    algebra_to_coalgebra,
    coalgebra_to_algebra,
    is_cl_coalgebra,
    make_comonad_from_monad,
)
from .closure_monad import (
    ClAlgebraWitness,
    ClMultiplicationWitness,
    ClosureMonad,
    ClosureMonadLawWitness,
    ClUnitWitness,
    is_cl_algebra,
)
from .closure_rule import (
    And,
    CellAtom,
    Const,
    FiberClosureRule,
    FusionAtom,
    Or,
    Var,
)
from .closure_rule_system import (
    CrossFiberClosureOperator,
    FiberClosureRuleSystem,
    RuleSystemRegimeProfile,
    cross_fiber_knowledge_leq,
    empty_valuation,
)
from .comprehension import (
    ComprehensionAdjunctionCheck,
    ComprehensionAdjunctionWitness,
    comprehension_adjunction_witness,
)
from .entity_set import EntitySet
from .fiber_valuation import (
    FiberValuation,
    PredicationFiberResiduationCheck,
    PredicationFiberResiduationWitness,
    predication_fiber_residuation_witness,
)
from .fibration import (
    FibrationAxiomCheck,
    FibrationAxiomWitness,
    PredicationFiberFunctor,
    PredicationFiberFunctorCheck,
    PredicationFiberFunctorWitness,
    PredicationFibration,
    PredicationFibrationWitness,
)
from .functor import PredicateFunctor
from .gauge import (
    KLEIN_FOUR_ELEMENTS,
    FlatGaugeConnectionWitness,
    GaugeCoboundaryLawCheck,
    GaugeCoboundaryWitness,
    GaugeCompositionLawCheck,
    GaugeIdentityLawCheck,
    GaugeTwistedReindexingCheck,
    GaugeTwistedReindexingWitness,
    KleinFourElement,
    flat_gauge_connection_witness,
    gauge_coboundary_witness,
    gauge_twisted_reindexing,
    gauge_twisted_reindexing_witness,
    klein_four_action_fiber,
    klein_four_action_value,
    klein_four_inverse,
    klein_four_order_profile,
    klein_four_product,
)
from .grounding import ground_rule
from .hyperdoctrine import PredicationHyperdoctrine, PredicationHyperdoctrineWitness
from .index_map import (
    IndexMap,
    IndexPullbackSquareWitness,
    PredicateGeneratorIndexMapClassification,
    beck_chevalley_witness,
)
from .moduli import (
    AutomorphismH1ActionCheck,
    AutomorphismH1ActionWitness,
    AutomorphismStrataWitness,
    CoarseModuliPointStratum,
    CoarseSettlingModuli,
    CoarseSettlingModuliPoint,
    CombinedCohomologySignature,
    EntityPermutationAutomorphismWitness,
    FiberSwapAutomorphismWitness,
    NegationGaugeAutomorphismWitness,
    PredicateAutomorphismWitness,
    SettlingSheafIsoSignature,
    automorphism_h1_action_witness,
    automorphism_strata_witness,
    coarse_settling_moduli,
    combined_cohomology_signature,
    entity_permutation_automorphism_witness,
    fiber_swap_automorphism_witness,
    invisible_entity_permutation_automorphisms,
    invisible_predicate_automorphisms,
    negation_gauge_automorphism_witness,
    predicate_automorphism_witness,
    visible_entity_permutation_automorphisms,
    visible_predicate_automorphisms,
)
from .parameter_base import (
    BaseMorphism,
    EntityMap,
    OrdinalMap,
    ParameterBase,
    ResidLatticeHom,
)
from .positing import (
    PositingMorphism,
    SpeechActClass,
    apply_positings,
    assertive_positing,
    batch_positing_naturality_witness,
    contestation_positing,
    denial_positing,
    positing_naturality_witness,
    reindex_positing,
    speech_act_class,
)
from .predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateGeneratorPullbackClosureWitness,
    PredicateIdentity,
    PredicateMorphism,
    PredicateObjectProjection,
    PredicateSet,
    PredicateSpecialization,
    PredicateSubjectProjection,
    PredicationCellSet,
)
from .regime import (
    ClosureOrdinalStratum,
    PredicationBaseFiniteness,
    PredicationRegimeCertificate,
    PredicationRegimeName,
    derive_regime_certificate,
)
from .settling import (
    PredicationSettling,
    TruthWindow,
    settle_from_rule_system,
    verify_monotone,
)
from .settling_sheaf import (
    BigradedSettlingCohomologyWitness,
    FreeAbelianCellGroup,
    FreeAbelianPredicationGroup,
    FreeAbelianStagedPredicationGroup,
    InconsistencySheaf,
    NegativeParaconsistentSettlingSheaf,
    ParaconsistentSettlingAssociatedSheaf,
    SettlingAssociatedSheaf,
    SettlingH0Witness,
    SettlingH1GeneratorCheck,
    SettlingH1Witness,
    SettlingQEnrichedSheafWitness,
    TruthKnowledgeH0ExactnessCheck,
    TruthKnowledgeH0SequenceWitness,
    bigraded_settling_cohomology,
    boolean_settling_q_enriched_sheaf,
    finite_settling_h0,
    finite_settling_h1_witness,
    inconsistency_sheaf,
    negative_paraconsistent_settling_sheaf,
    paraconsistent_settling_associated_sheaf,
    settling_associated_sheaf,
    settling_q_enriched_sheaf,
    truth_knowledge_h0_sequence_witness,
)
from .store import PredicationStore
from .store_closure import (
    StoreClosureRuleSystem,
    StoreFusionAntecedent,
    StoreRule,
)
from .valuation import PredicationValuation
from .void import (
    VoidCone,
    VoidConeAssociatedGradedWitness,
    VoidH1PairingCheck,
    void_cone,
    void_cone_associated_graded_witness,
)
from .witness import (
    BatchPositingNaturalityWitness,
    BeckChevalleyCheck,
    BeckChevalleyWitness,
    FrobeniusCheck,
    FrobeniusWitness,
    FusionFrobeniusCheck,
    FusionFrobeniusWitness,
    GeneratorNaturalityCheck,
    NaturalityWitness,
    PositingNaturalityWitness,
    QuantifierAdjunctionCheck,
    QuantifierAdjunctionWitness,
    QuiescenceWitness,
)

__all__ = [
    "And",
    "AutomorphismStrataWitness",
    "AutomorphismH1ActionCheck",
    "AutomorphismH1ActionWitness",
    "BaseMorphism",
    "BeckChevalleyCheck",
    "BeckChevalleyWitness",
    "BatchPositingNaturalityWitness",
    "BigradedSettlingCohomologyWitness",
    "CellAtom",
    "ClAlgebraWitness",
    "ClCoalgebraWitness",
    "ClMultiplicationWitness",
    "ClStarComultiplicationWitness",
    "ClStarCounitWitness",
    "ClUnitWitness",
    "ClosureAxiomCheck",
    "ClosureAxiomWitness",
    "ClosureOrdinalStratum",
    "ClosureMonad",
    "ClosureMonadLawWitness",
    "ClosureOperator",
    "ComprehensionAdjunctionCheck",
    "ComprehensionAdjunctionWitness",
    "CombinedCohomologySignature",
    "CoarseSettlingModuli",
    "CoarseSettlingModuliPoint",
    "CoarseModuliPointStratum",
    "Const",
    "CrossFiberClosureOperator",
    "DualizedClosureComonad",
    "DualizedClosureComonadLawWitness",
    "EntityMap",
    "EntitySet",
    "EntityPermutationAutomorphismWitness",
    "FibrationAxiomCheck",
    "FibrationAxiomWitness",
    "FiberSwapAutomorphismWitness",
    "FiberClosureRule",
    "FiberClosureRuleSystem",
    "FiberValuation",
    "FlatGaugeConnectionWitness",
    "FrobeniusCheck",
    "FrobeniusWitness",
    "FreeAbelianCellGroup",
    "FreeAbelianPredicationGroup",
    "FreeAbelianStagedPredicationGroup",
    "FusionFrobeniusCheck",
    "FusionFrobeniusWitness",
    "FusionAtom",
    "GaugeCoboundaryLawCheck",
    "GaugeCoboundaryWitness",
    "GaugeCompositionLawCheck",
    "GaugeIdentityLawCheck",
    "GaugeTwistedReindexingCheck",
    "GaugeTwistedReindexingWitness",
    "GeneratorNaturalityCheck",
    "IndexMap",
    "IndexPullbackSquareWitness",
    "InconsistencySheaf",
    "KLEIN_FOUR_ELEMENTS",
    "KleinFourElement",
    "NaturalityWitness",
    "NegationGaugeAutomorphismWitness",
    "NegativeParaconsistentSettlingSheaf",
    "Or",
    "OrdinalMap",
    "OperationalStep",
    "ParameterBase",
    "ParaconsistentSettlingAssociatedSheaf",
    "PositingMorphism",
    "PositingNaturalityWitness",
    "PredicateAutomorphismWitness",
    "PredicateCategory",
    "PredicateConverse",
    "PredicateFunctor",
    "PredicateGeneratorIndexMapClassification",
    "PredicateGeneratorPullbackClosureWitness",
    "PredicateIdentity",
    "PredicateMorphism",
    "PredicateObjectProjection",
    "PredicateSet",
    "PredicateSpecialization",
    "PredicateSubjectProjection",
    "PredicationBaseFiniteness",
    "PredicationCell",
    "PredicationCellSet",
    "PredicationCalculator",
    "PredicationFibration",
    "PredicationFibrationWitness",
    "PredicationFiberResiduationCheck",
    "PredicationFiberResiduationWitness",
    "PredicationFiberFunctor",
    "PredicationFiberFunctorCheck",
    "PredicationFiberFunctorWitness",
    "PredicationHyperdoctrine",
    "PredicationHyperdoctrineWitness",
    "PredicationRegimeCertificate",
    "PredicationRegimeName",
    "PredicationSettling",
    "PredicationStore",
    "PredicationValuation",
    "QuantifierAdjunctionCheck",
    "QuantifierAdjunctionWitness",
    "QuiescenceWitness",
    "ResidLatticeHom",
    "RuleSystemRegimeProfile",
    "SpeechActClass",
    "SettlingAssociatedSheaf",
    "SettlingH0Witness",
    "SettlingH1GeneratorCheck",
    "SettlingH1Witness",
    "SettlingQEnrichedSheafWitness",
    "SettlingSheafIsoSignature",
    "StoreClosureRuleSystem",
    "StoreFusionAntecedent",
    "StoreRule",
    "TruthKnowledgeH0ExactnessCheck",
    "TruthKnowledgeH0SequenceWitness",
    "TruthWindow",
    "Var",
    "VoidCone",
    "VoidConeAssociatedGradedWitness",
    "VoidH1PairingCheck",
    "algebra_to_coalgebra",
    "apply_positings",
    "assertive_positing",
    "automorphism_h1_action_witness",
    "automorphism_strata_witness",
    "beck_chevalley_witness",
    "bigraded_settling_cohomology",
    "boolean_settling_q_enriched_sheaf",
    "coalgebra_to_algebra",
    "comprehension_adjunction_witness",
    "batch_positing_naturality_witness",
    "coarse_settling_moduli",
    "combined_cohomology_signature",
    "contestation_positing",
    "cross_fiber_knowledge_leq",
    "denial_positing",
    "derive_regime_certificate",
    "empty_valuation",
    "entity_permutation_automorphism_witness",
    "flat_gauge_connection_witness",
    "finite_settling_h0",
    "finite_settling_h1_witness",
    "fibers_to_store",
    "fiber_swap_automorphism_witness",
    "gauge_coboundary_witness",
    "gauge_twisted_reindexing",
    "gauge_twisted_reindexing_witness",
    "ground_rule",
    "identity_closure",
    "inconsistency_sheaf",
    "invisible_entity_permutation_automorphisms",
    "invisible_predicate_automorphisms",
    "is_cl_algebra",
    "is_cl_coalgebra",
    "klein_four_inverse",
    "klein_four_action_fiber",
    "klein_four_action_value",
    "klein_four_order_profile",
    "klein_four_product",
    "make_comonad_from_monad",
    "negative_paraconsistent_settling_sheaf",
    "negation_gauge_automorphism_witness",
    "paraconsistent_settling_associated_sheaf",
    "positing_naturality_witness",
    "predicate_automorphism_witness",
    "predication_fiber_residuation_witness",
    "reindex_positing",
    "settle_from_rule_system",
    "settling_associated_sheaf",
    "settling_q_enriched_sheaf",
    "speech_act_class",
    "store_to_fibers",
    "truth_knowledge_h0_sequence_witness",
    "verify_monotone",
    "visible_entity_permutation_automorphisms",
    "visible_predicate_automorphisms",
    "void_cone",
    "void_cone_associated_graded_witness",
]
