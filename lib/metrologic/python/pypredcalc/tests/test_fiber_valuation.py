"""Tests for the predication-fiber-algebra ``A_p = L^{⋈ E×E}``.

Verifies canonicalisation, the four pointwise bilattice operations,
negation, fusion, right residual, and the residuation adjunction on
chain-Heyting bases.
"""

from __future__ import annotations

import pytest

from pypredcalc import (
    PredicationFiberResiduationWitness as TopLevelResiduationWitness,
)
from pypredcalc.algebra.residuated_lattice import boolean_residuated_lattice
from pypredcalc.algebra.twist_product import TwistBilattice, boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import (
    FiberValuation,
    PredicationFiberResiduationWitness,
    predication_fiber_residuation_witness,
)

BOT = (0, 0)  # knowledge-bottom on the boolean twist


class TestCanonicalisation:
    def test_drops_bottom_cells(self) -> None:
        E = EntitySet.of(["a", "b"])
        v = FiberValuation.full(
            bilattice=boolean_twist(),
            entities=E,
            bottom=(0, 0),
            cells={("a", "a"): (0, 0), ("a", "b"): (1, 0)},
        )
        assert dict(v.cells) == {("a", "b"): (1, 0)}

    def test_get_returns_bottom_for_unset_cell(self) -> None:
        E = EntitySet.of(["a", "b"])
        v = FiberValuation.full(
            bilattice=boolean_twist(), entities=E, bottom=(0, 0), cells={}
        )
        assert v.get("a", "b") == (0, 0)

    def test_equality_is_structural(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v1 = FiberValuation.full(
            bilattice=bil,
            entities=E,
            bottom=(0, 0),
            cells={("a", "b"): (1, 0), ("a", "a"): (0, 0)},
        )
        v2 = FiberValuation.full(
            bilattice=bil, entities=E, bottom=(0, 0), cells={("a", "b"): (1, 0)}
        )
        assert v1 == v2


class TestKnowledgeOps:
    def test_knowledge_join_extends_support(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 0)})
        v2 = FiberValuation.full(bil, E, (0, 0), {("b", "a"): (0, 1)})
        out = v1.knowledge_join(v2)
        assert dict(out.cells) == {("a", "b"): (1, 0), ("b", "a"): (0, 1)}

    def test_knowledge_join_promotes_to_top(self) -> None:
        E = EntitySet.of(["a"])
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (1, 0)})
        v2 = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (0, 1)})
        out = v1.knowledge_join(v2)
        assert out.get("a", "a") == (1, 1)

    def test_knowledge_meet_with_disjoint_supports_is_empty(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (1, 0)})
        v2 = FiberValuation.full(bil, E, (0, 0), {("b", "b"): (1, 0)})
        out = v1.knowledge_meet(v2)
        assert dict(out.cells) == {}


class TestTruthOps:
    def test_truth_join_iterates_full_index(self) -> None:
        # bot ∨_t v at any cell where v ≠ bot must produce a nontrivial value:
        # (0,0) ∨_t (1,0) = (1,0). So a fiber with no support truth-joined
        # with one having support (1,0) at (a,b) produces (1,0) at (a,b).
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, E, (0, 0), {})
        v2 = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 0)})
        out = v1.truth_join(v2)
        assert out.get("a", "b") == (1, 0)

    def test_truth_meet_collapses_disagreement(self) -> None:
        # (1,0) ∧_t (0,1) = (min(1,0), max(0,1)) = (0,1) = F.
        E = EntitySet.of(["a"])
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (1, 0)})
        v2 = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (0, 1)})
        out = v1.truth_meet(v2)
        assert out.get("a", "a") == (0, 1)


class TestNegation:
    def test_negate_swaps_coords(self) -> None:
        E = EntitySet.of(["a"])
        bil = boolean_twist()
        v = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (1, 0)})
        assert v.negate().get("a", "a") == (0, 1)

    def test_negate_fixes_top_and_bottom(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 1)})
        out = v.negate()
        assert out.get("a", "b") == (1, 1)
        assert out.get("b", "a") == (0, 0)


class TestCompatibilityChecks:
    def test_combine_different_bilattices_raises(self) -> None:
        E = EntitySet.of(["a"])
        bil1 = boolean_twist()
        bil2 = TwistBilattice.from_residuated_lattice(boolean_residuated_lattice())
        v1 = FiberValuation.full(bil1, E, (0, 0), {})
        v2 = FiberValuation.full(bil2, E, (0, 0), {})
        with pytest.raises(ValueError, match="different bilattices"):
            v1.knowledge_join(v2)

    def test_combine_different_entities_raises(self) -> None:
        bil = boolean_twist()
        v1 = FiberValuation.full(bil, EntitySet.of(["a"]), (0, 0), {})
        v2 = FiberValuation.full(bil, EntitySet.of(["b"]), (0, 0), {})
        with pytest.raises(ValueError, match="different entity sets"):
            v1.knowledge_join(v2)


class TestFusionAndRightResidual:
    """Pointwise lift of ⊙ and ⇒ from L^⋈ to A_p = L^{⋈ E×E}.

    The cellwise residuation adjunction ``a ⊙ b ≤_t c iff a ≤_t b ⇒ c``
    on L^⋈ lifts to a cellwise (hence fiber-level) statement: at every
    ``(s, o)``, the adjunction holds for the cell values, so it holds
    pointwise on fiber valuations.
    """

    def test_fusion_iterates_full_index(self) -> None:
        # In Boolean: bot ⊙ bot = ⟨0·0, (0→0) ∧ (0→0)⟩ = ⟨0, 1⟩, non-default.
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v_empty = FiberValuation.full(bil, E, (0, 0), {})
        out = v_empty.fusion(v_empty)
        # All four cells should hold ⟨0, 1⟩ = F.
        for s in E:
            for o in E:
                assert out.get(s, o) == (0, 1)

    def test_fusion_unit_at_each_cell_is_identity(self) -> None:
        # The pointwise unit is the constant ⟨1, 1⟩ valuation. v ⊙ unit
        # should equal v at every cell where v is in the carrier.
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        unit_cells = {(s, o): (1, 1) for s in E for o in E}
        unit = FiberValuation.full(bil, E, (0, 0), unit_cells)
        v = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 0)})
        out = v.fusion(unit)
        for s in E:
            for o in E:
                assert out.get(s, o) == v.get(s, o), f"unit law fails at ({s}, {o})"

    def test_fusion_commutes(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 0), ("b", "a"): (0, 1)})
        w = FiberValuation.full(bil, E, (0, 0), {("a", "a"): (1, 1)})
        assert v.fusion(w) == w.fusion(v)

    def test_residuation_witness_records_both_sides(self) -> None:
        E = EntitySet.of(["a", "b"])
        bil = boolean_twist()
        v = FiberValuation.full(bil, E, (0, 0), {("a", "b"): (1, 0)})
        w = FiberValuation.full(
            bil,
            E,
            (0, 0),
            {("a", "b"): (0, 1), ("b", "a"): (1, 1)},
        )
        z = FiberValuation.full(
            bil,
            E,
            (0, 0),
            {("a", "b"): (1, 1), ("b", "b"): (1, 0)},
        )

        witness = predication_fiber_residuation_witness(v, w, z)

        assert isinstance(witness, PredicationFiberResiduationWitness)
        assert TopLevelResiduationWitness is PredicationFiberResiduationWitness
        assert witness.holds
        assert witness.failures == ()
        assert witness.fusion == v.fusion(w)
        assert witness.residual == w.right_residual(z)
        assert witness.fusion_leq_upper == witness.left_leq_residual
        assert v.residuation_witness(w, z) == witness

    @pytest.mark.parametrize("n", [1, 2, 3])
    def test_pointwise_residuation_adjunction_chain_heyting(self, n: int) -> None:
        """``v ⊙ w ≤_t z iff v ≤_t w ⇒ z`` cellwise on a chain-Heyting base."""
        from pypredcalc.algebra.residuated_lattice import ResiduatedLattice
        rl = ResiduatedLattice(
            carrier=frozenset(range(n + 1)),
            leq=lambda a, b: a <= b,
            join=lambda a, b: max(a, b),
            meet=lambda a, b: min(a, b),
            tensor=lambda a, b: min(a, b),
            unit=n,
        )
        bil = TwistBilattice.from_residuated_lattice(rl)
        E = EntitySet.of(["a", "b"])
        bot = (0, 0)
        # Pick three small fibers with sparse but nontrivial supports.
        fibers = [
            FiberValuation.full(bil, E, bot, {("a", "b"): (n, 0)}),
            FiberValuation.full(bil, E, bot, {("a", "b"): (0, n), ("b", "a"): (n, n)}),
            FiberValuation.full(
                bil, E, bot, {(s, o): (n // 2, n // 2) for s in E for o in E}
            ),
        ]
        for v in fibers:
            for w in fibers:
                for z in fibers:
                    lhs = _fiber_truth_leq(bil, v.fusion(w), z, E)
                    rhs = _fiber_truth_leq(bil, v, w.right_residual(z), E)
                    assert lhs == rhs

    def test_fusion_raises_without_residuated_structure(self) -> None:
        E = EntitySet.of(["a"])
        bil = TwistBilattice(
            base_join=lambda a, b: max(a, b),
            base_meet=lambda a, b: min(a, b),
            base_leq=lambda a, b: a <= b,
        )
        v = FiberValuation.full(bil, E, (0, 0), {})
        with pytest.raises(ValueError, match="no residuated structure"):
            v.fusion(v)


def _fiber_truth_leq(bil, v, w, entities) -> bool:
    """Pointwise truth-order comparison between two fiber valuations."""
    for s in entities:
        for o in entities:
            if not bil.truth_leq(v.get(s, o), w.get(s, o)):
                return False
    return True

