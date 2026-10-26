"""Property tests: Cl-algebra ↔ Cl*-coalgebra correspondence.

Across hypothesis-generated cross-fiber valuations, asserts:

1. ``is_cl_algebra(monad, v).holds == is_cl_coalgebra(comonad, v).holds``
   — the corpus's correspondence at the boolean-evaluation level.
2. ``algebra_to_coalgebra(alg).holds == alg.holds`` — bijection preserves
   the structural verdict.
3. Round-trip: ``coalgebra_to_algebra(algebra_to_coalgebra(alg))`` returns
   a witness with the same valuation, closure-image, and failures.

Realises corpus theorem ``closure-algebra-coalgebra-correspondence``.
"""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure_comonad import (
    algebra_to_coalgebra,
    coalgebra_to_algebra,
    is_cl_coalgebra,
    make_comonad_from_monad,
)
from pypredcalc.predication.closure_monad import (
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
)
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateSet,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2, 3])
FULL = frozenset((s, o) for s in E for o in E)
ENTITIES = tuple(E)
FOUR_VALUES = (T_VAL, F_VAL, BOT, TOP)


def _make_setup():
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["R"]),
        generators=(),
        domains={},
    )
    H = PredicationHyperdoctrine(category=cat, bilattice=BIL)
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
    cl = FiberClosureRuleSystem(rules=(rule,)).generate(H)
    monad = ClosureMonad(closure=cl)
    comonad = make_comonad_from_monad(monad)
    return H, monad, comonad


cell_strategy = st.tuples(
    st.sampled_from(ENTITIES), st.sampled_from(ENTITIES)
)
value_strategy = st.sampled_from(FOUR_VALUES)
fiber_cell_strategy = st.dictionaries(
    cell_strategy, value_strategy, max_size=6
)


def _fv(cells: dict) -> FiberValuation:
    cells = {k: v for k, v in cells.items() if v != BOT}
    return FiberValuation(BIL, E, BOT, cells, dom=FULL)


@settings(max_examples=50, deadline=None)
@given(cells=fiber_cell_strategy)
def test_algebra_coalgebra_holds_agrees(cells: dict) -> None:
    """is_cl_algebra and is_cl_coalgebra agree on every valuation."""
    _, monad, comonad = _make_setup()
    v = {"R": _fv(cells)}
    alg_holds = is_cl_algebra(monad, v).holds
    coalg_holds = is_cl_coalgebra(comonad, v).holds
    assert alg_holds == coalg_holds


@settings(max_examples=50, deadline=None)
@given(cells=fiber_cell_strategy)
def test_algebra_to_coalgebra_preserves_holds(cells: dict) -> None:
    """The bijection preserves the structural verdict."""
    _, monad, _ = _make_setup()
    v = {"R": _fv(cells)}
    alg = is_cl_algebra(monad, v)
    coalg = algebra_to_coalgebra(alg)
    assert alg.holds == coalg.holds


@settings(max_examples=30, deadline=None)
@given(cells=fiber_cell_strategy)
def test_round_trip_preserves_data(cells: dict) -> None:
    """algebra_to_coalgebra ∘ coalgebra_to_algebra is identity on data."""
    _, monad, _ = _make_setup()
    v = {"R": _fv(cells)}
    alg = is_cl_algebra(monad, v)
    round_trip = coalgebra_to_algebra(algebra_to_coalgebra(alg))
    assert round_trip.valuation == alg.valuation
    assert round_trip.closure_image == alg.closure_image
    assert round_trip.holds == alg.holds
