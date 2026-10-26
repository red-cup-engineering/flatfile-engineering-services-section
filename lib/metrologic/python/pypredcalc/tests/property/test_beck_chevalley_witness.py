"""Property tests: Beck-Chevalley commutation across generator-pair pullbacks.

Across hypothesis-generated generator pairs `(f, g)` and fibers `φ`, asserts
that the BC witness `holds == True` for all four adjoint kinds (∃_k, ∃_t,
∀_k, ∀_t). The unit-test counterpart in `tests/test_b3_beck_chevalley.py`
exhausts six generator factories × four adjoints; this property test takes
that to randomly-generated generator instances.

Realises corpus theorem `beck-chevalley-commutation-on-predication-bilattices`.
"""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.index_map import (
    IndexMap,
    beck_chevalley_witness,
)
from pypredcalc.predication.predicate_category import (
    PredicateConverse,
    PredicateIdentity,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)

T_VAL = (1, 0)
F_VAL = (0, 1)
BOT = (0, 0)
TOP = (1, 1)
BIL = boolean_twist()
E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)
SUB_OFF_DIAG = frozenset({(1, 2), (2, 1)})
SUB_DIAG = frozenset({(1, 1), (2, 2)})


def _identity_im():
    return IndexMap.from_generator(
        PredicateIdentity(source="p", target="p"),
        source_dom=FULL, target_dom=FULL, bilattice=BIL,
    )


def _spec_im(sub):
    return IndexMap.from_generator(
        PredicateSpecialization(source="q", target="p", sub_support=sub),
        source_dom=sub, target_dom=FULL, bilattice=BIL,
    )


def _converse_im():
    return IndexMap.from_generator(
        PredicateConverse(source="p_c", target="p"),
        source_dom=FULL, target_dom=FULL, bilattice=BIL,
    )


def _subj_proj_im():
    return IndexMap.from_generator(
        PredicateSubjectProjection(source="q", target="p"),
        source_dom=FULL, target_dom=FULL, bilattice=BIL,
    )


def _obj_proj_im():
    return IndexMap.from_generator(
        PredicateObjectProjection(source="q", target="p"),
        source_dom=FULL, target_dom=FULL, bilattice=BIL,
    )


generator_factory_strategy = st.sampled_from([
    _identity_im,
    lambda: _spec_im(SUB_OFF_DIAG),
    lambda: _spec_im(SUB_DIAG),
    _converse_im,
    _subj_proj_im,
    _obj_proj_im,
])

cell_strategy = st.tuples(st.sampled_from([1, 2]), st.sampled_from([1, 2]))
value_strategy = st.sampled_from([T_VAL, F_VAL, BOT, TOP])
fiber_strategy = st.dictionaries(cell_strategy, value_strategy, max_size=4)


@settings(max_examples=30, deadline=None)
@given(
    f_factory=generator_factory_strategy,
    g_factory=generator_factory_strategy,
    fiber_cells=fiber_strategy,
)
def test_bc_witness_holds(f_factory, g_factory, fiber_cells) -> None:
    """For any generator pair (f, g) and any fiber over g.source, the BC
    witness holds across all four adjoint kinds."""
    f_im = f_factory()
    g_im = g_factory()
    # Filter the fiber to g's source dom.
    phi = {
        cell: value
        for cell, value in fiber_cells.items()
        if cell in g_im.source and value != BOT
    }
    witness = beck_chevalley_witness(f_im, g_im, [phi])
    assert witness.holds, (
        f"BC failed for f={f_im}, g={g_im}, phi={phi}; "
        f"failures={[c.adjoint for c in witness.failures]}"
    )
