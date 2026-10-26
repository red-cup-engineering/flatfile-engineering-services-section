"""B3 — Beck-Chevalley commutation on predication bilattices.

For every pullback square in the predicate category 𝒞,

    P  --p_A-->  A
    |            |
    p_B          f
    |            |
    v            v
    B  ---g--->  C

and every fiber φ ∈ A_B, the canonical maps

    ∃_{p_A}^{k}(p_B^*(φ))  =  f^*(∃_g^{k}(φ))

(and analogously for ∃^t, ∀^k, ∀^t) are equalities cellwise.

The corpus theorem is
``beck-chevalley-commutation-on-predication-bilattices``. Its proof
reduces BC at the fibration level to cellwise base-change in
``IndexMap(E)``. We verify that cellwise reduction directly: for every
ordered pair of generators ``(f, g)`` over a 2-entity carrier, take the
``IndexMap.pullback_square``, then check the four BC identities for
every fiber on ``source(g)``.

By the soundness check in ``test_index_map_agrees_with_generators.py``,
the ``IndexMap`` view captures the generator's action faithfully, so
this verification implies BC at the generator level.

Variation breadth. The five generator classes give 5×5 = 25 ordered
pairs of (f, g) with shared codomain ``p`` (= the entity-pair-full
predicate, ``dom(p) = E × E``). We sweep:

- f's source can be any of: ``p`` (identity), the swapped predicate (converse),
  any sub-support (specialization), or the broadcast pre-image of a
  subject- or object-projection.
- g's source independently.
"""

from __future__ import annotations

from itertools import product

from pypredcalc.algebra.twist_product import boolean_twist
from pypredcalc.predication import IndexPullbackSquareWitness
from pypredcalc.predication.entity_set import EntitySet
from pypredcalc.predication.fiber_valuation import FiberValuation
from pypredcalc.predication.index_map import IndexMap, beck_chevalley_witness
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
FOUR = (T_VAL, F_VAL, BOT, TOP)

E = EntitySet.of([1, 2])
FULL = frozenset((s, o) for s in E for o in E)


def fv(cells=None, dom=None):
    return FiberValuation(BIL, E, BOT, cells or {}, dom=dom or FULL)


def _all_cell_dicts(carrier):
    """Enumerate every value assignment ``carrier → FOUR``."""
    cells_list = sorted(carrier, key=str)
    if not cells_list:
        yield {}
        return
    for assignment in product(FOUR, repeat=len(cells_list)):
        d = {}
        for k, v in zip(cells_list, assignment, strict=True):
            if v != BOT:
                d[k] = v
        yield d


# ---- Generator → IndexMap factories -------------------------------------


SUB_OFF = frozenset({(1, 2), (2, 1)})
SUB_DIAG = frozenset({(1, 1)})


def _identity_im(target_dom=FULL):
    return IndexMap.from_generator(
        PredicateIdentity(source="p", target="p"),
        source_dom=target_dom,
        target_dom=target_dom,
        bilattice=BIL,
    )


def _spec_im(sub, target_dom=FULL):
    return IndexMap.from_generator(
        PredicateSpecialization(source="q", target="p", sub_support=sub),
        source_dom=sub,
        target_dom=target_dom,
        bilattice=BIL,
    )


def _converse_im(target_dom=FULL):
    return IndexMap.from_generator(
        PredicateConverse(source="p_c", target="p"),
        source_dom=frozenset((o, s) for (s, o) in target_dom),
        target_dom=target_dom,
        bilattice=BIL,
    )


def _subj_proj_im(target_dom=FULL):
    return IndexMap.from_generator(
        PredicateSubjectProjection(source="q", target="p"),
        source_dom=FULL,
        target_dom=target_dom,
        bilattice=BIL,
    )


def _obj_proj_im(target_dom=FULL):
    return IndexMap.from_generator(
        PredicateObjectProjection(source="q", target="p"),
        source_dom=FULL,
        target_dom=target_dom,
        bilattice=BIL,
    )


GENERATOR_FACTORIES = [
    ("identity", _identity_im),
    ("spec_off_diag", lambda: _spec_im(SUB_OFF)),
    ("spec_diag_singleton", lambda: _spec_im(SUB_DIAG)),
    ("converse", _converse_im),
    ("subject_projection", _subj_proj_im),
    ("object_projection", _obj_proj_im),
]


# ---- BC harness ----------------------------------------------------------


def _check_bc_one_order(f_im, g_im, *, exists, pullback_label):
    """Check the existential law:  ``∃_{p_A}(p_B^*(φ)) == f^*(∃_g(φ))``
    for every fiber φ on g_im.source.

    ``exists`` is the existential method to use on each IndexMap,
    e.g. ``IndexMap.existential_k`` (use as ``exists(im, cells)``).
    """
    p_A, p_B = IndexMap.pullback_square(f_im, g_im)
    for phi in _all_cell_dicts(g_im.source):
        # LHS: ∃_{p_A} (p_B^* φ) ∈ cells over f_im.source.
        pulled = p_B.pullback_cells(phi)
        lhs = exists(p_A, pulled)
        # RHS: f^* (∃_g φ) ∈ cells over f_im.source.
        existed = exists(g_im, phi)
        rhs = f_im.pullback_cells(existed)
        assert lhs == rhs, (
            f"BC ({pullback_label}) failed:\n"
            f"  φ = {phi}\n"
            f"  ∃_{{p_A}}(p_B^* φ) = {lhs}\n"
            f"  f^*(∃_g φ)        = {rhs}"
        )


def _check_bc_universal(f_im, g_im, *, forall, pullback_label):
    """Check the universal law:  ``∀_{p_A}(p_B^*(φ)) == f^*(∀_g(φ))``
    for every fiber φ on g_im.source."""
    p_A, p_B = IndexMap.pullback_square(f_im, g_im)
    for phi in _all_cell_dicts(g_im.source):
        pulled = p_B.pullback_cells(phi)
        lhs = forall(p_A, pulled)
        foralled = forall(g_im, phi)
        rhs = f_im.pullback_cells(foralled)
        assert lhs == rhs, (
            f"BC-∀ ({pullback_label}) failed:\n"
            f"  φ = {phi}\n"
            f"  ∀_{{p_A}}(p_B^* φ) = {lhs}\n"
            f"  f^*(∀_g φ)        = {rhs}"
        )


# ---- ∃_k Beck-Chevalley over all 36 ordered pairs -----------------------


class TestBeckChevalleyExistentialK:
    """``∃_{p_A}^k ∘ p_B^* = f^* ∘ ∃_g^k`` for every (f, g) generator pair."""

    def test_sweep(self) -> None:
        for f_name, f_factory in GENERATOR_FACTORIES:
            f_im = f_factory()
            for g_name, g_factory in GENERATOR_FACTORIES:
                g_im = g_factory()
                _check_bc_one_order(
                    f_im,
                    g_im,
                    exists=IndexMap.existential_k,
                    pullback_label=f"∃_k f={f_name} g={g_name}",
                )


class TestBeckChevalleyExistentialT:
    """``∃_{p_A}^t ∘ p_B^* = f^* ∘ ∃_g^t`` for every (f, g) generator pair."""

    def test_sweep(self) -> None:
        for f_name, f_factory in GENERATOR_FACTORIES:
            f_im = f_factory()
            for g_name, g_factory in GENERATOR_FACTORIES:
                g_im = g_factory()
                _check_bc_one_order(
                    f_im,
                    g_im,
                    exists=IndexMap.existential_t,
                    pullback_label=f"∃_t f={f_name} g={g_name}",
                )


class TestBeckChevalleyUniversalK:
    """``∀_{p_A}^k ∘ p_B^* = f^* ∘ ∀_g^k`` for every (f, g) generator pair."""

    def test_sweep(self) -> None:
        for f_name, f_factory in GENERATOR_FACTORIES:
            f_im = f_factory()
            for g_name, g_factory in GENERATOR_FACTORIES:
                g_im = g_factory()
                _check_bc_universal(
                    f_im,
                    g_im,
                    forall=IndexMap.universal_k,
                    pullback_label=f"∀_k f={f_name} g={g_name}",
                )


class TestBeckChevalleyUniversalT:
    """``∀_{p_A}^t ∘ p_B^* = f^* ∘ ∀_g^t`` for every (f, g) generator pair."""

    def test_sweep(self) -> None:
        for f_name, f_factory in GENERATOR_FACTORIES:
            f_im = f_factory()
            for g_name, g_factory in GENERATOR_FACTORIES:
                g_im = g_factory()
                _check_bc_universal(
                    f_im,
                    g_im,
                    forall=IndexMap.universal_t,
                    pullback_label=f"∀_t f={f_name} g={g_name}",
                )


class TestBeckChevalleyWitness:
    """The package-side ``beck_chevalley_witness`` builds a structural
    witness whose ``holds`` matches the cellwise check, with one entry
    per (adjoint, fiber)."""

    def test_pullback_square_witness_records_commuting_projections(self) -> None:
        f = _subj_proj_im()
        g = _obj_proj_im()

        witness = IndexMap.pullback_square_witness(f, g)

        assert isinstance(witness, IndexPullbackSquareWitness)
        assert witness.holds
        assert witness.p_a.source == witness.p_b.source
        assert witness.p_a.target == f.source
        assert witness.p_b.target == g.source
        assert dict(witness.left_composite) == dict(witness.right_composite)
        assert witness.carrier == IndexMap.pullback_square(f, g)[0].source

    def test_witness_holds_for_every_generator_pair(self) -> None:
        for f_name, f_factory in GENERATOR_FACTORIES:
            f_im = f_factory()
            for g_name, g_factory in GENERATOR_FACTORIES:
                g_im = g_factory()
                fibers = list(_all_cell_dicts(g_im.source))
                witness = beck_chevalley_witness(f_im, g_im, fibers)
                assert witness, (
                    f"BC witness reports failure for ({f_name}, {g_name}); "
                    f"failures={[c.adjoint for c in witness.failures[:3]]}"
                )
                # 4 adjoints × N fibers checks expected.
                assert len(witness.checks) == 4 * len(fibers)
