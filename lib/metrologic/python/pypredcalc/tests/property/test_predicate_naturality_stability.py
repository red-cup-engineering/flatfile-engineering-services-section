"""Property tests: ``PredicateCategory.is_natural`` is stable under composition.

Naturality is invariant under the categorical structure that defines it:

1. **Identities never break naturality.** A valuation natural with
   respect to all generators is, trivially, also natural with respect
   to identities.
2. **Composition.** If ``f^*(v(p)) = v(q)`` for every generator
   ``f : q → p``, then for any composable pair ``g ∘ f`` the pulled
   value through the composite equals ``v`` at the source. This is
   tested by exercising :meth:`PredicateCategory.compose` and
   verifying ``(g ∘ f)^*(v(g.target)) == v(f.source)``.
3. **The constant valuation is always natural.** Any valuation that
   sends every predicate to the same constant fiber (e.g. all-bottom)
   is natural by construction.

We use the canonical converse-symmetry corpus instance (binary
predicate ``r`` with its converse ``r̆``) — small enough for
exhaustive enumeration via ``hypothesis``.
"""
from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import (
    EntitySet,
    FiberValuation,
    PredicateCategory,
    PredicateConverse,
    PredicateSet,
)

BIL = boolean_twist()
T_VAL = (1, 0)
F_VAL = (0, 1)
BOT_VAL = (0, 0)
TOP_VAL = (1, 1)
TWIST_VALUES: list[tuple[int, int]] = [T_VAL, F_VAL, BOT_VAL, TOP_VAL]


def _converse_category() -> PredicateCategory:
    """Two-predicate category {r, r̆} with the converse generator r̆ → r."""
    entities = EntitySet([1, 2, 3])
    predicates = PredicateSet(["r", "r_check"])
    converse = PredicateConverse(source="r_check", target="r")
    return PredicateCategory(
        entities=entities,
        predicates=predicates,
        generators=[converse],
    )


def _all_pairs(entities: EntitySet) -> list[tuple[int, int]]:
    elts = list(entities.entities)
    return [(a, b) for a in elts for b in elts]


def _constant_fiber(
    entities: EntitySet, value: tuple[int, int]
) -> FiberValuation[int]:
    """Build the constant fiber on the full ``E × E`` taking ``value``."""
    cells = {pair: value for pair in _all_pairs(entities)}
    return FiberValuation.full(BIL, entities, BOT_VAL, cells)


@st.composite
def fiber_valuations(
    draw: st.DrawFn, entities: EntitySet
) -> FiberValuation[int]:
    pairs = _all_pairs(entities)
    values = draw(
        st.lists(
            st.sampled_from(TWIST_VALUES),
            min_size=len(pairs),
            max_size=len(pairs),
        )
    )
    cells = {pair: v for pair, v in zip(pairs, values, strict=True)}
    return FiberValuation.full(BIL, entities, BOT_VAL, cells)


# ---------------- naturality of identities is trivial ----------------


def test_identity_morphism_does_not_affect_naturality() -> None:
    """``id_p`` adds no constraint; the constant-bottom valuation is natural."""
    cat = _converse_category()
    constant_bot = _constant_fiber(cat.entities, BOT_VAL)
    valuation = {"r": constant_bot, "r_check": constant_bot}
    assert cat.is_natural(valuation)


# ---------------- composition: identities collapse ----------------


def test_compose_with_identity_left_collapses() -> None:
    cat = _converse_category()
    converse = cat.generators[0]
    id_target = cat.identity(converse.target)
    # id ∘ f = f
    assert cat.compose(id_target, converse) is converse


def test_compose_with_identity_right_collapses() -> None:
    cat = _converse_category()
    converse = cat.generators[0]
    id_source = cat.identity(converse.source)
    # g ∘ id = g
    assert cat.compose(converse, id_source) is converse


# ---------------- the constant valuation is always natural ----------------


@given(value=st.sampled_from(TWIST_VALUES))
def test_constant_valuation_is_natural(value: tuple[int, int]) -> None:
    cat = _converse_category()
    constant = _constant_fiber(cat.entities, value)
    valuation = {"r": constant, "r_check": constant}
    assert cat.is_natural(valuation)


# ---------------- pullback round-trip naturality probe ----------------


@given(data=st.data())
def test_pulled_back_valuation_is_natural(data: st.DataObject) -> None:
    """If we *define* the source-fiber by pulling back the target-fiber along
    the only generator, naturality must hold."""
    cat = _converse_category()
    target_fiber = data.draw(fiber_valuations(cat.entities))
    converse = cat.generators[0]
    pulled = converse.pullback(target_fiber)
    valuation = {converse.source: pulled, converse.target: target_fiber}
    assert cat.is_natural(valuation), (
        "valuation built by pulling back along the unique generator must be natural"
    )


# ---------------- composition pullback equals stagewise pullback ----------------


def test_composed_pullback_equals_chained_pullback() -> None:
    """Pullback is contravariant: ``(g ∘ f)^* = f^* ∘ g^*``.

    Tested on a 3-predicate chain p → q → r built from two converses.
    """
    entities = EntitySet([1, 2, 3])
    predicates = PredicateSet(["p", "q", "r"])
    f = PredicateConverse(source="p", target="q")
    g = PredicateConverse(source="q", target="r")
    cat = PredicateCategory(
        entities=entities,
        predicates=predicates,
        generators=[f, g],
    )
    fiber_at_r = _constant_fiber(entities, T_VAL)
    composite = cat.compose(g, f)
    via_composite = composite.pullback(fiber_at_r)
    via_chain = f.pullback(g.pullback(fiber_at_r))
    assert via_composite == via_chain
