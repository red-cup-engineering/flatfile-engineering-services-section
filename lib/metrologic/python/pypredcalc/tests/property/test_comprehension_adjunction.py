"""Property tests: Lawvere comprehension adjunctions (classical and paraconsistent).

Across hypothesis-generated entity sets (size 2-4), sub-supports, and
ψ-fibers, asserts both adjunctions:

- Classical: ``Ext^t(g) ≤_t ψ ⇔ dom(q) ⊆ comprehension_t(p, ψ).sub_support``.
- Paraconsistent: ``Ext^k(g) ≤_k ψ ⇔ dom(q) ⊆ comprehension_k(p, ψ).sub_support``.

Realises corpus theorems `lawvere-comprehension-classical` and
`lawvere-comprehension-paraconsistent`.
"""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.comprehension import (
    comprehension_k,
    comprehension_t,
    extension_k,
    extension_t,
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.predicate_category import PredicateSpecialization

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
FOUR = (T_VAL, F_VAL, BOT, TOP)


@st.composite
def _entity_set(draw):
    n = draw(st.integers(min_value=2, max_value=4))
    return EntitySet.of(tuple(range(1, n + 1)))


@st.composite
def _sub_and_psi(draw):
    """Draw a (full, sub_support, psi_cells) triple consistent with entities."""
    e = draw(_entity_set())
    pairs = [(s, o) for s in e for o in e]
    full = frozenset(pairs)
    sub_pairs = draw(st.sets(st.sampled_from(pairs), max_size=len(pairs)))
    sub = frozenset(sub_pairs)
    psi_cells = draw(
        st.dictionaries(
            st.sampled_from(pairs), st.sampled_from(FOUR), max_size=len(pairs)
        )
    )
    return e, full, sub, psi_cells


def _fv(e, cells, dom):
    cells = {k: v for k, v in cells.items() if v != BOT and k in dom}
    return FiberValuation(BIL, e, BOT, cells, dom=dom)


@settings(max_examples=50, deadline=None)
@given(triple=_sub_and_psi())
def test_classical_comprehension_adjunction(triple) -> None:
    """Ext^t(g) ≤_t ψ ⇔ dom(q) ⊆ comprehension_t(p, ψ).sub_support."""
    e, full, sub, psi_cells = triple
    g = PredicateSpecialization(
        source=("q", sub), target="p", sub_support=sub
    )
    psi = _fv(e, psi_cells, dom=full)
    lhs = extension_t(g, BIL, entities=e, dom_p=full).truth_leq(psi)
    rhs_spec = comprehension_t("p", full, psi)
    rhs = sub <= rhs_spec.sub_support
    assert lhs == rhs


@settings(max_examples=50, deadline=None)
@given(triple=_sub_and_psi())
def test_paraconsistent_comprehension_adjunction(triple) -> None:
    """Ext^k(g) ≤_k ψ ⇔ dom(q) ⊆ comprehension_k(p, ψ).sub_support."""
    e, full, sub, psi_cells = triple
    g = PredicateSpecialization(
        source=("q", sub), target="p", sub_support=sub
    )
    psi = _fv(e, psi_cells, dom=full)
    lhs = extension_k(g, BIL, entities=e, dom_p=full).knowledge_leq(psi)
    rhs_spec = comprehension_k("p", full, psi)
    rhs = sub <= rhs_spec.sub_support
    assert lhs == rhs
