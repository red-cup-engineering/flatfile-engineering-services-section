"""Frobenius for twist-product fusion ``⊙`` — the asymmetry the corpus
predicts.

The corpus theorem ``frobenius-for-fusion-fails`` says: Frobenius
reciprocity for ``⊙`` does *not* hold along specialization,
subject-projection, or object-projection — it holds only for converse
(and trivially for identity).

The structural reason (``frobenius-absorber-alignment-criterion``):

    ``∃_f`` extends by ``⊥_k``; ``⊙``'s absorber is ``f``, not ``⊥_k``.

So at off-image cells, ``LHS = ⊥_k`` (extension default) while
``RHS = α(c) ⊙ ⊥_k`` which equals ``⟨0, 1⟩ = f`` for non-trivial α.
The two diverge by exactly the absorber-alignment gap.

These tests verify both sides of the corpus prediction:
- Holds for converse and identity (exhaustively).
- Fails for spec/sub-proj/obj-proj (with a specific counterexample
  matching the corpus's `frobenius-for-fusion-fails.md` proof).
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


def _frobenius_holds_for_fusion(f, source_dom, target_dom) -> bool:
    """Return True iff ``∃_f^k(f^*(α) ⊙ φ) == α ⊙ ∃_f^k(φ)`` for every
    (α, φ) pair on the given doms."""
    for alpha in _all_fibers_on(target_dom):
        for phi in _all_fibers_on(source_dom):
            lhs = f.existential_k(f.pullback(alpha).fusion(phi), target_dom)
            rhs = alpha.fusion(f.existential_k(phi, target_dom))
            if lhs != rhs:
                return False
    return True


# ---- Holds: converse and identity ----


class TestFusionFrobeniusHoldsForBijectiveGenerators:
    """No extension means no absorber-alignment requirement; ``⊙``
    Frobenius holds trivially."""

    def test_converse(self) -> None:
        f = PredicateConverse(source="p_c", target="p")
        assert _frobenius_holds_for_fusion(f, source_dom=FULL, target_dom=FULL)

    def test_identity(self) -> None:
        f = PredicateIdentity(source="p", target="p")
        assert _frobenius_holds_for_fusion(f, source_dom=FULL, target_dom=FULL)


# ---- Fails: specialization (corpus's explicit counterexample) ----


class TestFusionFrobeniusFailsForSpecialization:
    """Reproduces ``frobenius-for-fusion-fails.md``'s proof.

    Setup: ``dom(q) = {(1, 1)}``, ``dom(p) = E × E``.
    Take ``α(1, 2) = f`` and ``φ(1, 1) = ⊥``.

    LHS at (1, 2): ``∃_f^k`` extends by ⊥, so ``∃_f^k(... ⊙ φ)(1, 2) = ⊥``.
    RHS at (1, 2): ``α(1, 2) ⊙ ∃_f^k(φ)(1, 2) = f ⊙ ⊥ = ⟨0, 1⟩ = f``.

    LHS ≠ RHS at (1, 2). The two-cell counterexample is enough to falsify
    the universal-quantifier identity.
    """

    sub = frozenset({(1, 1)})

    def test_corpus_counterexample(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        alpha = fv({(1, 2): F_VAL}, dom=FULL)
        phi = fv({}, dom=self.sub)  # φ(1, 1) = ⊥ implicit
        lhs = f.existential_k(f.pullback(alpha).fusion(phi), FULL)
        rhs = alpha.fusion(f.existential_k(phi, FULL))
        assert lhs.get(1, 2) == BOT, "LHS at off-image cell should be ⊥"
        assert rhs.get(1, 2) == F_VAL, "RHS at off-image cell should be f"
        assert lhs != rhs, "Frobenius for ⊙ via specialization must FAIL"

    def test_exhaustive_finds_failure(self) -> None:
        f = PredicateSpecialization(source="q", target="p", sub_support=self.sub)
        assert not _frobenius_holds_for_fusion(
            f, source_dom=self.sub, target_dom=FULL
        ), "exhaustive enumeration should find at least one (α, φ) violating Frobenius for ⊙"


# ---- Fails: subject-projection ----


class TestFusionFrobeniusFailsForSubjectProjection:
    """Subject-projection's ``∃_f^k`` extends by ⊥ off-diagonal; ``⊙``'s
    absorber is f, not ⊥. The off-diagonal absorber-misalignment makes
    Frobenius fail."""

    def test_exhaustive_finds_failure(self) -> None:
        f = PredicateSubjectProjection(source="q", target="p")
        assert not _frobenius_holds_for_fusion(
            f, source_dom=FULL, target_dom=FULL
        )


# ---- Fails: object-projection ----


class TestFusionFrobeniusFailsForObjectProjection:
    def test_exhaustive_finds_failure(self) -> None:
        f = PredicateObjectProjection(source="q", target="p")
        assert not _frobenius_holds_for_fusion(
            f, source_dom=FULL, target_dom=FULL
        )
