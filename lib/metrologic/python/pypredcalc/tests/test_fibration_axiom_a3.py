"""Verify predication-fibration axiom (A3) on the four generators.

Axiom (A3) of `objects/predication-fibration.md` states that for every
``f: q → p`` in the predicate category, the reindexing ``f^* : A_p → A_q``
is a bilattice-residuated homomorphism — preserves all of
``∧_t, ∨_t, ∧_k, ∨_k, ∼, ⊙, ⇒`` pointwise.

The four canonical generators are tested against the seven operations.
For converse, subject-projection, and object-projection, the test runs
on full-domain predicates (``dom = E × E``) and verifies preservation on
every cell of ``E × E``. For specialization, we run the test against a
proper sub-support and **verify preservation on the sub-support only**:
this is the cell-level reading of A3 with the corpus convention that the
fiber algebra over ``q`` is naturally ``L^{⋈ dom(q)}`` and the
"out-of-dom values are BOT" extension is a representational convenience,
not part of the substantive claim. See the surfaced caveat below.
"""

from __future__ import annotations

import pytest

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import (
    PredicateConverse,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

E = EntitySet.of([1, 2, 3])
BIL = boolean_twist()
BOT = (0, 0)


def _sample_fibers():
    """A handful of fiber valuations for stress-testing preservation."""
    cells_a = {
        (1, 1): (1, 0),
        (1, 2): (0, 1),
        (2, 3): (1, 1),
    }
    cells_b = {
        (1, 1): (0, 1),
        (2, 1): (1, 0),
        (3, 3): (1, 0),
    }
    cells_c = {(s, o): (1, 1) for s in E for o in E}
    cells_d = {}
    return [
        FiberValuation.full(BIL, E, BOT, cells_a),
        FiberValuation.full(BIL, E, BOT, cells_b),
        FiberValuation.full(BIL, E, BOT, cells_c),
        FiberValuation.full(BIL, E, BOT, cells_d),
    ]


# Map operation name to a pair (binary?, function applied to fibers).
# Each function takes (v, w) for binary or (v,) for unary, and returns
# the fiber resulting from applying the bilattice op.
_BINARY_OPS = {
    "knowledge_join": lambda v, w: v.knowledge_join(w),
    "knowledge_meet": lambda v, w: v.knowledge_meet(w),
    "truth_join": lambda v, w: v.truth_join(w),
    "truth_meet": lambda v, w: v.truth_meet(w),
    "fusion": lambda v, w: v.fusion(w),
    "right_residual": lambda v, w: v.right_residual(w),
}


def _check_preservation(morphism, op_name, op, v, w, cells_to_check):
    """For binary ``op``, assert ``f^*(v op w) = f^*(v) op f^*(w)`` on the
    given cell set. Returns a diagnostic message on failure."""
    lhs = morphism.pullback(op(v, w))
    rhs = op(morphism.pullback(v), morphism.pullback(w))
    for cell in cells_to_check:
        if lhs.get(*cell) != rhs.get(*cell):
            return (
                f"{type(morphism).__name__} fails preservation of "
                f"{op_name} at cell {cell}: "
                f"f^*(v op w)={lhs.get(*cell)}, f^*(v) op f^*(w)={rhs.get(*cell)}"
            )
    return None


def _check_negation_preservation(morphism, v, cells_to_check):
    lhs = morphism.pullback(v.negate())
    rhs = morphism.pullback(v).negate()
    for cell in cells_to_check:
        if lhs.get(*cell) != rhs.get(*cell):
            return (
                f"{type(morphism).__name__} fails preservation of negation "
                f"at cell {cell}: f^*(~v)={lhs.get(*cell)}, "
                f"~f^*(v)={rhs.get(*cell)}"
            )
    return None


# All E × E cells — used for converse, subject_projection, object_projection
# (full-domain morphisms).
_ALL_CELLS = [(s, o) for s in E for o in E]


class TestA3OnConverse:
    """Converse on full-domain predicates: f^*(v)(s,o) = v(o,s)."""

    morphism = PredicateConverse(source="qc", target="q")

    @pytest.mark.parametrize("op_name", list(_BINARY_OPS))
    def test_preserves_binary_op(self, op_name) -> None:
        op = _BINARY_OPS[op_name]
        fibers = _sample_fibers()
        for v in fibers:
            for w in fibers:
                err = _check_preservation(
                    self.morphism, op_name, op, v, w, _ALL_CELLS
                )
                assert err is None, err

    def test_preserves_negation(self) -> None:
        for v in _sample_fibers():
            err = _check_negation_preservation(self.morphism, v, _ALL_CELLS)
            assert err is None, err


class TestA3OnSubjectProjection:
    morphism = PredicateSubjectProjection(source="qsp", target="q")

    @pytest.mark.parametrize("op_name", list(_BINARY_OPS))
    def test_preserves_binary_op(self, op_name) -> None:
        op = _BINARY_OPS[op_name]
        fibers = _sample_fibers()
        for v in fibers:
            for w in fibers:
                err = _check_preservation(
                    self.morphism, op_name, op, v, w, _ALL_CELLS
                )
                assert err is None, err

    def test_preserves_negation(self) -> None:
        for v in _sample_fibers():
            err = _check_negation_preservation(self.morphism, v, _ALL_CELLS)
            assert err is None, err


class TestA3OnObjectProjection:
    morphism = PredicateObjectProjection(source="qop", target="q")

    @pytest.mark.parametrize("op_name", list(_BINARY_OPS))
    def test_preserves_binary_op(self, op_name) -> None:
        op = _BINARY_OPS[op_name]
        fibers = _sample_fibers()
        for v in fibers:
            for w in fibers:
                err = _check_preservation(
                    self.morphism, op_name, op, v, w, _ALL_CELLS
                )
                assert err is None, err

    def test_preserves_negation(self) -> None:
        for v in _sample_fibers():
            err = _check_negation_preservation(self.morphism, v, _ALL_CELLS)
            assert err is None, err


class TestA3OnSpecialization:
    """Specialization with a proper sub-support.

    Per the corpus, A_q (when q has domain ``dom(q) ⊊ E × E``) is naturally
    ``L^{⋈ dom(q)}`` — a fiber algebra on the sub-support. The "BOT outside
    dom(q)" extension is a representational convenience for working with a
    common ``E × E`` carrier; the substantive A3 claim is preservation on
    ``dom(q)``. Outside ``dom(q)`` the claim does **not** hold for fusion
    or right_residual: ``BOT ⊙ BOT = ⟨0, 1⟩`` in the Boolean twist (= F),
    not BOT, so ``f^*(v) ⊙ f^*(w)`` extended by BOT-outside-dom does **not**
    equal ``f^*(v ⊙ w)`` on those cells. See the caveat in
    :class:`TestA3SpecializationOutsideDom`.
    """

    sub_support = frozenset([(1, 1), (1, 2), (2, 3)])
    morphism = PredicateSpecialization(
        source="q", target="p", sub_support=sub_support
    )

    @pytest.mark.parametrize("op_name", list(_BINARY_OPS))
    def test_preserves_binary_op_on_dom(self, op_name) -> None:
        op = _BINARY_OPS[op_name]
        fibers = _sample_fibers()
        cells_to_check = list(self.sub_support)
        for v in fibers:
            for w in fibers:
                err = _check_preservation(
                    self.morphism, op_name, op, v, w, cells_to_check
                )
                assert err is None, err

    def test_preserves_negation_on_dom(self) -> None:
        for v in _sample_fibers():
            err = _check_negation_preservation(
                self.morphism, v, list(self.sub_support)
            )
            assert err is None, err


class TestA3SpecializationDomAware:
    """With ``dom`` first-class on FiberValuation, specialization's
    output fiber has ``dom = sub_support`` — there are no out-of-dom
    cells to compare, and the previous off-dom asymmetry vanishes.
    A3 holds *as a fiber-algebra equality*, not just cell-wise on dom.
    """

    sub_support = frozenset([(1, 1)])
    morphism = PredicateSpecialization(
        source="q", target="p", sub_support=sub_support
    )

    def test_fusion_pullback_equals_pullback_fusion(self) -> None:
        v = FiberValuation.full(BIL, E, BOT, {(1, 1): (1, 0)})
        w = FiberValuation.full(BIL, E, BOT, {(1, 1): (0, 1)})
        lhs = self.morphism.pullback(v.fusion(w))
        rhs = self.morphism.pullback(v).fusion(self.morphism.pullback(w))
        # Whole-fiber equality: same dom, same cells.
        assert lhs == rhs
        assert lhs.dom == self.sub_support
        assert rhs.dom == self.sub_support
