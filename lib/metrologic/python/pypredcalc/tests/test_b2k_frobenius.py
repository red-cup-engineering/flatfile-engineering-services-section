"""B2k — Frobenius reciprocity for ``∧_k`` across all four generators.

Verifies the identity:

    ∃_f^k(f^*(α) ∧_k φ)  =  α ∧_k ∃_f^k(φ)

for ``α ∈ A_p``, ``φ ∈ A_q``, and ``f`` any of the four predicate-category
generators (plus identity). The corpus's
``frobenius-for-knowledge-and-truth-meets`` theorem (with Lean proofs)
establishes the identity; we verify it exhaustively over a 2-entity
carrier.

The structural reason: ``⊥_k`` is the ``≤_k``-absorber of ``∧_k``, and
``∃_f^k`` extends by ``⊥_k``. Off-image cells reduce to
``α(c) ∧_k ⊥_k = ⊥_k`` on both sides; on-image cells are the same
expression. See ``frobenius-absorber-alignment-criterion.md``.
"""

from __future__ import annotations

from itertools import product

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import (
    PredicateConverse,
    PredicateIdentity,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells=None, dom=None):
    if dom is None:
        return FiberValuation.full(BIL, E, BOT, cells or {})
    return FiberValuation(BIL, E, BOT, cells or {}, dom=dom)
def _all_fibers_on(dom):
    cells_list = sorted(dom, key=lambda c: (str(c[0]), str(c[1])))
    if not cells_list:
        yield fv({}, dom=dom)
        return
    for assignment in product(FOUR, repeat=len(cells_list)):
        yield fv(dict(zip(cells_list, assignment, strict=True)), dom=dom)


def _check_frobenius_k(f, source_dom, target_dom):
    """For every (α ∈ A_p, φ ∈ A_q), assert
    ``∃_f^k(f^*(α) ∧_k φ) == α ∧_k ∃_f^k(φ)``."""
    for alpha in _all_fibers_on(target_dom):  # α on p (target)
        for phi in _all_fibers_on(source_dom):  # φ on q (source)
            lhs_inner = f.pullback(alpha).knowledge_meet(phi)
            lhs = f.existential_k(lhs_inner, target_dom)
            rhs = alpha.knowledge_meet(f.existential_k(phi, target_dom))
            assert lhs == rhs, (
                f"Frobenius_k failed for f={type(f).__name__}\n"
                f"  α (on p) = {dict(alpha.cells)}\n"
                f"  φ (on q) = {dict(phi.cells)}\n"
                f"  LHS = {dict(lhs.cells)}\n"
                f"  RHS = {dict(rhs.cells)}"
            )


# ---- Identity ----


class TestB2kIdentity:
    def test_frobenius(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        _check_frobenius_k(f, source_dom=FULL, target_dom=FULL)


# ---- Specialization ----


class TestB2kSpecialization:
    sub = frozenset({(1, 2), (2, 1)})

    def test_frobenius(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        _check_frobenius_k(f, source_dom=self.sub, target_dom=FULL)


# ---- Converse ----


class TestB2kConverse:
    def test_frobenius(self) -> None:
        f = PredicateConverse(source="p_c", target="p")
        _check_frobenius_k(f, source_dom=FULL, target_dom=FULL)


# ---- Subject-projection ----


class TestB2kSubjectProjection:
    def test_frobenius(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        _check_frobenius_k(f, source_dom=FULL, target_dom=FULL)


# ---- Object-projection ----


class TestB2kObjectProjection:
    def test_frobenius(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        _check_frobenius_k(f, source_dom=FULL, target_dom=FULL)
