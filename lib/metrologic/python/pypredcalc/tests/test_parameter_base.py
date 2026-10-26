"""Sprint B — parameter base category and base-change.

Verifies:

- :class:`ParameterBase` and :class:`BaseMorphism` constructor invariants.
- Component identities (``ResidLatticeHom.identity``,
  ``EntityMap.identity``, ``OrdinalMap.identity``).
- ``BaseMorphism.identity`` is the categorical identity on
  ``apply_to_valuation``.
- A non-trivial base-change (entity-set contraction): collapsing two
  entities onto one merges their fibers via knowledge-join.
- A predicate-renaming functor pushes the valuation correctly.
- Composition of base-morphisms is associative on samples.
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.functor import PredicateFunctor
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


# ---- Component constructors ----------------------------------------------


class TestComponents:
    def test_resid_lattice_hom_identity_lifts(self) -> None:
        h = ResidLatticeHom.identity(BIL)
        assert h.lift((1, 0)) == (1, 0)
        assert h.lift((1, 1)) == (1, 1)

    def test_entity_map_identity(self) -> None:
        e = EntityMap.identity(E2)
        assert e(1) == 1
        assert e(2) == 2

    def test_entity_map_rejects_unknown(self) -> None:
        e = EntityMap.identity(E2)
        try:
            e(99)
        except KeyError:
            pass
        else:
            raise AssertionError("expected KeyError")

    def test_ordinal_map_identity(self) -> None:
        phi = OrdinalMap.identity(5)
        assert phi(0) == 0
        assert phi(5) == 5
        assert phi.is_monotone()

    def test_ordinal_map_non_monotone_caught(self) -> None:
        phi = OrdinalMap(
            forward=lambda i: 3 - i, source_bound=3, target_bound=3
        )
        assert not phi.is_monotone()


# ---- ParameterBase --------------------------------------------------------


class TestParameterBase:
    def test_construction(self) -> None:
        cat = cat_with(E2, "p", "q")
        base = ParameterBase(
            bilattice=BIL,
            predicate_category=cat,
            entity_set=E2,
            settling_bound=10,
        )
        assert base.entity_set == E2

    def test_entity_set_must_match_category(self) -> None:
        cat = cat_with(E2, "p")
        try:
            ParameterBase(
                bilattice=BIL,
                predicate_category=cat,
                entity_set=E1,  # mismatch
                settling_bound=5,
            )
        except ValueError as exc:
            assert "entity_set" in str(exc)
        else:
            raise AssertionError("expected ValueError")


# ---- Identity base-morphism ----------------------------------------------


class TestIdentityBaseMorphism:
    def test_apply_to_valuation_is_identity(self) -> None:
        cat = cat_with(E2, "p")
        base = ParameterBase(
            bilattice=BIL,
            predicate_category=cat,
            entity_set=E2,
            settling_bound=5,
        )
        sigma = BaseMorphism.identity(base)
        full = frozenset((s, o) for s in E2 for o in E2)
        v = {"p": fv({(1, 2): T_VAL, (2, 1): TOP}, E2, full)}
        result = sigma.apply_to_valuation(v)
        assert result["p"] == v["p"]


# ---- Predicate-renaming base-morphism ------------------------------------


class TestPredicateRenaming:
    """A functor on the predicate-category renames p → p'; the
    push-forward stores the old fiber under the new name."""

    def test_rename(self) -> None:
        cat_src = cat_with(E2, "p")
        cat_tgt = cat_with(E2, "P")  # capitalized rename
        base_src = ParameterBase(BIL, cat_src, E2, 5)
        base_tgt = ParameterBase(BIL, cat_tgt, E2, 5)
        functor = PredicateFunctor(
            source=cat_src,
            target=cat_tgt,
            on_predicates={"p": "P"},
            on_morphisms={},
        )
        sigma = BaseMorphism(
            source=base_src,
            target=base_tgt,
            l_hom=ResidLatticeHom.identity(BIL),
            predcat_functor=functor,
            entity_map=EntityMap.identity(E2),
            ordinal_map=OrdinalMap.identity(5),
        )
        full = frozenset((s, o) for s in E2 for o in E2)
        v_src = {"p": fv({(1, 2): T_VAL}, E2, full)}
        v_tgt = sigma.apply_to_valuation(v_src)
        assert "P" in v_tgt
        assert "p" not in v_tgt
        assert v_tgt["P"].get(1, 2) == T_VAL


# ---- Entity-set collapse merges fibers via ∨_k ---------------------------


class TestEntityCollapse:
    """Map E2 = {1, 2} → E1 = {*} by sending both entities to *.
    The resulting fiber on E1 has one cell (*, *) which is the
    knowledge-join of every source cell."""

    def test_collapse_merges(self) -> None:
        cat_src = cat_with(E2, "p")
        cat_tgt = cat_with(E1, "p")
        base_src = ParameterBase(BIL, cat_src, E2, 5)
        base_tgt = ParameterBase(BIL, cat_tgt, E1, 5)
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
        full_src = frozenset((s, o) for s in E2 for o in E2)
        full_tgt = frozenset((s, o) for s in E1 for o in E1)
        # Source has T_VAL at (1, 2) and F_VAL at (2, 1).
        # ∨_k of (1, 0) and (0, 1) = (1, 1) = TOP.
        v_src = {"p": fv({(1, 2): T_VAL, (2, 1): F_VAL}, E2, full_src)}
        v_tgt = sigma.apply_to_valuation(v_src)
        assert v_tgt["p"].get("*", "*") == TOP
        assert v_tgt["p"].dom == full_tgt


# ---- Composition ---------------------------------------------------------


class TestComposition:
    def test_identity_then_identity(self) -> None:
        cat = cat_with(E2, "p")
        base = ParameterBase(BIL, cat, E2, 5)
        sigma = BaseMorphism.identity(base)
        composed = sigma.then(sigma)
        full = frozenset((s, o) for s in E2 for o in E2)
        v = {"p": fv({(1, 2): T_VAL}, E2, full)}
        assert composed.apply_to_valuation(v) == v

    def test_compose_collapses(self) -> None:
        # E2 → E1 → E1: composing collapse with identity gives collapse.
        cat_src = cat_with(E2, "p")
        cat_mid = cat_with(E1, "p")
        cat_tgt = cat_with(E1, "p")
        base_src = ParameterBase(BIL, cat_src, E2, 5)
        base_mid = ParameterBase(BIL, cat_mid, E1, 5)
        base_tgt = ParameterBase(BIL, cat_tgt, E1, 5)
        f1 = PredicateFunctor(
            source=cat_src,
            target=cat_mid,
            on_predicates={"p": "p"},
            on_morphisms={},
        )
        f2 = PredicateFunctor(
            source=cat_mid,
            target=cat_tgt,
            on_predicates={"p": "p"},
            on_morphisms={},
        )
        s1 = BaseMorphism(
            source=base_src,
            target=base_mid,
            l_hom=ResidLatticeHom.identity(BIL),
            predcat_functor=f1,
            entity_map=EntityMap(forward=lambda x: "*", source=E2, target=E1),
            ordinal_map=OrdinalMap.identity(5),
        )
        s2 = BaseMorphism(
            source=base_mid,
            target=base_tgt,
            l_hom=ResidLatticeHom.identity(BIL),
            predcat_functor=f2,
            entity_map=EntityMap.identity(E1),
            ordinal_map=OrdinalMap.identity(5),
        )
        composed = s1.then(s2)
        assert composed.source is base_src
        assert composed.target is base_tgt
        full_src = frozenset((s, o) for s in E2 for o in E2)
        v_src = {"p": fv({(1, 2): T_VAL, (2, 1): F_VAL}, E2, full_src)}
        result_via_compose = composed.apply_to_valuation(v_src)
        result_step_by_step = s2.apply_to_valuation(s1.apply_to_valuation(v_src))
        assert result_via_compose == result_step_by_step
