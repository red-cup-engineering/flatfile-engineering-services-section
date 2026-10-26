"""Grounder: lower a :class:`FiberClosureRule` to flat :class:`StoreRule`s.

The corpus rule language (:mod:`closure_rule`) is quantified — rules carry
``free_vars`` (instantiated per firing) and ``forall_vars`` (universally
ranged at antecedent-evaluation time). The store-side closure runtime
(:mod:`store_closure`) consumes *grounded* :class:`StoreRule`s whose
antecedents are tuples of cell atoms over fixed ``(s, p, o)`` keys.

This module bridges the two: given a rule, a carrier ``entities``, and the
boolean-twist↔FOUR encoding the store uses, ``ground_rule`` enumerates
free-variable bindings, expands ∀-blocks into a conjunction, lowers the
resulting positive Boolean antecedent to disjunctive normal form, and
emits one :class:`StoreRule` per (binding × disjunct).

Threshold encoding. The fiber-rule language carries thresholds as
``tuple[T, T]`` over an arbitrary residuated-lattice base ``T``. For
substrate use (``PredicationStore`` is FOUR-typed), thresholds live in
the boolean twist ``{(0,0), (0,1), (1,0), (1,1)}`` and map to
:class:`BilatticeValue` via the canonical isomorphism ``2^⋈ ≅ FOUR``
matching :mod:`bridge`.

Out-of-domain consequent cells are *not* filtered here — the store-side
runtime accepts any cell key and ``PredicationStore.insert`` is total.
The fiber-side ``FiberClosureRuleSystem`` silently skips out-of-dom
consequents because :class:`FiberValuation` carries ``dom`` first-class;
the store has no such constraint.
"""
from __future__ import annotations

from collections.abc import Hashable, Iterator, Mapping
from itertools import product as cartesian_product

from ..algebra.bilattice import BilatticeValue
from .closure_rule import (
    And,
    CellAtom,
    Const,
    FiberClosureRule,
    Formula,
    FusionAtom,
    Or,
    Var,
)
from .four import twist_to_four
from .store_closure import StoreFusionAntecedent, StoreRule

__all__ = ["ground_rule"]


def ground_rule(
    rule: FiberClosureRule[int],
    entities: tuple[Hashable, ...],
) -> list[StoreRule]:
    """Lower ``rule`` to a flat list of grounded :class:`StoreRule`s.

    For each binding of ``rule.free_vars`` to entities (Cartesian product
    over ``entities``), expand any ∀-block into a conjunction across the
    same carrier, lower the resulting antecedent formula to disjunctive
    normal form, and emit one :class:`StoreRule` per disjunct.

    Each emitted rule's consequent is a single cell atom keyed by the
    grounded ``(subject, predicate, object)`` and valued by the
    twist↔FOUR encoding of the rule's consequent threshold.

    With ``free_vars = ()`` and ``forall_vars = ()`` the rule grounds to
    one or more :class:`StoreRule`s with the same consequent and one
    antecedent per disjunct of the (already-ground) antecedent's DNF.

    The result is order-stable for a given ``rule`` and ``entities`` —
    free-var enumeration follows :func:`itertools.product` over the
    carrier in input order; DNF expansion preserves left-to-right
    structure of the antecedent tree.
    """
    grounded: list[StoreRule] = []
    for free_env in _iter_envs(rule.free_vars, entities):
        consequent_subj = _resolve(rule.consequent.subject, free_env)
        consequent_obj = _resolve(rule.consequent.object_, free_env)
        consequent_atom = (
            (consequent_subj, rule.consequent.predicate, consequent_obj),
            twist_to_four(rule.consequent.threshold),
        )
        # Expand the antecedent across the ∀-block — one substituted
        # copy per ∀-binding, then conjoin them all. Free vars are
        # already pinned by free_env.
        forall_envs = list(_iter_envs(rule.forall_vars, entities))
        if not forall_envs:
            # forall_vars is empty → one no-op env.
            forall_envs = [{}]
        per_env_formulas = [
            _substitute(rule.antecedent, {**free_env, **fa_env})
            for fa_env in forall_envs
        ]
        if len(per_env_formulas) == 1:
            conjoined: Formula[int] = per_env_formulas[0]
        else:
            conjoined = And(parts=tuple(per_env_formulas))
        for disjunct in _dnf(conjoined):
            antecedent_tuple = tuple(
                _atom_to_store_atom(atom) for atom in disjunct
            )
            grounded.append(StoreRule(
                antecedents=antecedent_tuple,
                consequents=(consequent_atom,),
            ))
    return grounded


# ---- helpers --------------------------------------------------------------


def _iter_envs(
    var_names: tuple[str, ...], entities: tuple[Hashable, ...]
) -> Iterator[dict[str, Hashable]]:
    """Iterate every environment binding ``var_names`` to entities."""
    if not var_names:
        yield {}
        return
    for picks in cartesian_product(entities, repeat=len(var_names)):
        yield dict(zip(var_names, picks, strict=True))


def _resolve(term: Var | Const, env: Mapping[str, Hashable]) -> Hashable:
    if isinstance(term, Const):
        return term.value
    if isinstance(term, Var):
        return env[term.name]
    raise TypeError(f"unknown entity term {term!r}")


def _substitute(
    formula: Formula[int], env: Mapping[str, Hashable]
) -> Formula[int]:
    """Return a copy of ``formula`` with every Var replaced by Const."""
    if isinstance(formula, CellAtom):
        return CellAtom(
            predicate=formula.predicate,
            subject=Const(_resolve(formula.subject, env)),
            object_=Const(_resolve(formula.object_, env)),
            threshold=formula.threshold,
        )
    if isinstance(formula, FusionAtom):
        return FusionAtom(
            predicate_a=formula.predicate_a,
            subject_a=Const(_resolve(formula.subject_a, env)),
            object_a=Const(_resolve(formula.object_a, env)),
            predicate_b=formula.predicate_b,
            subject_b=Const(_resolve(formula.subject_b, env)),
            object_b=Const(_resolve(formula.object_b, env)),
            threshold=formula.threshold,
        )
    if isinstance(formula, And):
        return And(parts=tuple(_substitute(p, env) for p in formula.parts))
    if isinstance(formula, Or):
        return Or(parts=tuple(_substitute(p, env) for p in formula.parts))
    raise TypeError(f"unknown formula {formula!r}")


def _dnf(formula: Formula[int]) -> list[list[CellAtom[int] | FusionAtom[int]]]:
    """Disjunctive-normal-form expansion of a positive Boolean formula.

    Returns a list of disjuncts; each disjunct is a list of atoms (cell
    or fusion) implicitly conjoined. Leaves (CellAtom, FusionAtom) are
    one-disjunct/one-atom. ``And`` distributes via Cartesian product
    over its parts' DNFs; ``Or`` concatenates.
    """
    if isinstance(formula, (CellAtom, FusionAtom)):
        return [[formula]]
    if isinstance(formula, And):
        result: list[list[CellAtom[int] | FusionAtom[int]]] = [[]]
        for part in formula.parts:
            part_dnf = _dnf(part)
            result = [
                existing + disjunct
                for existing in result
                for disjunct in part_dnf
            ]
        return result
    if isinstance(formula, Or):
        return [d for part in formula.parts for d in _dnf(part)]
    raise TypeError(f"unknown formula {formula!r}")


def _atom_to_store_atom(
    atom: CellAtom[int] | FusionAtom[int],
) -> tuple[tuple[Hashable, Hashable, Hashable], BilatticeValue] | StoreFusionAntecedent:
    """Convert a (substituted) CellAtom / FusionAtom to a StoreRule
    antecedent atom.

    Substituted atoms have ``Const``-only terms; the converter unwraps
    them. Thresholds map via the twist↔FOUR encoding.
    """
    if isinstance(atom, CellAtom):
        s = _const_value(atom.subject)
        o = _const_value(atom.object_)
        return ((s, atom.predicate, o), twist_to_four(atom.threshold))
    if isinstance(atom, FusionAtom):
        return StoreFusionAntecedent(
            cell_a=(
                _const_value(atom.subject_a),
                atom.predicate_a,
                _const_value(atom.object_a),
            ),
            cell_b=(
                _const_value(atom.subject_b),
                atom.predicate_b,
                _const_value(atom.object_b),
            ),
            threshold=twist_to_four(atom.threshold),
        )
    raise TypeError(f"unknown atom {atom!r}")


def _const_value(term: Var | Const) -> Hashable:
    if isinstance(term, Const):
        return term.value
    raise TypeError(
        f"expected Const after substitution, got {term!r} — likely an "
        f"unsubstituted free or ∀-bound variable"
    )
