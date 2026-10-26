"""Q-valued Čech cohomology of Q-enriched cellular sheaves.

Tests the corpus's ``objects/q-enriched-cohomology`` realisation in the
poset-indexed scalar-multiplication setting.  See
``work/briefs/q-enriched-cohomology.md``.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.residuated_lattice import (
    ResiduatedLattice,
    boolean_residuated_lattice,
)
from pypredcalc.combinatorics.poset import Poset
from pypredcalc.sheaf.q_enriched import (
    CohomologyWitness,
    QEnrichedSheaf,
    cohomology,
)

BOOL = boolean_residuated_lattice()


def _singleton_poset(label: str = "a") -> Poset:
    return Poset(elements=frozenset({label}), leq=lambda x, y: x == y)


def _line_poset() -> Poset:
    """Poset on {a, b, c} with a < b < c (total order)."""
    order = {("a", "a"), ("b", "b"), ("c", "c"),
             ("a", "b"), ("a", "c"), ("b", "c")}
    return Poset(elements=frozenset({"a", "b", "c"}), leq=lambda x, y: (x, y) in order)


def _two_element_poset() -> Poset:
    """Poset on {lo, hi} with lo < hi."""
    return Poset(
        elements=frozenset({"lo", "hi"}),
        leq=lambda x, y: x == y or (x == "lo" and y == "hi"),
    )


def _v_poset() -> Poset:
    """V-shaped poset: top > left, top > right, left and right incomparable."""
    def leq(x: str, y: str) -> bool:
        if x == y:
            return True
        if y == "top":
            return True
        return False
    return Poset(elements=frozenset({"top", "left", "right"}), leq=leq)


def _goedel_three() -> ResiduatedLattice[int]:
    """Three-element Gödel chain {0, 1, 2} with ⊗ = ∧, unit = 2."""
    return ResiduatedLattice(
        carrier=frozenset([0, 1, 2]),
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=2,
    )


# ---- Single-cell sheaf ---------------------------------------------------


class TestSingleCell:
    def test_h0_of_unit_stalk(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        w = cohomology(F, 0)
        assert w.value == 1

    def test_h0_of_bottom_stalk(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 0}, restriction_constants={})
        w = cohomology(F, 0)
        assert w.value == 0

    def test_h1_of_single_cell_is_top(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        w = cohomology(F, 1)
        assert w.value == BOOL.unit

    def test_h2_of_single_cell_is_top(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        w = cohomology(F, 2)
        assert w.value == BOOL.unit


# ---- Empty base ----------------------------------------------------------


class TestEmptyBase:
    def test_h0_of_empty_sheaf_is_top(self) -> None:
        """Vacuous meet = quantale unit (top). No cells ⟹ H^0 = ⊤."""
        empty = Poset(elements=frozenset(), leq=lambda a, b: False)
        F = QEnrichedSheaf(quantale=BOOL, base=empty,
                           stalks={}, restriction_constants={})
        w = cohomology(F, 0)
        assert w.value == BOOL.unit

    def test_h0_empty_chains_are_empty(self) -> None:
        empty = Poset(elements=frozenset(), leq=lambda a, b: False)
        F = QEnrichedSheaf(quantale=BOOL, base=empty,
                           stalks={}, restriction_constants={})
        w = cohomology(F, 0)
        assert w.chains == ()
        assert w.chain_values == ()


# ---- Constant sheaf ------------------------------------------------------


class TestConstantSheaf:
    def test_h0_of_constant_unit_sheaf_is_unit(self) -> None:
        """Constant sheaf at ⊤ ⟹ H^0 = ⊤."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 0)
        assert w.value == 1

    def test_h0_of_constant_bottom_sheaf_is_bottom(self) -> None:
        """Constant sheaf at ⊥ ⟹ H^0 = ⊥.

        This is the 'inconsistent (would-be) sheaf' case from the task spec:
        all stalks at the quantale bottom; H^0 reflects that by returning
        the bottom element.
        """
        line = _line_poset()
        # stalks all 0; restrictions are 1 (unit): 1 ⊗ 0 = 0 ✓
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 0, "c": 0},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 0)
        assert w.value == 0

    def test_h0_of_constant_sheaf_on_goedel_chain(self) -> None:
        Q = _goedel_three()
        line = _line_poset()
        # stalks all 1 (the 'h' midpoint); restriction = unit (2): 2 ∧ 1 = 1 ✓
        F = QEnrichedSheaf(
            quantale=Q, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 2, ("c", "a"): 2, ("b", "a"): 2},
        )
        w = cohomology(F, 0)
        assert w.value == 1


# ---- Line poset ----------------------------------------------------------


class TestLinePoset:
    def test_h0_is_meet_of_all_stalks(self) -> None:
        """H^0 = meet of all stalks; with a mixed sheaf the meet is the min."""
        line = _line_poset()
        # stalks: a=0, b=1, c=1; restriction (c,b)=1, (b,a)=0, (c,a)=0.
        # Check sheaf condition: 1⊗1=1=stalk[b] ✓; 0⊗1=0=stalk[a] ✓; 0⊗1=0 ✓.
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0},
        )
        w = cohomology(F, 0)
        # meet(0, 1, 1) = 0
        assert w.value == 0

    def test_h0_chains_are_all_elements(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 0)
        # degree-0 chains are the 1-element chains
        assert len(w.chains) == 3
        assert all(len(ch) == 1 for ch in w.chains)

    def test_h1_chains_are_comparable_pairs(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 1)
        # degree-1 chains = strictly-ascending pairs: (a,b), (a,c), (b,c)
        assert len(w.chains) == 3
        assert all(len(ch) == 2 for ch in w.chains)

    def test_h1_is_top(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 1)
        assert w.value == BOOL.unit

    def test_h2_chains_are_length3_chains(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        w = cohomology(F, 2)
        # one length-3 chain: (a, b, c)
        assert len(w.chains) == 1
        assert w.value == BOOL.unit


# ---- V-shaped poset (multiple maxima) ------------------------------------


class TestVShapedPoset:
    def test_h0_is_meet_of_three_stalks(self) -> None:
        """V-shape: top > left, top > right; H^0 = meet(top_stalk, left_stalk, right_stalk)."""
        v = _v_poset()
        # top=1, left=1, right=1; restrictions top→left = 1, top→right = 1.
        F = QEnrichedSheaf(
            quantale=BOOL, base=v,
            stalks={"top": 1, "left": 1, "right": 1},
            restriction_constants={("top", "left"): 1, ("top", "right"): 1},
        )
        w = cohomology(F, 0)
        assert w.value == 1

    def test_h0_with_bottom_leaf_is_bottom(self) -> None:
        v = _v_poset()
        # top=1, left=0, right=1; restriction (top,left)=0: 0⊗1=0 ✓.
        F = QEnrichedSheaf(
            quantale=BOOL, base=v,
            stalks={"top": 1, "left": 0, "right": 1},
            restriction_constants={("top", "left"): 0, ("top", "right"): 1},
        )
        w = cohomology(F, 0)
        assert w.value == 0


# ---- Two-element poset ---------------------------------------------------


class TestTwoElementPoset:
    def test_h0_meet_of_two_stalks(self) -> None:
        two = _two_element_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=two,
            stalks={"lo": 0, "hi": 1},
            restriction_constants={("hi", "lo"): 0},
        )
        w = cohomology(F, 0)
        assert w.value == 0

    def test_h0_unit_sheaf(self) -> None:
        two = _two_element_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=two,
            stalks={"lo": 1, "hi": 1},
            restriction_constants={("hi", "lo"): 1},
        )
        w = cohomology(F, 0)
        assert w.value == 1

    def test_h1_is_top(self) -> None:
        two = _two_element_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=two,
            stalks={"lo": 1, "hi": 1},
            restriction_constants={("hi", "lo"): 1},
        )
        w = cohomology(F, 1)
        assert w.value == BOOL.unit


# ---- Witness structure ---------------------------------------------------


class TestWitnessStructure:
    def test_degree_field_matches_argument(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        for deg in range(4):
            w = cohomology(F, deg)
            assert w.degree == deg

    def test_chain_values_length_matches_chains(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        for deg in range(3):
            w = cohomology(F, deg)
            assert len(w.chains) == len(w.chain_values)

    def test_h0_chain_values_match_stalks(self) -> None:
        """For degree 0, chain_values[i] should be the stalk at chains[i][0]."""
        line = _line_poset()
        stalks = {"a": 0, "b": 1, "c": 1}
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks=stalks,
            restriction_constants={("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0},
        )
        w = cohomology(F, 0)
        for chain, val in zip(w.chains, w.chain_values, strict=True):
            assert val == stalks[chain[0]]

    def test_higher_degree_chain_values_are_all_top(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1},
        )
        for deg in [1, 2]:
            w = cohomology(F, deg)
            assert all(v == BOOL.unit for v in w.chain_values)


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_negative_degree_raises(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        with pytest.raises(ValueError, match="degree"):
            cohomology(F, -1)

    def test_non_none_cover_raises_not_implemented(self) -> None:
        poset = _singleton_poset()
        F = QEnrichedSheaf(quantale=BOOL, base=poset,
                           stalks={"a": 1}, restriction_constants={})
        with pytest.raises(NotImplementedError, match="cover"):
            cohomology(F, 0, cover={"some": "cover"})


# ---- Public API importable from pypredcalc.sheaf -------------------------


class TestPublicAPI:
    def test_importable_from_sheaf_package(self) -> None:
        from pypredcalc.sheaf import CohomologyWitness as CW
        from pypredcalc.sheaf import cohomology as coh
        assert CW is CohomologyWitness
        assert coh is cohomology
