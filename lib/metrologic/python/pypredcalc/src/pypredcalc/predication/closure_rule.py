"""Closure-rule language at the predication-fiber-algebra level.

Realises corpus concepts ``closure-rule`` and ``closure-rule-language``:
a syntactic generator of a closure operator. One rule asserts a single
cell-update conditional on a positive ``Π_1`` antecedent over cell atoms.

The corpus rule schema:

    ∀ x_1 ⋯ x_n. φ(x⃗; y⃗; v)  ⟹  v'(p)(t_1, t_2) ≥_k V

with free entity variables ``y⃗`` (the rule fires once per ``y⃗``-instantiation
from ``E``) and universally bound entity variables ``x⃗``.

This module's data model:

- :class:`Var`, :class:`Const` — entity terms (variable names or fixed
  entities).
- :class:`CellAtom` — the atomic formula ``v(q)(s_1, s_2) ≥_k V`` —
  positive in ``≤_k``.
- :class:`And`, :class:`Or` — positive Boolean combinations of atoms.
- :class:`FiberClosureRule` — one full rule. ``forall_vars`` is the
  ``∀`` block; ``free_vars`` is ``y⃗``; ``is_quantifier_free`` reads off
  whether the rule generates a Scott-continuous fragment.

Predicate uniformity (the rule stated across a generator class) is
expressed by the ``predicate_class`` field on the rule; uniform rules
fire at every predicate they apply to, in service of the
𝒞-naturality axiom of the generated closure operator.

Signature atoms (entity-set equality with constants, predicate-class
membership, residuated-lattice atoms) are not yet modeled — the present
language fragment is **cell-atoms only**, sufficient for the rule
systems used in the corpus's named examples (transitive closure,
symmetric closure, propagation rules) and for the four-regime
classifier's quantifier-free vs ``∀``-blocked distinction.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterator, Mapping
from dataclasses import dataclass
from typing import Generic, TypeVar, Union

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .fiber_valuation import FiberValuation

T = TypeVar("T", bound=Hashable)


# ---- Entity terms ---------------------------------------------------------


@dataclass(frozen=True)
class Var:
    """An entity variable — either free (instantiated per firing) or
    universally bound (ranged over by a ``∀`` block)."""

    name: str

    def __repr__(self) -> str:  # pragma: no cover — repr only
        return f"Var({self.name!r})"


@dataclass(frozen=True)
class Const:
    """A literal entity constant from ``E``."""

    value: Hashable

    def __repr__(self) -> str:  # pragma: no cover — repr only
        return f"Const({self.value!r})"


EntityTerm = Var | Const


def resolve_term(term: EntityTerm, env: Mapping[str, Hashable]) -> Hashable:
    """Look up an entity term in an environment binding variable names
    to entities. Constants resolve to their value; variables to the
    environment binding."""
    if isinstance(term, Const):
        return term.value
    if isinstance(term, Var):
        if term.name not in env:
            raise KeyError(
                f"variable {term.name!r} not bound in environment "
                f"{dict(env)!r}"
            )
        return env[term.name]
    raise TypeError(f"unknown entity term {term!r}")


# ---- Atoms and positive Boolean combinations ------------------------------


@realizes("concepts/closure-rule")
@dataclass(frozen=True)
class CellAtom(Generic[T]):
    """A cell atom ``v(predicate)(subject, object) ≥_k threshold``.

    Positive in the knowledge order: if the atom holds at ``v`` and
    ``v ≤_k v'``, the atom holds at ``v'``.
    """

    predicate: Hashable
    subject: EntityTerm
    object_: EntityTerm
    threshold: tuple[T, T]

    def evaluate(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        env: Mapping[str, Hashable],
        bilattice: TwistBilattice[T],
    ) -> bool:
        """Evaluate the atom at a cross-fiber valuation under an
        environment that binds every free / bound variable referenced.
        """
        s = resolve_term(self.subject, env)
        o = resolve_term(self.object_, env)
        if self.predicate not in valuation:
            raise KeyError(
                f"valuation does not carry predicate {self.predicate!r}"
            )
        cell_val = valuation[self.predicate].get(s, o)
        return bilattice.knowledge_leq(self.threshold, cell_val)


@realizes("concepts/closure-rule")
@dataclass(frozen=True)
class FusionAtom(Generic[T]):
    """A twist-product fusion antecedent atom of the form

        ``v(p_a)(s_a, o_a) ⊙ v(p_b)(s_b, o_b) ≥_t threshold``

    where ``⊙`` is the bilattice's twist-product fusion and ``≥_t`` is
    the truth-order comparison.

    Realises the antecedent shape of corpus theorem
    ``dispatch-as-closure-rule-system`` — the rule

        ``capability(a) ⊙ required_cap(w) ≥_t threshold``

    is a ``FusionAtom`` with ``predicate_a="capability"``,
    ``predicate_b="required_cap"``, and the corresponding agent / work
    entity terms.

    Note the threshold is in the **truth order** (`≥_t`), distinct from
    :class:`CellAtom`'s knowledge-order threshold (`≥_k`). This is what
    the corpus theorem specifies; the difference matters because fusion
    is the truth-order's residuated-lattice composition operator.
    """

    predicate_a: Hashable
    subject_a: EntityTerm
    object_a: EntityTerm
    predicate_b: Hashable
    subject_b: EntityTerm
    object_b: EntityTerm
    threshold: tuple[T, T]

    def evaluate(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        env: Mapping[str, Hashable],
        bilattice: TwistBilattice[T],
    ) -> bool:
        s_a = resolve_term(self.subject_a, env)
        o_a = resolve_term(self.object_a, env)
        s_b = resolve_term(self.subject_b, env)
        o_b = resolve_term(self.object_b, env)
        if self.predicate_a not in valuation:
            raise KeyError(
                f"valuation does not carry predicate {self.predicate_a!r}"
            )
        if self.predicate_b not in valuation:
            raise KeyError(
                f"valuation does not carry predicate {self.predicate_b!r}"
            )
        val_a = valuation[self.predicate_a].get(s_a, o_a)
        val_b = valuation[self.predicate_b].get(s_b, o_b)
        fused = bilattice.fusion(val_a, val_b)
        return bilattice.truth_leq(self.threshold, fused)


@dataclass(frozen=True)
class And(Generic[T]):
    """Positive conjunction of antecedent formulas."""

    parts: tuple[Formula[T], ...]

    def evaluate(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        env: Mapping[str, Hashable],
        bilattice: TwistBilattice[T],
    ) -> bool:
        return all(
            part.evaluate(valuation, env, bilattice) for part in self.parts
        )


@dataclass(frozen=True)
class Or(Generic[T]):
    """Positive disjunction of antecedent formulas."""

    parts: tuple[Formula[T], ...]

    def evaluate(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        env: Mapping[str, Hashable],
        bilattice: TwistBilattice[T],
    ) -> bool:
        return any(
            part.evaluate(valuation, env, bilattice) for part in self.parts
        )


Formula = Union[CellAtom[T], FusionAtom[T], "And[T]", "Or[T]"]


def collect_atom_variables(formula: Formula[T]) -> frozenset[str]:
    """The set of all entity-variable names referenced in ``formula``."""
    if isinstance(formula, CellAtom):
        names: set[str] = set()
        for term in (formula.subject, formula.object_):
            if isinstance(term, Var):
                names.add(term.name)
        return frozenset(names)
    if isinstance(formula, FusionAtom):
        names_f: set[str] = set()
        for term in (
            formula.subject_a, formula.object_a,
            formula.subject_b, formula.object_b,
        ):
            if isinstance(term, Var):
                names_f.add(term.name)
        return frozenset(names_f)
    if isinstance(formula, (And, Or)):
        out: set[str] = set()
        for part in formula.parts:
            out |= collect_atom_variables(part)
        return frozenset(out)
    raise TypeError(f"unknown formula {formula!r}")


# ---- The rule itself ------------------------------------------------------


@realizes("concepts/closure-rule")
@dataclass(frozen=True)
class FiberClosureRule(Generic[T]):
    """One closure rule over the fiber-atom rule language.

    Parameters
    ----------
    free_vars
        The free entity variables ``y⃗``. The rule fires once per
        free-variable instantiation from ``E``.
    forall_vars
        The universally bound entity variables ``x⃗``. The antecedent
        must hold for every instantiation of these from ``E``.
    antecedent
        A positive Boolean formula (``CellAtom`` / ``And`` / ``Or``) over
        the rule's variables.
    consequent
        The cell atom whose threshold must be raised when the rule fires.
        Its variables must be drawn from ``free_vars`` (consequents do
        not refer to bound variables — they are ``∀``-eliminated by the
        antecedent).

    The boolean :attr:`is_quantifier_free` is the syntactic discriminator
    for the four-regime dichotomy: rules with empty ``forall_vars``
    generate Scott-continuous closures; rules with non-empty
    ``forall_vars`` over an infinite ``E`` may generate non-Scott-continuous
    closures (the realisability question per ``L_ns(S)`` lives there).

    Predicate uniformity (the rule stated across a generator class for
    𝒞-naturality) is not yet modeled. For now, individual predicates
    are referenced directly in atoms; rules at one predicate are
    admissible whenever there is no 𝒞-morphism out of that predicate
    that would constrain them.
    """

    free_vars: tuple[str, ...]
    forall_vars: tuple[str, ...]
    antecedent: Formula[T]
    consequent: CellAtom[T]

    def __post_init__(self) -> None:
        if len(set(self.free_vars)) != len(self.free_vars):
            raise ValueError(
                f"free_vars contain duplicates: {self.free_vars!r}"
            )
        if len(set(self.forall_vars)) != len(self.forall_vars):
            raise ValueError(
                f"forall_vars contain duplicates: {self.forall_vars!r}"
            )
        overlap = set(self.free_vars) & set(self.forall_vars)
        if overlap:
            raise ValueError(
                f"free_vars and forall_vars overlap on: {sorted(overlap)!r}"
            )
        # Antecedent variables must lie in (free_vars ∪ forall_vars).
        antec_vars = collect_atom_variables(self.antecedent)
        scope = set(self.free_vars) | set(self.forall_vars)
        unbound_antec = antec_vars - scope
        if unbound_antec:
            raise ValueError(
                f"antecedent references unbound variables: "
                f"{sorted(unbound_antec)!r}"
            )
        # Consequent variables must lie in free_vars (∀-vars are
        # eliminated by the antecedent and do not survive into the
        # consequent).
        conseq_vars = collect_atom_variables(self.consequent)
        unbound_conseq = conseq_vars - set(self.free_vars)
        if unbound_conseq:
            raise ValueError(
                f"consequent references variables not in free_vars: "
                f"{sorted(unbound_conseq)!r}"
            )

    @property
    def is_quantifier_free(self) -> bool:
        """True if the rule has no ``∀`` block (Scott-continuous fragment)."""
        return len(self.forall_vars) == 0

    def fires_at(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        free_env: Mapping[str, Hashable],
        entities: tuple[Hashable, ...],
        bilattice: TwistBilattice[T],
    ) -> bool:
        """Decide whether the rule fires at the given free-variable
        environment, evaluating the antecedent over ``valuation`` with
        the ``∀`` block ranging over ``entities``."""
        if set(free_env.keys()) != set(self.free_vars):
            raise ValueError(
                f"free_env keys {sorted(free_env.keys())!r} do not match "
                f"free_vars {sorted(self.free_vars)!r}"
            )
        if not self.forall_vars:
            return self.antecedent.evaluate(valuation, free_env, bilattice)
        # Range every ∀-var over E and conjoin.
        return all(
            self.antecedent.evaluate(
                valuation, {**free_env, **dict(zip(self.forall_vars, picks, strict=True))}, bilattice
            )
            for picks in _product(entities, len(self.forall_vars))
        )

    def consequent_at(
        self,
        free_env: Mapping[str, Hashable],
    ) -> tuple[Hashable, tuple[Hashable, Hashable], tuple[T, T]]:
        """Resolve the consequent under a free-variable environment.

        Returns ``(predicate, (subject, object), threshold_value)`` —
        the cell whose value must be raised by knowledge-join with the
        threshold.
        """
        if set(free_env.keys()) != set(self.free_vars):
            raise ValueError(
                f"free_env keys {sorted(free_env.keys())!r} do not match "
                f"free_vars {sorted(self.free_vars)!r}"
            )
        s = resolve_term(self.consequent.subject, free_env)
        o = resolve_term(self.consequent.object_, free_env)
        return self.consequent.predicate, (s, o), self.consequent.threshold


def _product(
    entities: tuple[Hashable, ...], length: int
) -> Iterator[tuple[Hashable, ...]]:
    """Internal helper: ``length``-fold Cartesian product of ``entities``."""
    if length == 0:
        yield ()
        return
    for tail in _product(entities, length - 1):
        for head in entities:
            yield (head,) + tail


__all__ = [
    "And",
    "CellAtom",
    "Const",
    "FiberClosureRule",
    "Formula",
    "FusionAtom",
    "Or",
    "Var",
    "collect_atom_variables",
    "resolve_term",
]
