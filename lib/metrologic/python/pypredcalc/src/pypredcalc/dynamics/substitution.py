"""Substitution matrix: integer-matrix substitution dynamical systems.

Realizes corpus objects: `step-n-substitution-rule`, `substitution-matrix`.

A `SubstitutionMatrix` is the matrix of letter-image counts for a substitution
σ: Σ → Σ*. Used by the regime classifier, Anderson-Putnam cohomology, d-frame
cohomology orbit types, and the benchmark suite.

Eigenvalue analysis is numerical (Durand–Kerner via `pypredcalc._linalg`); for
exact symbolic Perron eigenvalues install the `[symbolic]` extra.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from fractions import Fraction

from .._linalg import (
    Matrix,
    det,
    eigenvalues_numeric,
    integer_rank,
    smith_normal_form,
)
from ..algebra.bilattice import BilatticeValue, negation_permutation


@dataclass(frozen=True)
class SubstitutionMatrix:
    """Substitution matrix: M[i,j] = count of letter i in σ(letter j)."""

    matrix: Matrix

    def __post_init__(self) -> None:
        if not self.matrix.is_square():
            raise ValueError(
                f"substitution matrix must be square, got {self.matrix.shape}"
            )
        for row in self.matrix.rows:
            for entry in row:
                if entry.denominator != 1 or entry.numerator < 0:
                    raise ValueError(
                        f"substitution matrix must have non-negative integer "
                        f"entries, got {entry}"
                    )

    @property
    def n(self) -> int:
        """Alphabet size."""
        return self.matrix.n_rows

    def determinant(self) -> Fraction:
        return det(self.matrix)

    def is_unimodular(self) -> bool:
        return abs(self.determinant()) == 1

    def is_singular(self) -> bool:
        return self.determinant() == 0

    def is_primitive(self, max_power: int | None = None) -> tuple[bool, int]:
        """Whether some power of M has strictly positive entries.

        Returns (is_primitive, witness_power); witness_power is -1 if not
        found within max_power. By Wielandt's theorem, an n×n non-negative
        matrix is primitive iff M^k is strictly positive for some k ≤
        n²−2n+2, so the default bound is mathematically safe (no false
        negatives).
        """
        if max_power is None:
            max_power = max(1, self.n * self.n - 2 * self.n + 2)
        p = self.matrix
        for k in range(1, max_power + 1):
            if all(
                p.rows[i][j] > 0
                for i in range(self.n)
                for j in range(self.n)
            ):
                return True, k
            p = p @ self.matrix
        return False, -1

    def _eigenvalue_abs_values(self) -> list[float]:
        """Absolute values of all eigenvalues (with multiplicity), sorted descending."""
        roots = eigenvalues_numeric(self.matrix)
        return sorted([abs(ev) for ev in roots], reverse=True)

    def perron_eigenvalue(self) -> complex:
        """Perron–Frobenius eigenvalue (largest |λ|) — requires primitivity.

        Returns a numerical (complex) value. For an exact symbolic Perron
        eigenvalue, install the ``[symbolic]`` extra and call
        :meth:`perron_exact`.
        """
        is_prim, _ = self.is_primitive()
        if not is_prim:
            raise ValueError("Perron-Frobenius eigenvalue requires primitivity")
        roots = eigenvalues_numeric(self.matrix)
        return max(roots, key=abs)

    def perron_exact(self) -> object:
        """Exact symbolic Perron eigenvalue — requires the ``[symbolic]`` extra.

        Returns a ``sympy.Expr``. Raises ``SymbolicExtraNotInstalled`` if
        sympy is not available, or ``ValueError`` if the matrix is not
        primitive.
        """
        is_prim, _ = self.is_primitive()
        if not is_prim:
            raise ValueError("Perron-Frobenius eigenvalue requires primitivity")
        from ._symbolic import perron_exact_of
        return perron_exact_of(self.matrix)

    def is_pisot(self) -> bool:
        """Pisot substitution: Perron eigenvalue > 1, all others |λ| < 1."""
        abs_vals = self._eigenvalue_abs_values()
        if not abs_vals:
            return False
        if abs_vals[0] <= 1.0 + 1e-9:
            return False
        return all(v < 1.0 - 1e-9 for v in abs_vals[1:])

    def regime(self) -> str:
        """Classify into one of the four regimes (Anderson-Putnam aperiodicity)."""
        if self.is_singular():
            return "singular (degenerate; not in standard four-regime classification)"
        is_prim, _ = self.is_primitive()
        if is_prim:
            return "aperiodic"
        return "non-primitive (further analysis needed)"

    def smith_invariants(self) -> tuple[int, ...]:
        """Smith normal form invariants of Mᵀ over Z. Used for H¹ torsion analysis."""
        return smith_normal_form(self.matrix.transpose())

    def cohomological_rank(self) -> int:
        """Rank of H¹(Ω_σ) — the corpus's step-n cohomological rank theorem.

        For primitive non-singular substitutions: rank = n (alphabet size).
        Singular matrices need Z[1/d]-localization analysis (not handled here).
        """
        if self.is_singular():
            raise ValueError(
                "cohomological rank for singular substitution requires "
                "Z[1/d]-localization analysis (not implemented)"
            )
        return self.n

    def is_unimodular_torsion_free(self) -> bool:
        """For unimodular substitutions, H¹ has no torsion (all invariants 1)."""
        if not self.is_unimodular():
            return False
        return all(abs(inv) == 1 for inv in self.smith_invariants())

    def integer_rank(self) -> int:
        """Z-rank of M (= Q-rank). Useful as a sanity check vs cohomological rank."""
        return integer_rank(self.matrix)

    # --- per-letter d-frame structure under a bilattice valuation ---
    # Operationalises Step 4 firing-type tables and Step 6 self-duality test
    # of the `examples/benchmark-N-*.md` notes.

    def firing_type(
        self, letter_index: int, valuation: Mapping[int, BilatticeValue]
    ) -> str:
        """Per-letter firing type derived from its bilattice value."""
        v = valuation[letter_index]
        return {
            BilatticeValue.T: "truth-only",
            BilatticeValue.F: "falsity-only",
            BilatticeValue.TOP: "top-firing",
            BilatticeValue.BOT: "bot-firing",
        }[v]

    def firing_counts(self, valuation: Mapping[int, BilatticeValue]) -> dict[str, int]:
        """Counts of each firing type across the alphabet (Step 4 table)."""
        counts = {"truth-only": 0, "falsity-only": 0, "top-firing": 0, "bot-firing": 0}
        for i in range(self.n):
            counts[self.firing_type(i, valuation)] += 1
        return counts

    def shadow_ranks(
        self, valuation: Mapping[int, BilatticeValue]
    ) -> tuple[int, int]:
        """Per-letter L⁺ / L⁻ rank totals — the d-frame shadow split.

        L⁺ rank counts letters whose value has a t-component (t or top);
        L⁻ rank counts letters whose value has an f-component (f or top).
        bot-valued letters contribute 0 to both.
        """
        l_plus = sum(
            1
            for i in range(self.n)
            if valuation[i] in (BilatticeValue.T, BilatticeValue.TOP)
        )
        l_minus = sum(
            1
            for i in range(self.n)
            if valuation[i] in (BilatticeValue.F, BilatticeValue.TOP)
        )
        return l_plus, l_minus

    def inclusion_exclusion_relation(
        self, valuation: Mapping[int, BilatticeValue]
    ) -> dict[str, int]:
        """Components of the d-frame shadow inclusion–exclusion relation.

        Per Step 4: |L⁺| + |L⁻| − |⊤| + |⊥| = n.
        """
        l_plus, l_minus = self.shadow_ranks(valuation)
        counts = self.firing_counts(valuation)
        return {
            "l_plus": l_plus,
            "l_minus": l_minus,
            "n_top": counts["top-firing"],
            "n_bot": counts["bot-firing"],
            "n_alphabet": self.n,
        }

    def is_substitution_rule_self_dual(
        self, valuation: Mapping[int, BilatticeValue]
    ) -> bool:
        """Test whether M commutes with the negation-induced alphabet permutation P.

        This is the Step 6 / Step 8 substitution-rule self-duality test. Among
        named step-n substitutions in the corpus, only Thue-Morse with
        valuation {0: f, 1: t} returns True.
        """
        alphabet = list(range(self.n))
        p = negation_permutation(valuation, alphabet)
        return (self.matrix @ p) == (p @ self.matrix)
