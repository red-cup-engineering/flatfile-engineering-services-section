"""Sprint C1 — ClosureOperator at the predication-fiber-algebra level.

Tests verify (a) that ``ClosureOperator`` enforces structural invariants
(family covers every predicate, application preserves ``dom``) and
(b) that the four axiom-check witnesses correctly classify operators —
identity passes all four; deliberately broken operators fail in their
intended axiom.
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure import (
    ClosureAxiomWitness,
    ClosureOperator,
    identity_closure,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateConverse,
    PredicateSet,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)
SUB = frozenset({(1, 2), (2, 1)})


def fv(cells, dom):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


def _hyperdoctrine(*generators):
    predicates: list = []
    domains: dict = {}
    for gen in generators:
        for p in (gen.source, gen.target):
            if p not in predicates:
                predicates.append(p)
        if isinstance(gen, PredicateSpecialization):
            domains[gen.source] = gen.sub_support
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(predicates),
        generators=tuple(generators),
        domains=domains,
    )
    return PredicationHyperdoctrine(category=cat, bilattice=BIL)


# ---- Construction --------------------------------------------------------


class TestConstruction:
    def test_missing_predicate_rejected(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        try:
            ClosureOperator(hyperdoctrine=H, family={"p": lambda v: v})
        except ValueError as exc:
            assert "missing entries" in str(exc)
        else:
            raise AssertionError("expected ValueError for missing predicate")

    def test_unknown_predicate_rejected(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        try:
            ClosureOperator(
                hyperdoctrine=H,
                family={"p": lambda v: v, "p_c": lambda v: v, "ghost": lambda v: v},
            )
        except ValueError as exc:
            assert "unknown predicates" in str(exc)
        else:
            raise AssertionError("expected ValueError for unknown predicate")

    def test_apply_rejects_wrong_dom(self) -> None:
        H = _hyperdoctrine(
            PredicateSpecialization(source="q", target="p", sub_support=SUB)
        )
        cl = identity_closure(H)
        bad = fv({(1, 1): T_VAL}, dom=FULL)  # but predicate q has dom=SUB
        try:
            cl.apply("q", bad)
        except ValueError as exc:
            assert "does not match" in str(exc)
        else:
            raise AssertionError("expected ValueError for dom mismatch")

    def test_apply_rejects_dom_changing_family(self) -> None:
        H = _hyperdoctrine(
            PredicateSpecialization(source="q", target="p", sub_support=SUB)
        )

        def bad_cl(v: FiberValuation):
            # Returns a fiber with a different dom — illegal.
            return FiberValuation(BIL, E, BOT, {}, dom=SUB)

        cl = ClosureOperator(
            hyperdoctrine=H,
            family={"p": bad_cl, "q": lambda v: v},
        )
        v = fv({(1, 1): T_VAL}, dom=FULL)
        try:
            cl.apply("p", v)
        except ValueError as exc:
            assert "returned a fiber" in str(exc)
        else:
            raise AssertionError("expected ValueError for dom-changing cl")


# ---- Identity closure passes all four axioms -----------------------------


class TestIdentityClosurePassesAxioms:
    """``cl_p = id`` on every fiber satisfies monotone-≤_k, inflationary,
    idempotent, and 𝒞-natural vacuously."""

    def test_monotone_k(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        cl = identity_closure(H)
        v = fv({(1, 2): T_VAL}, dom=FULL)
        v_prime = fv({(1, 2): T_VAL, (2, 1): TOP}, dom=FULL)
        w = cl.check_monotone_k([("p", v, v_prime), ("p_c", v, v_prime)])
        assert isinstance(w, ClosureAxiomWitness)
        assert w.holds
        assert len(w.checks) == 2

    def test_inflationary(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        cl = identity_closure(H)
        v = fv({(1, 2): T_VAL}, dom=FULL)
        w = cl.check_inflationary([("p", v), ("p_c", v)])
        assert w.holds

    def test_idempotent(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        cl = identity_closure(H)
        v = fv({(1, 2): T_VAL}, dom=FULL)
        w = cl.check_idempotent([("p", v), ("p_c", v)])
        assert w.holds

    def test_c_natural(self) -> None:
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))
        cl = identity_closure(H)
        # f^*(id v) = f^*(v) = id(f^*(v))  — trivially.
        conv = next(iter(H.category.generators))
        v = fv({(1, 2): T_VAL, (2, 1): F_VAL}, dom=FULL)
        w = cl.check_c_natural([(conv, v)])
        assert w.holds

    def test_c_natural_generated_checks_composites(self) -> None:
        H = _hyperdoctrine(
            PredicateConverse(source="p_c", target="p"),
            PredicateSubjectProjection(source="q", target="p_c"),
        )
        cl = identity_closure(H)

        w = cl.check_c_natural_generated(max_depth=2)

        assert w.holds
        assert any(
            getattr(check.locus, "_first", None) is not None
            for check in w.checks
        )


# ---- Deliberately broken operators surface their failure -----------------


class TestBrokenOperatorsFailCorrectly:
    """A pathological closure family violates exactly the axiom we expect."""

    def test_non_inflationary_caught(self) -> None:
        """``cl_p = constant ⊥`` is monotone (constant) and idempotent
        (still constant) but not inflationary — for a non-bottom v,
        v ≰_k ⊥."""
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))

        def constant_bottom(v: FiberValuation):
            return fv({}, dom=FULL)

        cl = ClosureOperator(
            hyperdoctrine=H,
            family={"p": constant_bottom, "p_c": constant_bottom},
        )
        v = fv({(1, 2): TOP}, dom=FULL)
        w = cl.check_inflationary([("p", v)])
        assert not w.holds
        assert len(w.failures) == 1

    def test_non_idempotent_caught(self) -> None:
        """A closure that strictly grows on every application breaks
        idempotence."""
        H = _hyperdoctrine(PredicateConverse(source="p_c", target="p"))

        # cl_p adds (1, 1) ↦ TOP if not already TOP, else identity.
        def grow_at_11(v: FiberValuation):
            new_cells = dict(v.cells)
            cur = v.get(1, 1)
            if cur != TOP:
                # Knowledge-join with TOP.
                new_cells[(1, 1)] = TOP
            return fv(new_cells, dom=FULL)

        # Force non-idempotence: a wrapper that picks up an additional
        # cell only if the predicate equals "p" *and* (1,1) is already TOP
        # (so cl(cl(v)) ≠ cl(v) once (1,1) is TOP, by adding (2,2) ↦ TOP).
        def cl_p(v: FiberValuation):
            stage1 = grow_at_11(v)
            if stage1.get(1, 1) == TOP and stage1.get(2, 2) != TOP:
                # Non-idempotent: only adds (2,2) on the *second* round.
                if v.get(1, 1) != TOP:
                    return stage1  # first round
                new_cells = dict(stage1.cells)
                new_cells[(2, 2)] = TOP
                return fv(new_cells, dom=FULL)
            return stage1

        cl = ClosureOperator(
            hyperdoctrine=H,
            family={"p": cl_p, "p_c": grow_at_11},
        )
        v = fv({}, dom=FULL)
        w = cl.check_idempotent([("p", v)])
        assert not w.holds
        # The discrepancy reports the cell (2, 2).
        assert (2, 2) in w.failures[0].discrepancy

    def test_non_natural_caught(self) -> None:
        """A closure that fires on ``p`` but not on ``p_c`` violates
        𝒞-naturality along converse: f^*(cl_p(v)) ≠ cl_{p_c}(f^*(v))."""
        conv = PredicateConverse(source="p_c", target="p")
        H = _hyperdoctrine(conv)

        # cl_p adds (1, 2) ↦ TOP; cl_{p_c} = id.
        def cl_p(v: FiberValuation):
            new_cells = dict(v.cells)
            new_cells[(1, 2)] = TOP
            return fv(new_cells, dom=FULL)

        cl = ClosureOperator(
            hyperdoctrine=H,
            family={"p": cl_p, "p_c": lambda v: v},
        )

        v = fv({}, dom=FULL)
        w = cl.check_c_natural([(conv, v)])
        # f^*(cl_p(v)) has (2, 1) ↦ TOP after converse pullback;
        # cl_{p_c}(f^*(v)) is empty. They disagree at (2, 1).
        assert not w.holds
        assert (2, 1) in w.failures[0].discrepancy
