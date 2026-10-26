"""Q-enriched cellular sheaf tensor product.

Tests the corpus's `objects/q-enriched-sheaf-tensor` realisation in the
poset-indexed scalar-multiplication setting: per-cell quantale tensor
of stalks, per-pair tensor of restriction constants, sheafification
collapses to identity. See `work/briefs/q-enriched-sheaf-tensor.md`.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.residuated_lattice import (
    ResiduatedLattice,
    boolean_residuated_lattice,
)
from pypredcalc.combinatorics.poset import Poset
from pypredcalc.sheaf.q_enriched import (
    QEnrichedSheaf,
    check_sheaf_condition,
    tensor,
)

BOOL = boolean_residuated_lattice()


def _line_poset():
    """Poset on {a, b, c} with a < b < c."""
    order = {("a", "a"), ("b", "b"), ("c", "c"),
             ("a", "b"), ("a", "c"), ("b", "c")}

    def leq(x, y):
        return (x, y) in order

    return Poset(elements=frozenset({"a", "b", "c"}), leq=leq)


def _goedel_three():
    """Three-element Gödel chain {0, h, 1} with ⊗ = ∧, → Gödel implication."""
    carrier = frozenset([0, 1, 2])  # 0 < 1 < 2; encode h as 1.
    return ResiduatedLattice(
        carrier=carrier,
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=2,
    )


# ---- Constant-sheaf tensor ----------------------------------------------


class TestConstantSheafTensor:
    def test_tensor_of_unit_constant_sheaves_is_unit(self) -> None:
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        H = tensor(F, G)
        assert H.stalks == {"a": 1, "b": 1, "c": 1}
        assert dict(H.restriction_constants) == {
            ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
        }

    def test_tensor_with_zero_constant_collapses_to_zero(self) -> None:
        """In the BOOL quantale, 1 ⊗ 0 = 0; tensoring with the zero
        constant sheaf zeros every stalk."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        Z = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 0, "c": 0},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        H = tensor(F, Z)
        assert H.stalks == {"a": 0, "b": 0, "c": 0}


# ---- Unit law (identity) -------------------------------------------------


class TestTensorUnit:
    def test_tensor_with_quantale_unit_sheaf_is_identity(self) -> None:
        """Tensoring with the constant sheaf at the quantale unit
        leaves stalks unchanged and tensors restriction constants by
        the unit (which is the top, so identity)."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        unit_sheaf = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        H = tensor(F, unit_sheaf)
        # 0 ⊗ 1 = 0, 1 ⊗ 1 = 1; restrictions ⊗ 1 = themselves.
        assert dict(H.stalks) == dict(F.stalks)
        assert dict(H.restriction_constants) == dict(F.restriction_constants)

    def test_tensor_unit_law_on_three_chain(self) -> None:
        """Same identity property on a non-Boolean quantale (Gödel
        chain): for any sheaf F over Q, F ⊗ 1_Q-constant = F."""
        Q = _goedel_three()
        line = _line_poset()
        # h-stalk at b, top everywhere else; restriction (b, a) requires
        # c such that c ⊗ stalk[b] = stalk[a]. Using stalk[a] = h = 1,
        # restriction = 2 (top): 2 ⊗ 1 = 1.
        F = QEnrichedSheaf(
            quantale=Q, base=line,
            stalks={"a": 1, "b": 1, "c": 2},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 2,
            },
        )
        unit_sheaf = QEnrichedSheaf(
            quantale=Q, base=line,
            stalks={"a": 2, "b": 2, "c": 2},
            restriction_constants={
                ("c", "b"): 2, ("c", "a"): 2, ("b", "a"): 2,
            },
        )
        H = tensor(F, unit_sheaf)
        assert dict(H.stalks) == dict(F.stalks)
        assert dict(H.restriction_constants) == dict(F.restriction_constants)


# ---- Symmetry ------------------------------------------------------------


class TestSymmetry:
    def test_tensor_is_symmetric_on_data(self) -> None:
        """By commutativity of the underlying quantale, F ⊗ G and
        G ⊗ F have identical stalk and restriction-constant data."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 0, "c": 1},
            restriction_constants={
                ("c", "b"): 0, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        H1 = tensor(F, G)
        H2 = tensor(G, F)
        assert dict(H1.stalks) == dict(H2.stalks)
        assert dict(H1.restriction_constants) == dict(H2.restriction_constants)


# ---- Sheaf-condition preservation ----------------------------------------


class TestSheafConditionPreservation:
    def test_result_satisfies_sheaf_condition(self) -> None:
        """The pointwise tensor of two sheaf-conforming sheaves is
        already a sheaf — no sheafification step required."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 0, "c": 1},
            restriction_constants={
                ("c", "b"): 0, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        H = tensor(F, G)
        witness = check_sheaf_condition(
            H.quantale, H.base,
            stalks=dict(H.stalks),
            restriction_constants=dict(H.restriction_constants),
        )
        assert witness.holds


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_mismatched_quantale_rejected(self) -> None:
        line = _line_poset()
        Q1 = boolean_residuated_lattice()
        Q2 = boolean_residuated_lattice()  # different object identity
        F = QEnrichedSheaf(
            quantale=Q1, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        G = QEnrichedSheaf(
            quantale=Q2, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        with pytest.raises(ValueError, match="quantale"):
            tensor(F, G)

    def test_mismatched_base_rejected(self) -> None:
        line1 = _line_poset()
        line2 = _line_poset()  # different object identity
        F = QEnrichedSheaf(
            quantale=BOOL, base=line1,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=line2,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        with pytest.raises(ValueError, match="base"):
            tensor(F, G)


# ---- Empty base ----------------------------------------------------------


class TestEmptyBase:
    def test_tensor_of_empty_sheaves(self) -> None:
        empty = Poset(elements=frozenset(), leq=lambda a, b: False)
        F = QEnrichedSheaf(
            quantale=BOOL, base=empty,
            stalks={}, restriction_constants={},
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=empty,
            stalks={}, restriction_constants={},
        )
        H = tensor(F, G)
        assert dict(H.stalks) == {}
        assert dict(H.restriction_constants) == {}
