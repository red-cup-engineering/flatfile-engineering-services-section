"""B4 — Lawvere comprehension for the predication hyperdoctrine.

Two adjunctions, one per designated truth value:

- Classical (≤_t):  Ext^t(g) ≤_t ψ  ⇔  dom(q) ⊆ ψ^{-1}(t).
- Paraconsistent (≤_k):  Ext^k(g) ≤_k ψ  ⇔  dom(q) ⊆ ψ^{-1}(⊤).

Both are verified exhaustively over a 2-entity carrier: every
sub-support of ``dom(p)`` defines a candidate ``g`` and every
fiber on ``dom(p)`` over the four bilattice values defines a
candidate ψ. Realises ``lawvere-comprehension-classical`` and
``lawvere-comprehension-paraconsistent``.
"""

from __future__ import annotations

from itertools import combinations, product

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.comprehension import (
    comprehension_k,
    comprehension_t,
    extension_k,
    extension_t,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import PredicateSpecialization

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells):
    return FiberValuation(BIL, E, BOT, cells, dom=FULL)


def _all_sub_supports():
    """Every subset of FULL as a frozenset (16 of them on a 2-entity carrier)."""
    cells = sorted(FULL, key=lambda c: (str(c[0]), str(c[1])))
    for r in range(len(cells) + 1):
        for combo in combinations(cells, r):
            yield frozenset(combo)


def _all_psi_fibers():
    """Every assignment ``FULL → FOUR``."""
    cells = sorted(FULL, key=lambda c: (str(c[0]), str(c[1])))
    for assignment in product(FOUR, repeat=len(cells)):
        d = {c: v for c, v in zip(cells, assignment, strict=True) if v != BOT}
        yield fv(d)


# ---- Classical comprehension (≤_t) ---------------------------------------


class TestLawvereComprehensionClassical:
    """``Ext^t(g) ≤_t ψ ⇔ dom(q) ⊆ comprehension_t(p, ψ).sub_support``,
    exhaustive over (g, ψ)."""

    def test_adjunction(self) -> None:
        for sub in _all_sub_supports():
            g = PredicateSpecialization(
                source=("q", sub), target="p", sub_support=sub
            )
            for psi in _all_psi_fibers():
                lhs = extension_t(g, BIL, entities=E, dom_p=FULL).truth_leq(psi)
                rhs_spec = comprehension_t("p", FULL, psi)
                rhs = sub <= rhs_spec.sub_support
                assert lhs == rhs, (
                    f"classical comprehension adjunction failed:\n"
                    f"  sub_support = {sorted(sub)}\n"
                    f"  ψ = {dict(psi.cells)}\n"
                    f"  Ext^t(g) ≤_t ψ = {lhs}\n"
                    f"  dom(q) ⊆ ψ^(-1)(t) = {rhs}"
                )


# ---- Paraconsistent comprehension (≤_k) ----------------------------------


class TestLawvereComprehensionParaconsistent:
    """``Ext^k(g) ≤_k ψ ⇔ dom(q) ⊆ comprehension_k(p, ψ).sub_support``,
    exhaustive over (g, ψ)."""

    def test_adjunction(self) -> None:
        for sub in _all_sub_supports():
            g = PredicateSpecialization(
                source=("q", sub), target="p", sub_support=sub
            )
            for psi in _all_psi_fibers():
                lhs = extension_k(g, BIL, entities=E, dom_p=FULL).knowledge_leq(psi)
                rhs_spec = comprehension_k("p", FULL, psi)
                rhs = sub <= rhs_spec.sub_support
                assert lhs == rhs, (
                    f"paraconsistent comprehension adjunction failed:\n"
                    f"  sub_support = {sorted(sub)}\n"
                    f"  ψ = {dict(psi.cells)}\n"
                    f"  Ext^k(g) ≤_k ψ = {lhs}\n"
                    f"  dom(q) ⊆ ψ^(-1)(⊤) = {rhs}"
                )


# ---- Designated-value characterization ------------------------------------


class TestComprehensionDesignatedValues:
    """The comprehension functor's sub-support is exactly the
    inverse-image of the designated value."""

    def test_classical_picks_truth_top(self) -> None:
        psi = fv({(1, 1): T_VAL, (1, 2): F_VAL, (2, 1): TOP, (2, 2): BOT})
        comp = comprehension_t("p", FULL, psi)
        assert comp.sub_support == frozenset({(1, 1)})

    def test_paraconsistent_picks_knowledge_top(self) -> None:
        psi = fv({(1, 1): T_VAL, (1, 2): F_VAL, (2, 1): TOP, (2, 2): BOT})
        comp = comprehension_k("p", FULL, psi)
        assert comp.sub_support == frozenset({(2, 1)})

    def test_classical_extension_shape(self) -> None:
        sub = frozenset({(1, 2), (2, 1)})
        g = PredicateSpecialization(source="q", target="p", sub_support=sub)
        ext = extension_t(g, BIL, entities=E, dom_p=FULL)
        assert ext.get(1, 2) == T_VAL
        assert ext.get(2, 1) == T_VAL
        assert ext.get(1, 1) == F_VAL  # extended by ⊥_t = f
        assert ext.get(2, 2) == F_VAL

    def test_paraconsistent_extension_shape(self) -> None:
        sub = frozenset({(1, 2), (2, 1)})
        g = PredicateSpecialization(source="q", target="p", sub_support=sub)
        ext = extension_k(g, BIL, entities=E, dom_p=FULL)
        assert ext.get(1, 2) == TOP
        assert ext.get(2, 1) == TOP
        assert ext.get(1, 1) == BOT  # extended by ⊥_k
        assert ext.get(2, 2) == BOT
