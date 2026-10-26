"""Sprint CA — dualized closure comonad and the algebra/coalgebra correspondence.

Verifies:

- ``DualizedClosureComonad.counit_at`` agrees with the Cl-algebra check
  on fixed points (counit is identity inclusion).
- ``is_cl_coalgebra`` matches ``is_cl_algebra`` on every valuation
  (this *is* the corpus theorem
  ``closure-algebra-coalgebra-correspondence``).
- ``algebra_to_coalgebra`` and ``coalgebra_to_algebra`` are mutually
  inverse and preserve underlying valuation / failure data.
- The comultiplication is identity for strict-idempotent operators.
"""

from __future__ import annotations

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_comonad import (
    ClCoalgebraWitness,
    DualizedClosureComonad,
    DualizedClosureComonadLawWitness,
    algebra_to_coalgebra,
    coalgebra_to_algebra,
    is_cl_coalgebra,
    make_comonad_from_monad,
)
from pypredcalc.predication.closure_monad import (
    ClAlgebraWitness,
    ClosureMonad,
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


# ---- Comonad surface -----------------------------------------------------


class TestComonadSurface:
    def test_counit_holds_at_fixed_point(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        comonad = DualizedClosureComonad(closure=cl)
        # Quiescence point of a settling is a fixed point.
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        w = comonad.counit_at(settling.final)
        assert w.holds  # ε* is identity inclusion at the fixed point

    def test_counit_fails_off_fixed_point(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        comonad = DualizedClosureComonad(closure=cl)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        w = comonad.counit_at(v0)
        # v_0 is not yet closed (1, 3) missing — counit doesn't hold.
        assert not w.holds

    def test_comultiplication_identity_strict(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        comonad = DualizedClosureComonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        w = comonad.comultiplication_at(v)
        assert w.holds

    def test_law_witness_samples_counit_and_comultiplication(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        comonad = DualizedClosureComonad(closure=cl)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        v_fix = settle_from_rule_system(H, s, v0, bound=10).final

        witness = comonad.law_witness((v_fix,))

        assert isinstance(witness, DualizedClosureComonadLawWitness)
        assert witness.holds
        assert len(witness.counit_checks) == 1
        assert len(witness.comultiplication_checks) == 1


# ---- The algebra/coalgebra correspondence --------------------------------


class TestAlgebraCoalgebraCorrespondence:
    """The corpus theorem: ``v`` is a Cl-algebra iff it is a Cl*-coalgebra."""

    def test_correspondence_on_quiescent_state(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        comonad = make_comonad_from_monad(monad)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        settling = settle_from_rule_system(H, s, v0, bound=10)
        v_fix = settling.final
        assert is_cl_algebra(monad, v_fix).holds
        assert is_cl_coalgebra(comonad, v_fix).holds

    def test_correspondence_on_non_fixed_state(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        comonad = make_comonad_from_monad(monad)
        v0 = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}  # not closed
        alg = is_cl_algebra(monad, v0)
        coalg = is_cl_coalgebra(comonad, v0)
        assert not alg.holds
        assert not coalg.holds
        # And the failure cells coincide.
        assert alg.failures == coalg.failures

    def test_correspondence_sweep(self) -> None:
        """Across many random-ish samples, algebra-membership ⇔ coalgebra-
        membership holds — this is the bijection at the level of
        underlying valuations."""
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        comonad = make_comonad_from_monad(monad)
        for cells in [
            {},
            {(1, 2): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL},
            {(1, 2): T_VAL, (2, 3): T_VAL, (1, 3): T_VAL},  # closed!
            {(1, 1): T_VAL},
            {(1, 1): T_VAL, (1, 2): T_VAL, (1, 3): T_VAL},
            {(s, o): T_VAL for s in [1, 2, 3] for o in [1, 2, 3]},  # full → closed
        ]:
            v = {"R": fv(cells)}
            alg = is_cl_algebra(monad, v).holds
            coalg = is_cl_coalgebra(comonad, v).holds
            assert alg == coalg, (
                f"correspondence failed on {cells!r}: "
                f"algebra={alg}, coalgebra={coalg}"
            )


# ---- Bijection at the witness level --------------------------------------


class TestWitnessBijection:
    def test_algebra_to_coalgebra_preserves_data(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        alg = is_cl_algebra(monad, v)
        coalg = algebra_to_coalgebra(alg)
        assert isinstance(coalg, ClCoalgebraWitness)
        assert coalg.valuation == alg.valuation
        assert coalg.closure_image == alg.closure_image
        assert coalg.holds == alg.holds
        assert coalg.failures == alg.failures

    def test_coalgebra_to_algebra_preserves_data(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        comonad = DualizedClosureComonad(closure=cl)
        v = {"R": fv({(1, 2): T_VAL, (2, 3): T_VAL})}
        coalg = is_cl_coalgebra(comonad, v)
        alg = coalgebra_to_algebra(coalg)
        assert isinstance(alg, ClAlgebraWitness)
        assert alg.valuation == coalg.valuation
        assert alg.closure_image == coalg.closure_image

    def test_round_trip_is_identity(self) -> None:
        H = _h("R")
        s = _transitive_system()
        cl = s.generate(H)
        monad = ClosureMonad(closure=cl)
        v = empty_valuation(H)
        alg = is_cl_algebra(monad, v)
        round_trip = coalgebra_to_algebra(algebra_to_coalgebra(alg))
        assert round_trip.valuation == alg.valuation
        assert round_trip.closure_image == alg.closure_image
        assert round_trip.holds == alg.holds
