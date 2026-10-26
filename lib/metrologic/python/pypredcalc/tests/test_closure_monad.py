"""Sprint A — closure 2-monad and Cl-algebra check.

Verifies:

- ``ClosureMonad.apply`` matches the underlying closure.
- ``unit_at`` is inflationary (η is monotone v ≤_k cl(v)).
- ``multiplication_at`` is identity for strict-idempotent operators.
- ``is_cl_algebra`` correctly classifies fixed points and reports
  failure cells when the valuation is not yet closed.
- A settled trajectory's quiescence point is a Cl-algebra (the corpus's
  primal characterisation).
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_monad import (
    ClAlgebraWitness,
    ClosureMonad,
    ClosureMonadLawWitness,
    is_cl_algebra,
)
from pypredcalc.predication.closure_rule import (
    And,
    CellAtom,
    FiberClosureRule,
    Var,
)
from pypredcalc.predication.closure_rule_system import (
    FiberClosureRuleSystem,
    empty_valuation,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
)
from pypredcalc.predication.settling import settle_from_rule_system

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells, dom=FULL):
    return FiberValuation(BIL, E, BOT, cells, dom=dom)


def _h(*predicates):
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(predicates),
        generators=(),
        domains={},
    )
    return PredicationHyperdoctrine(category=cat, bilattice=BIL)


def _transitive_system() -> FiberClosureRuleSystem:
    rule = FiberClosureRule(
        free_vars=("x", "y", "z"),
        forall_vars=(),
        antecedent=And(
            (
                CellAtom("R", Var("x"), Var("y"), T_VAL),
                CellAtom("R", Var("y"), Var("z"), T_VAL),
            )
        ),
        consequent=CellAtom("R", Var("x"), Var("z"), T_VAL),
    )
    return FiberClosureRuleSystem(rules=(rule,))


# ---- apply, unit, multiplication ------------------------------------------


class TestMonadStructure:
    def test_apply_matches_closure(self) -> None:
        H = _h("R")
        cl = _transitive_system().generate(H)
        monad = ClosureMonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        assert monad.apply(v) == cl.at(v)

    def test_unit_is_inflationary(self) -> None:
        H = _h("R")
        cl = _transitive_system().generate(H)
        monad = ClosureMonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        w = monad.unit_at(v)
        assert w.holds  # v ≤_k cl(v)

    def test_multiplication_is_identity_strict(self) -> None:
        """Strict-idempotent cl: μ_v is identity, holds == True."""
        H = _h("R")
        cl = _transitive_system().generate(H)
        monad = ClosureMonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        w = monad.multiplication_at(v)
        assert w.holds
        assert w.discrepancy == {}

    def test_law_witness_samples_unit_and_multiplication(self) -> None:
        H = _h("R")
        cl = _transitive_system().generate(H)
        monad = ClosureMonad(closure=cl)
        samples = (
            {"R": fv({})},
            {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})},
        )

        witness = monad.law_witness(samples)

        assert isinstance(witness, ClosureMonadLawWitness)
        assert witness.holds
        assert len(witness.unit_checks) == 2
        assert len(witness.multiplication_checks) == 2


# ---- Cl-algebra characterisation ------------------------------------------


class TestClAlgebra:
    def test_quiescence_is_cl_algebra(self) -> None:
        """A settled trajectory's quiescence point is a Cl-algebra."""
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        witness = is_cl_algebra(monad, settling.final)
        assert isinstance(witness, ClAlgebraWitness)
        assert witness.holds
        assert witness.failures == {}

    def test_non_closed_state_fails_with_localized_failure(self) -> None:
        """v_0 with R = {(1,2), (2,3)} is not yet closed; (1, 3) is missing.
        The Cl-algebra witness should fail and report (1, 3) as a failure cell."""
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        witness = is_cl_algebra(monad, v0)
        assert not witness.holds
        assert "R" in witness.failures
        assert (1, 3) in witness.failures["R"]

    def test_empty_state_with_no_rules_is_cl_algebra(self) -> None:
        H = _h("R", "S")
        s = FiberClosureRuleSystem(rules=())
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        witness = is_cl_algebra(monad, empty_valuation(H))
        assert witness.holds


# ---- Strict-idempotence on canonical inputs -------------------------------


class TestStrictIdempotenceAcrossSamples:
    """For a Scott-continuous (quantifier-free) rule system, the
    generated cl is strict-idempotent — verify across samples."""

    def test_idempotent_across_samples(self) -> None:
        H = _h("R")
        cl = _transitive_system().generate(H)
        monad = ClosureMonad(closure=cl)
        for cells in [
            {},
            {(1, 2): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL, (3, 1): T_VAL},
            {(1, 2): T_VAL, (3, 2): T_VAL},
        ]:
            v = {"R": fv(cells)}
            mu = monad.multiplication_at(v)
            assert mu.holds, (
                f"strict idempotence failed at {cells!r}: "
                f"discrepancy = {mu.discrepancy}"
            )
