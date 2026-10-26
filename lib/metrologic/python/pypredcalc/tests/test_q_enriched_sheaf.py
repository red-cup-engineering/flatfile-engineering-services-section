"""Phase 5 — Q-enriched cellular sheaf base type.

Tests the corpus's `objects/quantale-enriched-sheaf` realisation in the
poset-indexed special case: a finite cellular base (a poset), a stalk
per cell (a single Q-element), and scalar-multiplication restrictions
between comparable cells.
"""

from __future__ import annotations

from pypredcalc.algebra.residuated_lattice import boolean_residuated_lattice
from pypredcalc.combinatorics.poset import Poset
from pypredcalc.sheaf.q_enriched import (
    QEnrichedSheaf,
    SheafConditionError,
    SheafConditionWitness,
    check_sheaf_condition,
)

# Boolean residuated lattice {0, 1}, ⊗ is ∧, unit is 1.
BOOL = boolean_residuated_lattice()


def _line_poset():
    """Poset on {a, b, c} with a < b < c."""
    order = {("a", "a"), ("b", "b"), ("c", "c"),
             ("a", "b"), ("a", "c"), ("b", "c")}

    def leq(x, y):
        return (x, y) in order

    return Poset(elements=frozenset({"a", "b", "c"}), leq=leq)


# ---- Construction --------------------------------------------------------


class TestConstruction:
    def test_minimal_one_cell_sheaf(self) -> None:
        # Single-cell poset; trivially valid.
        single = Poset(
            elements=frozenset({"x"}), leq=lambda a, b: a == b
        )
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=single,
            stalks={"x": 1},
            restriction_constants={},
        )
        assert sheaf.stalk_at("x") == 1

    def test_line_poset_constant_sheaf(self) -> None:
        """Constant sheaf with stalk = 1 everywhere; restrictions = 1.
        Sheaf consistency: 1 ⊗ 1 = 1 = stalk[child]. ✓"""
        line = _line_poset()
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                # parent ⊃ child: c ⊃ b, c ⊃ a, b ⊃ a (parent has higher
                # index, child is below).
                # Recall: leq(child, parent) ⟹ pair in restrictions.
                ("c", "b"): 1,
                ("c", "a"): 1,
                ("b", "a"): 1,
            },
        )
        assert sheaf.stalk_at("a") == 1
        assert sheaf.stalk_at("b") == 1
        assert sheaf.stalk_at("c") == 1

    def test_zero_constant_sheaf(self) -> None:
        """Stalks = 0 everywhere; restrictions = anything (since 0
        absorbs). Sheaf consistency: c ⊗ 0 = 0 = stalk[child]. ✓"""
        line = _line_poset()
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=line,
            stalks={"a": 0, "b": 0, "c": 0},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        assert sheaf.stalk_at("a") == 0


# ---- Restrict and Q-functoriality ----------------------------------------


class TestRestrict:
    def test_restrict_applies_constant(self) -> None:
        line = _line_poset()
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        # restrict(c → b)(1) = 1 ⊗ 1 = 1.
        assert sheaf.restrict("c", "b", 1) == 1
        # restrict(c → b)(0) = 1 ⊗ 0 = 0.
        assert sheaf.restrict("c", "b", 0) == 0

    def test_restrict_unknown_pair_raises(self) -> None:
        line = _line_poset()
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        try:
            sheaf.restrict("a", "b", 1)  # not a valid (parent, child) pair
        except KeyError:
            pass
        else:
            raise AssertionError("expected KeyError")


class TestQFunctorial:
    def test_constant_sheaf_is_q_functorial(self) -> None:
        """For a commutative quantale, scalar-multiplication restrictions
        preserve the Q-action by construction."""
        line = _line_poset()
        sheaf = QEnrichedSheaf(
            quantale=BOOL,
            base=line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        assert sheaf.is_q_functorial(q_action_samples=(0, 1))


# ---- Validation ----------------------------------------------------------


class TestValidation:
    def test_missing_stalk_rejected(self) -> None:
        line = _line_poset()
        try:
            QEnrichedSheaf(
                quantale=BOOL, base=line,
                stalks={"a": 1, "b": 1},  # missing c
                restriction_constants={},
            )
        except ValueError as exc:
            assert "stalks missing" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_unknown_stalk_rejected(self) -> None:
        line = _line_poset()
        try:
            QEnrichedSheaf(
                quantale=BOOL, base=line,
                stalks={"a": 1, "b": 1, "c": 1, "ghost": 1},
                restriction_constants={
                    ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
                },
            )
        except ValueError as exc:
            assert "not in base" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_stalk_outside_quantale_rejected(self) -> None:
        line = _line_poset()
        try:
            QEnrichedSheaf(
                quantale=BOOL, base=line,
                stalks={"a": 99, "b": 1, "c": 1},  # 99 not in BOOL
                restriction_constants={
                    ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
                },
            )
        except ValueError as exc:
            assert "not in quantale carrier" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_missing_restriction_rejected(self) -> None:
        line = _line_poset()
        try:
            QEnrichedSheaf(
                quantale=BOOL, base=line,
                stalks={"a": 1, "b": 1, "c": 1},
                restriction_constants={
                    ("c", "b"): 1, ("b", "a"): 1,
                    # missing ("c", "a"): the c ≥ a pair
                },
            )
        except ValueError as exc:
            assert "restriction_constants missing" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    def test_inconsistent_sheaf_rejected(self) -> None:
        """If c ⊗ stalk[parent] != stalk[child], construction fails
        with a SheafConditionError carrying the witness."""
        line = _line_poset()
        try:
            QEnrichedSheaf(
                quantale=BOOL, base=line,
                # stalk[a] = 0, stalk[b] = 1, restriction (b, a): 1
                # 1 ⊗ stalk[b] = 1 ⊗ 1 = 1 != stalk[a] = 0. ✗
                stalks={"a": 0, "b": 1, "c": 1},
                restriction_constants={
                    ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 1,
                },
            )
        except SheafConditionError as exc:
            assert "sheaf consistency failed" in str(exc)
            assert isinstance(exc.witness, SheafConditionWitness)
            assert not exc.witness.holds
            assert len(exc.witness.failures) >= 1
            failure = exc.witness.failures[0]
            assert (failure.parent, failure.child) in {
                ("c", "a"), ("b", "a"),
            }
        else:
            raise AssertionError("expected SheafConditionError")


# ---- Empty base ----------------------------------------------------------


class TestEmptyBase:
    def test_empty_base_sheaf(self) -> None:
        """Sheaf on the empty poset: vacuously valid."""
        empty = Poset(elements=frozenset(), leq=lambda a, b: False)
        sheaf = QEnrichedSheaf(
            quantale=BOOL, base=empty,
            stalks={}, restriction_constants={},
        )
        assert sheaf.stalks == {}
        assert sheaf.restriction_constants == {}


# ---- Witness-style condition check (without raising) --------------------


class TestCheckSheafCondition:
    def test_witness_holds_for_consistent_data(self) -> None:
        line = _line_poset()
        witness = check_sheaf_condition(
            BOOL, line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        assert witness.holds
        assert bool(witness)
        assert witness.failures == ()
        assert len(witness.checks) == 3

    def test_witness_fails_for_inconsistent_data(self) -> None:
        line = _line_poset()
        witness = check_sheaf_condition(
            BOOL, line,
            stalks={"a": 0, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 0, ("b", "a"): 1,
            },
        )
        assert not witness.holds
        assert not bool(witness)
        # ("b", "a"): 1 ⊗ 1 = 1, but stalk[a] = 0 — fails.
        # ("c", "a"): 0 ⊗ 1 = 0 = stalk[a] — holds.
        # ("c", "b"): 1 ⊗ 1 = 1 = stalk[b] — holds.
        failure_pairs = {
            (check.parent, check.child) for check in witness.failures
        }
        assert ("b", "a") in failure_pairs
        assert len(failure_pairs) == 1

    def test_witness_records_per_pair_data(self) -> None:
        line = _line_poset()
        witness = check_sheaf_condition(
            BOOL, line,
            stalks={"a": 1, "b": 1, "c": 1},
            restriction_constants={
                ("c", "b"): 1, ("c", "a"): 1, ("b", "a"): 1,
            },
        )
        # Each check has the constituent fields.
        for check in witness.checks:
            assert check.parent != check.child
            assert check.constant in {0, 1}
            assert check.expected_child == BOOL.tensor(
                check.constant, check.stalk_parent
            )
            assert check.holds is (check.expected_child == check.stalk_child)
