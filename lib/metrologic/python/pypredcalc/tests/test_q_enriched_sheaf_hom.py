"""Q-enriched cellular sheaf internal hom.

Tests the corpus's `objects/q-enriched-sheaf-hom` realisation in the
poset-indexed single-Q-element-stalk setting: per-cell residuum
stalks, per-pair residuum restriction constants. See
`work/briefs/q-enriched-sheaf-hom.md`.
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
    SheafConditionError,
    check_sheaf_condition,
    internal_hom,
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
    """Three-element Gödel chain {0, 1, 2} with ⊗ = ∧, → Gödel implication."""
    carrier = frozenset([0, 1, 2])
    return ResiduatedLattice(
        carrier=carrier,
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=2,
    )


# ---- Self-hom is unit ----------------------------------------------------


class TestSelfHomIsUnit:
    def test_hom_F_F_is_unit_sheaf_bool(self) -> None:
        """For any sheaf F, `hom(F, F)` has stalk = unit at every
        cell, since `a → a = unit` for every `a`."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        H = internal_hom(F, F)
        assert dict(H.stalks) == {"a": 1, "b": 1, "c": 1}

    def test_hom_F_F_is_unit_sheaf_goedel(self) -> None:
        Q = _goedel_three()
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=Q, base=line,
            stalks={"a": 1, "b": 1, "c": 2},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 2,
            },
        )
        H = internal_hom(F, F)
        # 2 is the unit of the Gödel chain.
        assert dict(H.stalks) == {"a": 2, "b": 2, "c": 2}


# ---- Residual edges ------------------------------------------------------


class TestResidualEdges:
    def test_hom_with_top_codomain_is_top(self) -> None:
        """`a → top = top` for any `a` — hom into the constant unit
        sheaf is the constant unit sheaf."""
        line = _line_poset()
        F = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        top = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        H = internal_hom(F, top)
        assert dict(H.stalks) == {"a": 1, "b": 1, "c": 1}

    def test_hom_from_bot_is_top(self) -> None:
        """`bot → b = top` for any `b` — hom out of the constant zero
        sheaf is the constant unit sheaf."""
        line = _line_poset()
        zero = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 0, "c": 0},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 0,
            },
        )
        H = internal_hom(zero, G)
        assert dict(H.stalks) == {"a": 1, "b": 1, "c": 1}


# ---- Tensor-hom curry/uncurry on stalks ---------------------------------


class TestTensorHomCurry:
    def test_currying_identity_on_stalks_bool(self) -> None:
        """At each cell, the residuation biconditional gives::

            (F ⊗ G)[c] → H[c]  ==  F[c] → (G[c] → H[c])

        This is the stalk-level shadow of the tensor-hom adjunction
        in the closed-monoidal-structure theorem. We verify it on
        constructible sheaves where both sides are valid cellular
        sheaves."""
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
        H = QEnrichedSheaf(
            quantale=BOOL, base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )

        FG = tensor(F, G)
        # LHS: hom(F ⊗ G, H)
        L = internal_hom(FG, H)
        # RHS: hom(F, hom(G, H))
        GH = internal_hom(G, H)
        R = internal_hom(F, GH)

        for cell in ("a", "b", "c"):
            assert L.stalks[cell] == R.stalks[cell], (
                f"curry identity fails at stalk {cell}: "
                f"hom(F⊗G,H)[{cell}]={L.stalks[cell]}, "
                f"hom(F,hom(G,H))[{cell}]={R.stalks[cell]}"
            )


# ---- Sheaf-condition preservation (the BOOL-friendly case) --------------


class TestSheafConditionPreservation:
    def test_result_satisfies_sheaf_condition_bool(self) -> None:
        """F constant unit; G with mixed stalks {c: 1, b: 0, a: 0}.
        hom stalks = {a: 1→0=0, b: 1→0=0, c: 1→1=1}; restrictions
        residuum-derived; sheaf condition holds."""
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
            stalks={"a": 0, "b": 0, "c": 1},
            restriction_constants={
                ("c", "b"): 0, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        H = internal_hom(F, G)
        assert dict(H.stalks) == {"a": 0, "b": 0, "c": 1}
        witness = check_sheaf_condition(
            H.quantale, H.base,
            stalks=dict(H.stalks),
            restriction_constants=dict(H.restriction_constants),
        )
        assert witness.holds


# ---- Carrier inexpressivity (the Gödel failure case) --------------------


class TestCarrierInexpressivity:
    def test_goedel_failure_raises_sheaf_condition_error(self) -> None:
        """In the Gödel chain {0, 1, 2} with α=1, β=2, a=2, b=1: the
        residuum-derived restriction constant cannot satisfy the
        cellular sheaf condition. The cellular carrier cannot
        express this internal hom — `SheafConditionError` is raised
        carrying the structured witness.

        See the worked example in `work/briefs/q-enriched-sheaf-hom.md`."""
        Q = _goedel_three()
        # Two-cell poset, child b ≤ parent c.
        order = {("b", "b"), ("c", "c"), ("b", "c")}

        def leq(x, y):
            return (x, y) in order

        base = Poset(elements=frozenset({"b", "c"}), leq=leq)
        F = QEnrichedSheaf(
            quantale=Q, base=base,
            stalks={"c": 2, "b": 1},  # α = 1, F[b] = 1 ∧ 2 = 1
            restriction_constants={("c", "b"): 1},
        )
        G = QEnrichedSheaf(
            quantale=Q, base=base,
            stalks={"c": 1, "b": 1},  # β = 2 (unit), G[b] = 2 ∧ 1 = 1
            restriction_constants={("c", "b"): 2},
        )
        # F[c]→G[c] = 2 → 1 = 1
        # F[b]→G[b] = 1 → 1 = 2  (top — needs scalar pulling 1 → 2)
        # No scalar r in {0,1,2} satisfies r ∧ 1 = 2.
        with pytest.raises(SheafConditionError) as exc_info:
            internal_hom(F, G)
        assert exc_info.value.witness is not None
        assert not exc_info.value.witness.holds


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_mismatched_quantale_rejected(self) -> None:
        line = _line_poset()
        Q1 = boolean_residuated_lattice()
        Q2 = boolean_residuated_lattice()
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
            internal_hom(F, G)

    def test_mismatched_base_rejected(self) -> None:
        line1 = _line_poset()
        line2 = _line_poset()
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
            internal_hom(F, G)


# ---- Empty base ----------------------------------------------------------


class TestEmptyBase:
    def test_hom_of_empty_sheaves(self) -> None:
        empty = Poset(elements=frozenset(), leq=lambda a, b: False)
        F = QEnrichedSheaf(
            quantale=BOOL, base=empty,
            stalks={}, restriction_constants={},
        )
        G = QEnrichedSheaf(
            quantale=BOOL, base=empty,
            stalks={}, restriction_constants={},
        )
        H = internal_hom(F, G)
        assert dict(H.stalks) == {}
        assert dict(H.restriction_constants) == {}
