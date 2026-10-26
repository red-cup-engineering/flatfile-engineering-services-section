"""Tests for SubstitutionMatrix and corpus instances."""

import pytest

from pypredcalc._linalg import Matrix
from pypredcalc.dynamics import (
    FIBONACCI,
    FIBONACCI_DEFAULT_VALUATION,
    PADOVAN,
    PADOVAN_DEFAULT_VALUATION,
    TETRANACCI,
    TETRANACCI_DEFAULT_VALUATION,
    THUE_MORSE,
    THUE_MORSE_DEFAULT_VALUATION,
    TRIBONACCI,
    SubstitutionMatrix,
)


class TestValidation:
    def test_non_square_raises(self) -> None:
        with pytest.raises(ValueError, match="square"):
            SubstitutionMatrix(Matrix.from_rows([[1, 0]]))

    def test_negative_entry_raises(self) -> None:
        with pytest.raises(ValueError, match="non-negative integer"):
            SubstitutionMatrix(Matrix.from_rows([[-1, 0], [0, 1]]))


class TestFibonacci:
    def test_alphabet_size(self) -> None:
        assert FIBONACCI.n == 2

    def test_not_singular(self) -> None:
        assert not FIBONACCI.is_singular()

    def test_unimodular(self) -> None:
        assert FIBONACCI.is_unimodular()

    def test_primitive(self) -> None:
        is_prim, _ = FIBONACCI.is_primitive()
        assert is_prim

    def test_is_pisot(self) -> None:
        assert FIBONACCI.is_pisot()

    def test_regime_aperiodic(self) -> None:
        assert FIBONACCI.regime() == "aperiodic"

    def test_cohomological_rank(self) -> None:
        assert FIBONACCI.cohomological_rank() == 2

    def test_unimodular_torsion_free(self) -> None:
        assert FIBONACCI.is_unimodular_torsion_free()

    def test_not_self_dual(self) -> None:
        assert not FIBONACCI.is_substitution_rule_self_dual(FIBONACCI_DEFAULT_VALUATION)

    def test_perron_eigenvalue_is_golden_ratio(self) -> None:
        ev = FIBONACCI.perron_eigenvalue()
        assert abs(ev.real - 1.6180339887498949) < 1e-9
        assert abs(ev.imag) < 1e-9

    def test_firing_type_t(self) -> None:
        assert FIBONACCI.firing_type(0, FIBONACCI_DEFAULT_VALUATION) == "truth-only"

    def test_firing_type_f(self) -> None:
        assert FIBONACCI.firing_type(1, FIBONACCI_DEFAULT_VALUATION) == "falsity-only"

    def test_shadow_ranks(self) -> None:
        l_plus, l_minus = FIBONACCI.shadow_ranks(FIBONACCI_DEFAULT_VALUATION)
        assert l_plus == 1
        assert l_minus == 1

    def test_inclusion_exclusion(self) -> None:
        rel = FIBONACCI.inclusion_exclusion_relation(FIBONACCI_DEFAULT_VALUATION)
        assert rel == {
            "n_alphabet": 2,
            "l_plus": 1,
            "l_minus": 1,
            "n_top": 0,
            "n_bot": 0,
        }


class TestThueMorse:
    def test_singular(self) -> None:
        assert THUE_MORSE.is_singular()

    def test_primitive_witness_one(self) -> None:
        is_prim, witness = THUE_MORSE.is_primitive()
        assert is_prim
        assert witness == 1

    def test_regime_singular(self) -> None:
        assert "singular" in THUE_MORSE.regime()

    def test_cohomological_rank_raises(self) -> None:
        with pytest.raises(ValueError, match="Z\\[1/d\\]-localization"):
            THUE_MORSE.cohomological_rank()

    def test_self_dual_with_default_valuation(self) -> None:
        assert THUE_MORSE.is_substitution_rule_self_dual(THUE_MORSE_DEFAULT_VALUATION)

    def test_firing_counts(self) -> None:
        counts = THUE_MORSE.firing_counts(THUE_MORSE_DEFAULT_VALUATION)
        assert counts["truth-only"] == 1
        assert counts["falsity-only"] == 1


class TestPadovan:
    def test_alphabet_size(self) -> None:
        assert PADOVAN.n == 3

    def test_unimodular(self) -> None:
        assert PADOVAN.is_unimodular()

    def test_regime_aperiodic(self) -> None:
        assert PADOVAN.regime() == "aperiodic"

    def test_top_firing_present(self) -> None:
        counts = PADOVAN.firing_counts(PADOVAN_DEFAULT_VALUATION)
        assert counts["top-firing"] == 1

    def test_shadow_ranks(self) -> None:
        l_plus, l_minus = PADOVAN.shadow_ranks(PADOVAN_DEFAULT_VALUATION)
        assert l_plus == 2
        assert l_minus == 2


class TestTribonacci:
    def test_alphabet_size(self) -> None:
        assert TRIBONACCI.n == 3

    def test_unimodular(self) -> None:
        assert TRIBONACCI.is_unimodular()

    def test_cohomological_rank(self) -> None:
        assert TRIBONACCI.cohomological_rank() == 3


class TestTetranacci:
    def test_alphabet_size(self) -> None:
        assert TETRANACCI.n == 4

    def test_unimodular(self) -> None:
        assert TETRANACCI.is_unimodular()

    def test_all_four_bilattice_values_represented(self) -> None:
        counts = TETRANACCI.firing_counts(TETRANACCI_DEFAULT_VALUATION)
        assert counts["bot-firing"] == 1
        assert counts["truth-only"] == 1
        assert counts["falsity-only"] == 1
        assert counts["top-firing"] == 1

    def test_shadow_ranks(self) -> None:
        l_plus, l_minus = TETRANACCI.shadow_ranks(TETRANACCI_DEFAULT_VALUATION)
        assert l_plus == 2
        assert l_minus == 2


class TestSmithInvariants:
    def test_fibonacci_smith_invariants_all_one(self) -> None:
        invariants = FIBONACCI.smith_invariants()
        assert all(abs(inv) == 1 for inv in invariants)

    def test_fibonacci_invariant_count(self) -> None:
        assert len(FIBONACCI.smith_invariants()) == 2

    def test_tribonacci_torsion_free(self) -> None:
        assert TRIBONACCI.is_unimodular_torsion_free()


class TestStubFamilies:
    def test_unrealised_settling_attributes_raise(self) -> None:
        """The strict-regime PredicationSettling is realised; non-strict /
        transfinite / stochastic attributes still surface AttributeError."""
        from pypredcalc.dynamics import settling
        with pytest.raises(AttributeError, match="not yet implemented"):
            settling.LorentzianCausalSettling  # type: ignore[attr-defined]

class TestPerronExact:
    def test_perron_exact_requires_sympy(self) -> None:
        # Sympy is in the [symbolic] extra; if unavailable, expect a clear error.
        try:
            import sympy  # noqa: F401
        except ImportError:
            from pypredcalc.dynamics._symbolic import SymbolicExtraNotInstalled
            with pytest.raises(SymbolicExtraNotInstalled):
                FIBONACCI.perron_exact()
            return
        result = FIBONACCI.perron_exact()
        assert abs(complex(result.evalf()) - 1.6180339887498949) < 1e-9

    def test_perron_exact_singular_raises(self) -> None:
        with pytest.raises(ValueError, match="primitivity"):
            # SubstitutionMatrix with all zeros — non-primitive
            zero_sub = SubstitutionMatrix(Matrix.from_rows([[0, 0], [0, 0]]))
            zero_sub.perron_exact()


class TestPrimitivityBound:
    def test_default_bound_is_wielandt(self) -> None:
        # n=4 → Wielandt bound = 16-8+2 = 10
        is_prim, witness = TETRANACCI.is_primitive()
        assert is_prim
        assert 1 <= witness <= 10

    def test_explicit_max_power_zero_returns_false(self) -> None:
        is_prim, witness = FIBONACCI.is_primitive(max_power=0)
        assert not is_prim
        assert witness == -1


class TestEigenvaluesStrictMode:
    def test_strict_raises_on_low_max_iter(self) -> None:
        from pypredcalc._linalg import ConvergenceError, eigenvalues_numeric
        with pytest.raises(ConvergenceError):
            eigenvalues_numeric(Matrix.identity(3), max_iter=2, strict=True)

    def test_non_strict_returns_iterate(self) -> None:
        from pypredcalc._linalg import eigenvalues_numeric
        eigs = eigenvalues_numeric(Matrix.identity(3), max_iter=2, strict=False)
        assert len(eigs) == 3
