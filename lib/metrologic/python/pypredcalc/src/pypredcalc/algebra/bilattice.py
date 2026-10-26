"""Four-element Belnap bilattice.

Realizes corpus objects: `bilattice`, `four-bilattice`.

Carrier `{t, f, bot, top}` with two partial orders:

- truth order: ``f <= bot <= t`` and ``f <= top <= t``
- knowledge order: ``bot <= f <= top`` and ``bot <= t <= top``

Negation fixes ``bot`` and ``top`` and swaps ``t`` with ``f``.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping, Sequence
from enum import Enum
from typing import TypeVar

from .._linalg import Matrix

K = TypeVar("K", bound=Hashable)


class BilatticeValue(Enum):
    """Carrier of the four-element bilattice FOUR."""

    T = "t"
    F = "f"
    BOT = "bot"
    TOP = "top"


_TRUTH_RANK = {
    BilatticeValue.F: 0,
    BilatticeValue.BOT: 1,
    BilatticeValue.TOP: 1,
    BilatticeValue.T: 2,
}

_KNOWLEDGE_RANK = {
    BilatticeValue.BOT: 0,
    BilatticeValue.F: 1,
    BilatticeValue.T: 1,
    BilatticeValue.TOP: 2,
}


def truth_leq(a: BilatticeValue, b: BilatticeValue) -> bool:
    """Return whether ``a <= b`` in the truth order."""
    if a is b:
        return True
    if {a, b} == {BilatticeValue.BOT, BilatticeValue.TOP}:
        return False
    return _TRUTH_RANK[a] <= _TRUTH_RANK[b]


def knowledge_leq(a: BilatticeValue, b: BilatticeValue) -> bool:
    """Return whether ``a <= b`` in the knowledge order."""
    if a is b:
        return True
    if {a, b} == {BilatticeValue.T, BilatticeValue.F}:
        return False
    return _KNOWLEDGE_RANK[a] <= _KNOWLEDGE_RANK[b]


def truth_join(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Least upper bound in the truth order."""
    for candidate in (
        BilatticeValue.F,
        BilatticeValue.BOT,
        BilatticeValue.TOP,
        BilatticeValue.T,
    ):
        if truth_leq(a, candidate) and truth_leq(b, candidate):
            return candidate
    raise AssertionError("FOUR truth join is total")


def truth_meet(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Greatest lower bound in the truth order."""
    for candidate in (
        BilatticeValue.T,
        BilatticeValue.BOT,
        BilatticeValue.TOP,
        BilatticeValue.F,
    ):
        if truth_leq(candidate, a) and truth_leq(candidate, b):
            return candidate
    raise AssertionError("FOUR truth meet is total")


def knowledge_join(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Least upper bound in the knowledge order."""
    for candidate in (
        BilatticeValue.BOT,
        BilatticeValue.F,
        BilatticeValue.T,
        BilatticeValue.TOP,
    ):
        if knowledge_leq(a, candidate) and knowledge_leq(b, candidate):
            return candidate
    raise AssertionError("FOUR knowledge join is total")


def knowledge_meet(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Greatest lower bound in the knowledge order."""
    for candidate in (
        BilatticeValue.TOP,
        BilatticeValue.F,
        BilatticeValue.T,
        BilatticeValue.BOT,
    ):
        if knowledge_leq(candidate, a) and knowledge_leq(candidate, b):
            return candidate
    raise AssertionError("FOUR knowledge meet is total")


def negate(v: BilatticeValue) -> BilatticeValue:
    """Bilattice negation: fixes bot and top; swaps t and f."""
    if v is BilatticeValue.T:
        return BilatticeValue.F
    if v is BilatticeValue.F:
        return BilatticeValue.T
    return v


# Twist-product fusion on FOUR (the boolean-twist `2^⋈`). Computed once via
# the boolean-twist realisation and tabulated here so callers don't need to
# import the twist-product machinery to fuse FOUR values.
#
# Encoding: BilatticeValue.T = (1, 0), F = (0, 1), BOT = (0, 0), TOP = (1, 1).
# Boolean twist fusion: (a, b) ⊙ (c, d) = (a ∧ c, (a → d) ∧ (c → b)) over 2.
# Concrete table (verified by tests):
_FUSION_TABLE: dict[
    tuple[BilatticeValue, BilatticeValue], BilatticeValue
] = {
    (BilatticeValue.T, BilatticeValue.T): BilatticeValue.T,
    (BilatticeValue.T, BilatticeValue.F): BilatticeValue.F,
    (BilatticeValue.T, BilatticeValue.BOT): BilatticeValue.BOT,
    (BilatticeValue.T, BilatticeValue.TOP): BilatticeValue.T,
    (BilatticeValue.F, BilatticeValue.T): BilatticeValue.F,
    (BilatticeValue.F, BilatticeValue.F): BilatticeValue.F,
    (BilatticeValue.F, BilatticeValue.BOT): BilatticeValue.F,
    (BilatticeValue.F, BilatticeValue.TOP): BilatticeValue.F,
    (BilatticeValue.BOT, BilatticeValue.T): BilatticeValue.BOT,
    (BilatticeValue.BOT, BilatticeValue.F): BilatticeValue.F,
    # BOT ⊙ BOT = F (NOT BOT) — fusion's non-integrality: two no-info cells
    # fuse to *positively false*, not no-info. Per Ginsberg's formula at
    # (0, 0) ⊙ (0, 0) = (0, (0→0)∧(0→0)) = (0, 1) = F.
    (BilatticeValue.BOT, BilatticeValue.BOT): BilatticeValue.F,
    (BilatticeValue.BOT, BilatticeValue.TOP): BilatticeValue.BOT,
    (BilatticeValue.TOP, BilatticeValue.T): BilatticeValue.T,
    (BilatticeValue.TOP, BilatticeValue.F): BilatticeValue.F,
    (BilatticeValue.TOP, BilatticeValue.BOT): BilatticeValue.BOT,
    (BilatticeValue.TOP, BilatticeValue.TOP): BilatticeValue.TOP,
}


def fusion(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Twist-product fusion ``a ⊙ b`` on the boolean-twist FOUR.

    The corpus's `morphisms/twist-product-fusion` instantiated at the
    boolean base. Realises that morphism on the FOUR alphabet.

    Properties:
    - Commutative: ``a ⊙ b == b ⊙ a``.
    - Associative: ``(a ⊙ b) ⊙ c == a ⊙ (b ⊙ c)``.
    - Unit: ``TOP`` (`⟨1, 1⟩`). ``a ⊙ TOP == a`` for every ``a``.
    - Absorber: ``F``. ``a ⊙ F == F`` for every ``a``.

    Per the corpus, fusion's unit is the bilattice's ``≤_k``-top
    ``⟨1, 1⟩`` (``TOP``), not the ``≤_t``-top ``t`` (``T``); this
    non-integrality is the load-bearing fact behind
    ``bc-vs-frobenius-separation``.
    """
    return _FUSION_TABLE[(a, b)]


def negation_permutation(
    valuation: Mapping[K, BilatticeValue],
    alphabet: Sequence[K],
) -> Matrix:
    """Permutation matrix induced by bilattice negation on a valued alphabet.

    For each letter (column), find the first letter (row) whose valuation is
    the negated value. Raises `ValueError` if the valuation is not closed
    under negation.
    """
    n = len(alphabet)
    rows = [[0 for _ in range(n)] for _ in range(n)]
    for column, letter in enumerate(alphabet):
        target = negate(valuation[letter])
        candidates = [
            row
            for row, candidate_letter in enumerate(alphabet)
            if valuation[candidate_letter] == target
        ]
        if not candidates:
            raise ValueError(
                f"valuation not closed under negation: letter {letter!r} has value "
                f"{valuation[letter]} but no letter has value {target}"
            )
        rows[candidates[0]][column] = 1
    return Matrix.from_rows(rows)
