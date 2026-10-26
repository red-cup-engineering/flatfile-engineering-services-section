"""Tests for ResiduatedLattice axiom-checker and residuum."""

import pytest

from pypredcalc.algebra.residuated_lattice import (
    ResiduatedLattice,
    boolean_residuated_lattice,
)


class TestBooleanCase:
    def test_constructs(self) -> None:
        rl = boolean_residuated_lattice()
        assert rl.unit == 1

    def test_residuum_implication(self) -> None:
        rl = boolean_residuated_lattice()
        # 1 → 0 = 0; everything else → 1
        assert rl.residuum(1, 0) == 0
        assert rl.residuum(0, 0) == 1
        assert rl.residuum(0, 1) == 1
        assert rl.residuum(1, 1) == 1


class TestThreeElementChain:
    """Gödel chain {0, 1/2, 1} with ⊗ = min."""

    def _rl(self) -> ResiduatedLattice[int]:
        return ResiduatedLattice(
            carrier=frozenset([0, 1, 2]),
            leq=lambda a, b: a <= b,
            join=lambda a, b: max(a, b),
            meet=lambda a, b: min(a, b),
            tensor=lambda a, b: min(a, b),
            unit=2,
        )

    def test_constructs(self) -> None:
        rl = self._rl()
        assert rl.unit == 2

    def test_godel_residuum(self) -> None:
        # Gödel implication: a → b = 1 if a ≤ b else b
        rl = self._rl()
        assert rl.residuum(2, 1) == 1
        assert rl.residuum(1, 2) == 2
        assert rl.residuum(2, 0) == 0


class TestAxiomViolations:
    def test_unit_not_top_raises(self) -> None:
        with pytest.raises(ValueError, match="unit|integrality"):
            ResiduatedLattice(
                carrier=frozenset([0, 1]),
                leq=lambda a, b: a <= b,
                join=lambda a, b: max(a, b),
                meet=lambda a, b: min(a, b),
                tensor=lambda a, b: min(a, b),
                unit=0,  # not the top, and also not a monoid unit
            )

    def test_non_commutative_tensor_raises(self) -> None:
        with pytest.raises(ValueError, match="commutative"):
            ResiduatedLattice(
                carrier=frozenset([0, 1]),
                leq=lambda a, b: a <= b,
                join=lambda a, b: max(a, b),
                meet=lambda a, b: min(a, b),
                tensor=lambda a, b: a,  # left-projection — not commutative
                unit=1,
            )

    def test_join_outside_carrier_raises(self) -> None:
        with pytest.raises(ValueError, match="not in carrier"):
            ResiduatedLattice(
                carrier=frozenset([0]),
                leq=lambda a, b: a == b,
                join=lambda a, b: 999,
                meet=lambda a, b: a,
                tensor=lambda a, b: a,
                unit=0,
            )

    def test_non_lub_join_raises(self) -> None:
        # Diamond {0, a, b, 1} but join(a, b) = 1 is fine; force join(0, a)=1 (not LUB).
        with pytest.raises(ValueError, match="LEAST"):
            ResiduatedLattice(
                carrier=frozenset([0, 1, 2]),
                leq=lambda a, b: a <= b,
                join=lambda a, b: 2 if (a, b) == (0, 1) or (a, b) == (1, 0) else max(a, b),
                meet=lambda a, b: min(a, b),
                tensor=lambda a, b: min(a, b),
                unit=2,
            )

    def test_residuation_biconditional_failure_caught(self) -> None:
        # Tensor = max breaks integrality (unit not absorbing for ≤).
        with pytest.raises(ValueError):
            ResiduatedLattice(
                carrier=frozenset([0, 1]),
                leq=lambda a, b: a <= b,
                join=lambda a, b: max(a, b),
                meet=lambda a, b: min(a, b),
                tensor=lambda a, b: max(a, b),
                unit=1,
            )

    def test_empty_carrier_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            ResiduatedLattice(
                carrier=frozenset(),
                leq=lambda a, b: True,
                join=lambda a, b: a,
                meet=lambda a, b: a,
                tensor=lambda a, b: a,
                unit=0,
            )
