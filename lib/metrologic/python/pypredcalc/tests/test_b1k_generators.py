"""B1k — knowledge-order quantifier adjoints for the remaining generators.

Verifies ``∃_f^k ⊣ f^* ⊣ ∀_f^k`` for converse, subject-projection,
object-projection, and identity. Specialization is tested separately
in ``test_b1k_specialization.py``.

Adjunction laws:
    ∃_f^k(α) ≤_k β  ⇔  α ≤_k f^*(β)
    f^*(β) ≤_k α    ⇔  β ≤_k ∀_f^k(α)
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
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)  # |FULL| = 4


def fv(cells=None, dom=None):
    if dom is None:
        return FiberValuation.full(BIL, E, BOT, cells or {})
    return FiberValuation(BIL, E, BOT, cells or {}, dom=dom)
def _all_fibers_on(dom):
    """Enumerate every fiber on the given dom over FOUR."""
    cells_list = sorted(dom, key=lambda c: (str(c[0]), str(c[1])))
    if not cells_list:
        yield fv({}, dom=dom)
        return
    for assignment in product(FOUR, repeat=len(cells_list)):
        yield fv(dict(zip(cells_list, assignment, strict=True)), dom=dom)


def _check_adjunction_pair(f, source_dom, target_dom):
    """Run both adjunction laws over every (α, β) pair and assert."""
    for alpha in _all_fibers_on(source_dom):
        for beta in _all_fibers_on(target_dom):
            # Existential: ∃_f(α) ≤_k β ⇔ α ≤_k f^*(β)
            lhs_e = f.existential_k(alpha, target_dom).knowledge_leq(beta)
            rhs_e = alpha.knowledge_leq(f.pullback(beta))
            assert lhs_e == rhs_e, (
                f"∃-adjunction failed for f={type(f).__name__} "
                f"α={dict(alpha.cells)} β={dict(beta.cells)}"
            )
            # Universal: f^*(β) ≤_k α ⇔ β ≤_k ∀_f(α)
            lhs_u = f.pullback(beta).knowledge_leq(alpha)
            rhs_u = beta.knowledge_leq(f.universal_k(alpha, target_dom))
            assert lhs_u == rhs_u, (
                f"∀-adjunction failed for f={type(f).__name__} "
                f"α={dict(alpha.cells)} β={dict(beta.cells)}"
            )


# ---- Identity ------------------------------------------------------------


class TestB1kIdentity:
    def test_existential_and_universal_are_identity(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        v = fv({(1, 1): T_VAL})
        assert f.existential_k(v, FULL) == v
        assert f.universal_k(v, FULL) == v

    def test_adjunction(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        _check_adjunction_pair(f, source_dom=FULL, target_dom=FULL)


# ---- Converse ------------------------------------------------------------


class TestB1kConverse:
    def test_existential_swaps(self) -> None:
        # f: p^c → p, so input on p^c, output on p.
        f = PredicateConverse(source="p_c", target="p")
        # Input fiber on p^c: dom = swap(target_dom)
        input_dom = frozenset((o, s) for (s, o) in FULL)  # = FULL since 2x2
        alpha = fv({(1, 2): T_VAL}, dom=input_dom)
        out = f.existential_k(alpha, FULL)
        assert out.get(2, 1) == T_VAL  # swapped
        assert out.dom == FULL

    def test_existential_equals_universal(self) -> None:
        # Swap is bijective; ∃ = ∀ for converse.
        f = PredicateConverse(source="p_c", target="p")
        alpha = fv({(1, 2): T_VAL, (2, 1): F_VAL})
        assert f.existential_k(alpha, FULL) == f.universal_k(alpha, FULL)

    def test_adjunction(self) -> None:
        f = PredicateConverse(source="p_c", target="p")
        # source dom = swap(target dom) = FULL (since FULL is symmetric)
        _check_adjunction_pair(f, source_dom=FULL, target_dom=FULL)


# ---- Subject-projection --------------------------------------------------


class TestB1kSubjectProjection:
    def test_existential_row_join_on_diagonal(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        # α at (1, 1)=T, (1, 2)=F. Row-join in ≤_k: T ∨_k F = TOP.
        alpha = fv({(1, 1): T_VAL, (1, 2): F_VAL})
        out = f.existential_k(alpha, FULL)
        assert out.get(1, 1) == TOP  # join along subject=1's row
        assert out.get(2, 2) == BOT  # subject=2's row is empty in α
        assert out.get(1, 2) == BOT  # off-diagonal
        assert out.get(2, 1) == BOT  # off-diagonal

    def test_universal_row_meet_on_diagonal(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        # α at (1, 1)=T, (1, 2)=BOT. Row-meet in ≤_k:
        # T ∧_k BOT = BOT (BOT is absorber for ≤_k-meet... wait,
        # actually BOT is the bottom of ≤_k, so it's the absorber of ∧_k).
        alpha = fv({(1, 1): T_VAL})
        out = f.universal_k(alpha, FULL)
        # Row 1: cells (1,1)=T, (1,2)=BOT. ∧_k yields BOT.
        # Row 2: cells (2,1)=BOT, (2,2)=BOT. ∧_k yields BOT.
        assert out.get(1, 1) == BOT
        assert out.get(2, 2) == BOT
        # Off-diagonal: empty meet = TOP (knowledge-top).
        assert out.get(1, 2) == TOP
        assert out.get(2, 1) == TOP

    def test_adjunction(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        _check_adjunction_pair(f, source_dom=FULL, target_dom=FULL)


# ---- Object-projection ---------------------------------------------------


class TestB1kObjectProjection:
    def test_existential_column_join_on_diagonal(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        # α at (1, 1)=T, (2, 1)=F. Column 1's join: T ∨_k F = TOP.
        alpha = fv({(1, 1): T_VAL, (2, 1): F_VAL})
        out = f.existential_k(alpha, FULL)
        assert out.get(1, 1) == TOP  # column o=1
        assert out.get(2, 2) == BOT  # column o=2 empty
        assert out.get(1, 2) == BOT  # off-diagonal
        assert out.get(2, 1) == BOT

    def test_universal_column_meet_on_diagonal(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        alpha = fv({(1, 1): T_VAL})
        out = f.universal_k(alpha, FULL)
        # input.dom = FULL ⇒ every column has both cells. Both columns
        # contain a BOT (since α only has (1,1)=T), so column-meets are BOT.
        # Column 1: (1,1)=T, (2,1)=BOT ⇒ meet=BOT.
        # Column 2: (1,2)=BOT, (2,2)=BOT ⇒ meet=BOT.
        assert out.get(1, 1) == BOT
        assert out.get(2, 2) == BOT
        # Off-diagonal: empty meet = TOP.
        assert out.get(1, 2) == TOP
        assert out.get(2, 1) == TOP

    def test_adjunction(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        _check_adjunction_pair(f, source_dom=FULL, target_dom=FULL)
