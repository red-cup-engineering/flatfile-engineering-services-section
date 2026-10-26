"""Property tests: the residuation adjunction ``a ⊗ b ≤ c iff b ≤ a → c``.

The constructor for :class:`ResiduatedLattice` already validates the
biconditional exhaustively, so a property test on
``boolean_residuated_lattice`` is only redundant for the existing instance.
The value of these tests is twofold:

1. Lock in the behaviour of :meth:`ResiduatedLattice.residuum` against
   regression — the constructor uses the supplied operations to validate,
   but ``residuum`` is the *derived* operation that downstream code (e.g.
   q-enriched sheaves) will actually call.
2. Generalise the regression net by also building small Heyting-style
   residuated lattices (``⊗ = ∧``) on a chain ``{0, 1, ..., n}`` and
   checking the adjunction across them via ``hypothesis``.

These two test families together cover the boolean case + any finite
chain-Heyting case the user is likely to construct.
"""
from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pypredcalc.algebra import ResiduatedLattice, boolean_residuated_lattice

# ---------------- boolean instance ----------------


def test_boolean_residuum_table() -> None:
    """``a → c`` on the two-element boolean lattice is material implication."""
    L = boolean_residuated_lattice()
    assert L.residuum(0, 0) == 1
    assert L.residuum(0, 1) == 1
    assert L.residuum(1, 0) == 0
    assert L.residuum(1, 1) == 1


@given(
    a=st.sampled_from([0, 1]),
    b=st.sampled_from([0, 1]),
    c=st.sampled_from([0, 1]),
)
def test_boolean_residuation_biconditional(a: int, b: int, c: int) -> None:
    L = boolean_residuated_lattice()
    lhs = L.leq(L.tensor(a, b), c)
    rhs = L.leq(b, L.residuum(a, c))
    assert lhs == rhs


# ---------------- chain Heyting algebras ----------------


def _chain_heyting(n: int) -> ResiduatedLattice[int]:
    """The n+1-element chain ``0 < 1 < ... < n`` as a Heyting algebra (⊗ = ∧)."""
    carrier = frozenset(range(n + 1))
    return ResiduatedLattice(
        carrier=carrier,
        leq=lambda a, b: a <= b,
        join=lambda a, b: max(a, b),
        meet=lambda a, b: min(a, b),
        tensor=lambda a, b: min(a, b),
        unit=n,
    )


@given(n=st.integers(min_value=1, max_value=4))
def test_chain_heyting_constructor_accepts(n: int) -> None:
    """The ``n+1``-chain Heyting algebra satisfies all axioms (constructor would
    raise otherwise)."""
    _chain_heyting(n)


@given(n=st.integers(min_value=1, max_value=4), data=st.data())
def test_chain_heyting_residuation_biconditional(n: int, data: st.DataObject) -> None:
    L = _chain_heyting(n)
    elt = st.sampled_from(sorted(L.carrier))
    a = data.draw(elt)
    b = data.draw(elt)
    c = data.draw(elt)
    lhs = L.leq(L.tensor(a, b), c)
    rhs = L.leq(b, L.residuum(a, c))
    assert lhs == rhs, f"adjunction breaks at n={n}, (a,b,c)=({a},{b},{c})"


@given(n=st.integers(min_value=1, max_value=4), data=st.data())
def test_chain_heyting_residuum_is_largest_solution(
    n: int, data: st.DataObject
) -> None:
    """``a → c`` is the *largest* x with ``a ⊗ x ≤ c``."""
    L = _chain_heyting(n)
    elt = st.sampled_from(sorted(L.carrier))
    a = data.draw(elt)
    c = data.draw(elt)
    r = L.residuum(a, c)
    # Witness: a ⊗ r ≤ c.
    assert L.leq(L.tensor(a, r), c)
    # Maximality: no x > r satisfies a ⊗ x ≤ c.
    for x in L.carrier:
        if L.leq(L.tensor(a, x), c):
            assert L.leq(x, r), f"residuum not maximal: {x} ≤ {r}? expected yes"


@given(n=st.integers(min_value=1, max_value=4), data=st.data())
def test_chain_heyting_unit_is_top(n: int, data: st.DataObject) -> None:
    """Integrality: ``a ≤ 1`` for every a in carrier."""
    L = _chain_heyting(n)
    a = data.draw(st.sampled_from(sorted(L.carrier)))
    assert L.leq(a, L.unit)


@given(n=st.integers(min_value=1, max_value=4), data=st.data())
def test_chain_heyting_unit_neutral(n: int, data: st.DataObject) -> None:
    L = _chain_heyting(n)
    a = data.draw(st.sampled_from(sorted(L.carrier)))
    assert L.tensor(L.unit, a) == a
    assert L.tensor(a, L.unit) == a
