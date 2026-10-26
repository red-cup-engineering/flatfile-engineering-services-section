"""Property tests: closure-operator axioms via :class:`ClosureAxiomWitness`.

Across hypothesis-generated cross-fiber valuations, asserts that the four
witness checks (``monotone_k``, ``inflationary``, ``idempotent``,
``c_natural``) report ``holds == True`` for closure operators built from
quantifier-free rule systems — which by construction satisfy all four
corpus axioms — and report ``holds == False`` (in the expected axiom)
for deliberately broken families.

Realises corpus property: closure operators generated from rule systems
satisfy the four corpus axioms (`closure-operator` axioms 1–4); the
witness machinery is the substrate's verification surface for that
property.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping

from hypothesis import given, settings
from hypothesis import strategies as st

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.closure import ClosureOperator
from pypredcalc.predication.closure_rule import (
    And,
    CellAtom,
    FiberClosureRule,
    Var,
)
from pypredcalc.predication.closure_rule_system import FiberClosureRuleSystem
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.hyperdoctrine import PredicationHyperdoctrine
from pypredcalc.predication.predicate_category import (
    PredicateCategory,
    PredicateIdentity,
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


def _make_hyperdoctrine() -> PredicationHyperdoctrine:
    cat = PredicateCategory(
        entities=E,
        predicates=PredicateSet.of(["R"]),
        generators=(),
        domains={"R": FULL},
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


def _wrap_as_closure_operator(
    cross, hyperdoctrine: PredicationHyperdoctrine
) -> ClosureOperator:
    """Per-predicate :class:`ClosureOperator` view of a cross-fiber operator.

    The single-predicate hyperdoctrine ``H`` here has only ``"R"``; the
    rule system's cross-fiber operator becomes a per-predicate family
    by projecting its result on that predicate.
    """

    def cl_R(fiber: FiberValuation) -> FiberValuation:
        return cross.at({"R": fiber})["R"]

    return ClosureOperator(hyperdoctrine=hyperdoctrine, family={"R": cl_R})


def _broken_constant_bottom(
    hyperdoctrine: PredicationHyperdoctrine,
) -> ClosureOperator:
    """``cl_p = constant ⊥`` — fails inflationary on any non-bottom input."""
    bottom_fiber_R = FiberValuation(BIL, E, BOT, {}, dom=FULL)

    def cl_R(_fiber: FiberValuation) -> FiberValuation:
        return bottom_fiber_R

    return ClosureOperator(hyperdoctrine=hyperdoctrine, family={"R": cl_R})


def _fv(cells: Mapping[tuple[Hashable, Hashable], tuple[int, int]]) -> FiberValuation:
    cells = {k: v for k, v in cells.items() if v != BOT}
    return FiberValuation(BIL, E, BOT, cells, dom=FULL)


cell_strategy = st.tuples(
    st.sampled_from(ENTITIES), st.sampled_from(ENTITIES)
)
value_strategy = st.sampled_from(FOUR_VALUES)
fiber_cell_strategy = st.dictionaries(
    cell_strategy, value_strategy, max_size=6
)
non_bottom_value_strategy = st.sampled_from((T_VAL, F_VAL, TOP))
non_bottom_fiber_cell_strategy = st.dictionaries(
    cell_strategy, non_bottom_value_strategy, min_size=1, max_size=6
)


# --- rule-system-generated closure: all four axioms hold --------------------


@settings(max_examples=50, deadline=None)
@given(cells=fiber_cell_strategy)
def test_inflationary_holds_for_rule_system_closure(cells: Mapping) -> None:
    """``check_inflationary(samples).holds`` for the rule-system closure."""
    H = _make_hyperdoctrine()
    cl = _wrap_as_closure_operator(_transitive_system().generate(H), H)
    v = _fv(cells)
    witness = cl.check_inflationary([("R", v)])
    assert witness.holds, witness


@settings(max_examples=50, deadline=None)
@given(cells=fiber_cell_strategy)
def test_idempotent_holds_for_rule_system_closure(cells: Mapping) -> None:
    """``check_idempotent(samples).holds`` for the rule-system closure."""
    H = _make_hyperdoctrine()
    cl = _wrap_as_closure_operator(_transitive_system().generate(H), H)
    v = _fv(cells)
    witness = cl.check_idempotent([("R", v)])
    assert witness.holds, witness


@settings(max_examples=30, deadline=None)
@given(cells_a=fiber_cell_strategy, cells_b=fiber_cell_strategy)
def test_monotone_k_holds_for_rule_system_closure(
    cells_a: Mapping, cells_b: Mapping
) -> None:
    """``check_monotone_k`` holds on a knowledge-join-built sample.

    Build ``v ≤_k v'`` by joining two arbitrary fibers — ``v_a ≤_k v_a ⊔_k v_b``
    by definition of the knowledge-join.
    """
    H = _make_hyperdoctrine()
    cl = _wrap_as_closure_operator(_transitive_system().generate(H), H)
    v_a = _fv(cells_a)
    v_join = v_a.knowledge_join(_fv(cells_b))
    witness = cl.check_monotone_k([("R", v_a, v_join)])
    assert witness.holds, witness


@settings(max_examples=30, deadline=None)
@given(cells=fiber_cell_strategy)
def test_c_natural_holds_for_rule_system_closure(cells: Mapping) -> None:
    """``check_c_natural`` along ``id_R`` reduces to ``cl(v) == cl(v)`` and holds.

    The single-predicate hyperdoctrine here only carries ``id_R`` as a
    predicate morphism; the witness is structural — it confirms the
    machinery accepts the rule-system closure as 𝒞-natural along the
    identity. Multi-predicate naturality coverage is exercised in the
    unit suite where non-trivial morphisms are built explicitly.
    """
    H = _make_hyperdoctrine()
    cl = _wrap_as_closure_operator(_transitive_system().generate(H), H)
    f = PredicateIdentity(source="R", target="R")
    v = _fv(cells)
    witness = cl.check_c_natural([(f, v)])
    assert witness.holds, witness


# --- deliberately-broken family: witnesses fail in the expected axiom -------


@settings(max_examples=30, deadline=None)
@given(cells=non_bottom_fiber_cell_strategy)
def test_constant_bottom_family_fails_inflationary(cells: Mapping) -> None:
    """``cl_p = constant ⊥`` violates inflationary on any non-bottom input.

    Inflationary requires ``v ≤_k cl(v)``; the broken family sends every
    input to ``⊥``, and a non-bottom ``v`` satisfies ``v ≰_k ⊥``. The
    failing axiom must be reported as ``inflationary``.
    """
    H = _make_hyperdoctrine()
    cl = _broken_constant_bottom(H)
    v = _fv(cells)
    witness = cl.check_inflationary([("R", v)])
    assert not witness.holds
    assert all(c.axiom == "inflationary" for c in witness.failures)
