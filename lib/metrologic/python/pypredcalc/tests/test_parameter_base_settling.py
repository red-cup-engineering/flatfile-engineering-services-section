"""Test the new apply_to_settling_with_closure functionality."""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_rule_system import (
    CrossFiberClosureOperator,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.functor import PredicateFunctor
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.parameter_base import (
    BaseMorphism,
    EntityMap,
    OrdinalMap,
    ParameterBase,
    ResidLatticeHom,
)
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
)
from pypredcalc.predication.settling import PredicationSettling

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E2 = EntitySet.of([1, 2])
E1 = EntitySet.of(["*"])


def cat_with(entities, *predicates) -> PredicateCategory:
    return PredicateCategory(
        entities=entities,
        predicates=PredicateSet.of(predicates),
        generators=(),
        domains={},
    )


def fv(cells, entities, dom):
    return FiberValuation(BIL, entities, BOT, cells, dom=dom)


def test_apply_to_settling_with_closure_basic():
    """Test that apply_to_settling_with_closure correctly pushes forward a settling."""
    # Set up source base: E2 = {1, 2} with one predicate
    cat_src = cat_with(E2, "p")
    base_src = ParameterBase(
        bilattice=BIL,
        predicate_category=cat_src,
        entity_set=E2,
        settling_bound=5,
    )

    # Set up target base: E1 = {*} with one predicate (collapsing entities)
    cat_tgt = cat_with(E1, "p")
    base_tgt = ParameterBase(
        bilattice=BIL,
        predicate_category=cat_tgt,
        entity_set=E1,
        settling_bound=5,
    )

    # Identity on bilattice, functor renames p->p, entity map collapses 1,2 -> *
    functor = PredicateFunctor(
        source=cat_src,
        target=cat_tgt,
        on_predicates={"p": "p"},
        on_morphisms={},
    )
    sigma = BaseMorphism(
        source=base_src,
        target=base_tgt,
        l_hom=ResidLatticeHom.identity(BIL),
        predcat_functor=functor,
        entity_map=EntityMap(
            forward=lambda x: "*", source=E2, target=E1
        ),
        ordinal_map=OrdinalMap.identity(5),
    )

    # Create a simple closure operator that does nothing (identity)
    def identity_closure(valuation):
        return valuation

    # Wrap it as a CrossFiberClosureOperator
    hyperdoctrine_src = PredicationHyperdoctrine(cat_src, BIL)
    closure_op = CrossFiberClosureOperator(
        hyperdoctrine=hyperdoctrine_src,
        apply=identity_closure
    )

    # Create a simple settling with two stages: v0 -> v1 (quiescent at v1)
    full_src = frozenset((s, o) for s in E2 for o in E2)
    v0 = {"p": fv({(1, 2): T_VAL}, E2, full_src)}  # Start with T_VAL at (1,2)
    v1 = {"p": fv({(1, 2): T_VAL, (2, 1): T_VAL}, E2, full_src)}  # Add T_VAL at (2,1)

    settling_src = PredicationSettling(
        hyperdoctrine=hyperdoctrine_src,
        closure=closure_op,
        bound=5,
        trajectory=(v0, v1)  # Two stages: v0 then v1 (quiescent)
    )

    # Target closure is also identity
    hyperdoctrine_tgt = PredicationHyperdoctrine(cat_tgt, BIL)
    target_closure = CrossFiberClosureOperator(
        hyperdoctrine=hyperdoctrine_tgt,
        apply=identity_closure
    )

    # Apply the settling push-forward with closure
    settling_tgt = sigma.apply_to_settling_with_closure(settling_src, target_closure)

    # Check that we got a settling in the target base
    assert settling_tgt.hyperdoctrine.category is cat_tgt
    assert settling_tgt.hyperdoctrine.bilattice is BIL
    assert settling_tgt.closure is target_closure
    assert settling_tgt.bound == 5  # φ_λ(5) = 5 for identity map

    # Check trajectory: each stage should be pushed forward
    # v0: {(1,2): T_VAL} -> {("*,*",): T_VAL} (knowledge join of just T_VAL)
    # v1: {(1,2): T_VAL, (2,1): T_VAL} -> {("*,*",): T_VAL} (join of T_VAL and T_VAL = T_VAL)
    expected_v0 = {"p": fv({("*", "*"): T_VAL}, E1, frozenset([("*", "*")]))}
    expected_v1 = {"p": fv({("*", "*"): T_VAL}, E1, frozenset([("*", "*")]))}

    assert len(settling_tgt.trajectory) == 2
    assert settling_tgt.trajectory[0]["p"] == expected_v0["p"]
    assert settling_tgt.trajectory[1]["p"] == expected_v1["p"]


def test_apply_to_settling_with_closure_knowledge_join():
    """Test that knowledge joining works correctly when multiple source stages map to same target."""
    # Set up source base: E2 = {1, 2} with one predicate
    cat_src = cat_with(E2, "p")
    base_src = ParameterBase(
        bilattice=BIL,
        predicate_category=cat_src,
        entity_set=E2,
        settling_bound=5,
    )

    # Set up target base: E1 = {*} with one predicate
    cat_tgt = cat_with(E1, "p")
    base_tgt = ParameterBase(
        bilattice=BIL,
        predicate_category=cat_tgt,
        entity_set=E1,
        settling_bound=5,
    )

    # Identity on bilattice, functor renames p->p, entity map collapses 1,2 -> *
    functor = PredicateFunctor(
        source=cat_src,
        target=cat_tgt,
        on_predicates={"p": "p"},
        on_morphisms={},
    )
    sigma = BaseMorphism(
        source=base_src,
        target=base_tgt,
        l_hom=ResidLatticeHom.identity(BIL),
        predcat_functor=functor,
        entity_map=EntityMap(
            forward=lambda x: "*", source=E2, target=E1
        ),
        ordinal_map=OrdinalMap(
            forward=lambda x: 0 if x < 3 else 1,  # Map stages 0,1,2->0 and 3,4->1
            source_bound=5,
            target_bound=1
        ),
    )

    # Create a simple closure operator that does nothing (identity)
    def identity_closure(valuation):
        return valuation

    hyperdoctrine_src = PredicationHyperdoctrine(cat_src, BIL)
    closure_op = CrossFiberClosureOperator(
        hyperdoctrine=hyperdoctrine_src,
        apply=identity_closure
    )

    # Create a settling with 4 stages showing progression
    full_src = frozenset((s, o) for s in E2 for o in E2)
    v0 = {"p": fv({}, E2, full_src)}                           # Empty
    v1 = {"p": fv({(1, 2): T_VAL}, E2, full_src)}             # T_VAL at (1,2)
    v2 = {"p": fv({(1, 2): T_VAL, (2, 1): F_VAL}, E2, full_src)} # Add F_VAL at (2,1)
    v3 = {"p": fv({(1, 2): T_VAL, (2, 1): T_VAL}, E2, full_src)} # Both T_VAL (knowledge join)

    settling_src = PredicationSettling(
        hyperdoctrine=hyperdoctrine_src,
        closure=closure_op,
        bound=5,
        trajectory=(v0, v1, v2, v3)  # Four stages
    )

    # Target closure is identity
    hyperdoctrine_tgt = PredicationHyperdoctrine(cat_tgt, BIL)
    target_closure = CrossFiberClosureOperator(
        hyperdoctrine=hyperdoctrine_tgt,
        apply=identity_closure
    )

    # Apply the settling push-forward with closure
    settling_tgt = sigma.apply_to_settling_with_closure(settling_src, target_closure)

    # Check that we got a settling in the target base
    assert settling_tgt.bound == 1  # φ_λ(5) = 1

    # Check trajectory:
    # Stage 0: v0,v1,v2 all map to target stage 0 (ordinal_map(0)=0, _(1)=0, _(2)=0)
    #          Only latest (v2) is kept: {(1,2): T_VAL, (2,1): F_VAL} -> {("*,*"): TOP}
    #          because T_VAL knowledge_join F_VAL = TOP.
    # Stage 1: v3 maps to target stage 1 (ordinal_map(3)=1)
    #          v3: {(1,2): T_VAL, (2,1): T_VAL} -> {("*,*",): T_VAL} (knowledge join of T_VAL,T_VAL = T_VAL)
    expected_stage0 = {"p": fv({("*", "*"): TOP}, E1, frozenset([("*", "*")]))}
    expected_stage1 = {"p": fv({("*", "*"): T_VAL}, E1, frozenset([("*", "*")]))}

    assert len(settling_tgt.trajectory) == 2
    assert settling_tgt.trajectory[0]["p"] == expected_stage0["p"]
    assert settling_tgt.trajectory[1]["p"] == expected_stage1["p"]


if __name__ == "__main__":
    test_apply_to_settling_with_closure_basic()
    test_apply_to_settling_with_closure_knowledge_join()
    print("All tests passed!")
