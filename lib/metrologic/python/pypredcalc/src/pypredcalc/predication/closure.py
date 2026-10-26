"""Closure operator at the predication-fiber-algebra level.

Realises corpus morphism ``closure-operator``: a family

    cl = (cl_p)_{p ∈ 𝒞}    with    cl_p : A_p → A_p

on each predication fiber algebra, satisfying

1. Monotone in ``≤_k``:    v ≤_k v' ⇒ cl_p(v) ≤_k cl_p(v').
2. Inflationary:           v ≤_k cl_p(v).
3. Idempotent:             cl_p ∘ cl_p = cl_p.
4. 𝒞-natural:              f^* ∘ cl_p = cl_q ∘ f^*    for every f : q → p.

The corpus also names a 2-categorical lift (``closure-2-monad``); we
implement it on top of this strict 1-categorical operator in
:mod:`pypredcalc.predication.closure_monad`.

This module gives the operator and the four axiom-check witnesses; the
rule-system constructor (``concepts/closure-rule-system``) that *generates*
an operator from a syntactic specification follows in a sibling module.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from types import MappingProxyType
from typing import Generic, TypeVar

from .._realizes import realizes
from .fiber_valuation import FiberValuation
from .hyperdoctrine import PredicationHyperdoctrine
from .predicate_category import PredicateMorphism

T = TypeVar("T", bound=Hashable)


# ---- Axiom-check witnesses -------------------------------------------------


@dataclass(frozen=True)
class ClosureAxiomCheck(Generic[T]):
    """A single closure-axiom check.

    ``axiom`` names the axiom (``"monotone_k"``, ``"inflationary"``,
    ``"idempotent"``, ``"c_natural"``). ``locus`` records the predicate
    or generator the check happened at; ``lhs`` / ``rhs`` are the two
    fibers whose ``≤_k``-comparison or equality is being asserted.
    ``holds`` reads off the structure.
    """

    axiom: str
    locus: object  # predicate name, or PredicateMorphism (for c_natural)
    lhs: FiberValuation[T]
    rhs: FiberValuation[T]
    relation: str  # "leq_k" or "eq"

    @property
    def holds(self) -> bool:
        if self.relation == "eq":
            return self.lhs == self.rhs
        if self.relation == "leq_k":
            return self.lhs.knowledge_leq(self.rhs)
        raise ValueError(f"unknown relation {self.relation!r}")

    @property
    def discrepancy(self) -> frozenset[tuple[Hashable, Hashable]]:
        if self.holds:
            return frozenset()
        cells: set[tuple[Hashable, Hashable]] = set()
        for cell in self.lhs.dom | self.rhs.dom:
            if self.lhs.get(*cell) != self.rhs.get(*cell):
                cells.add(cell)
        return frozenset(cells)


@dataclass(frozen=True)
class ClosureAxiomWitness(Generic[T]):
    """Witness for one closure axiom across a sample sweep."""

    axiom: str
    checks: tuple[ClosureAxiomCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(c.holds for c in self.checks)

    @property
    def failures(self) -> tuple[ClosureAxiomCheck[T], ...]:
        return tuple(c for c in self.checks if not c.holds)

    def __bool__(self) -> bool:
        return self.holds


# ---- The operator itself ---------------------------------------------------


@realizes("morphisms/closure-operator")
@dataclass(frozen=True)
class ClosureOperator(Generic[T]):
    """A 𝒞-natural closure operator on a predication hyperdoctrine.

    ``family[p]`` is the per-predicate map ``cl_p : A_p → A_p``. The
    constructor verifies that the family covers every predicate in
    ``hyperdoctrine.category.predicates`` and rejects unknown keys.

    The four axioms are not enforced eagerly (deciding them requires a
    sample sweep at fiber level); :meth:`check_monotone_k`,
    :meth:`check_inflationary`, :meth:`check_idempotent`, and
    :meth:`check_c_natural` produce structural witnesses on a caller-
    supplied sample. Operators built by the rule-system constructor
    satisfy all four by construction; arbitrary ``family``-supplied
    operators must be checked.
    """

    hyperdoctrine: PredicationHyperdoctrine[T]
    family: Mapping[
        Hashable,
        Callable[[FiberValuation[T]], FiberValuation[T]],
    ]

    def __post_init__(self) -> None:
        predicates = set(self.hyperdoctrine.predicates())
        provided = set(self.family.keys())
        missing = predicates - provided
        if missing:
            raise ValueError(
                f"closure family missing entries for predicates: "
                f"{sorted(missing, key=str)!r}"
            )
        unknown = provided - predicates
        if unknown:
            raise ValueError(
                f"closure family has entries for unknown predicates: "
                f"{sorted(unknown, key=str)!r}"
            )
        object.__setattr__(self, "family", MappingProxyType(dict(self.family)))

    # ---- application ------------------------------------------------------

    def apply(
        self, predicate: Hashable, fiber: FiberValuation[T]
    ) -> FiberValuation[T]:
        """Apply ``cl_p`` to a fiber. Verifies that ``fiber`` lives over
        ``p`` (its ``dom`` matches ``dom(p)``) and that the output
        retains the same domain.
        """
        expected_dom = self.hyperdoctrine.dom(predicate)
        if fiber.dom != expected_dom:
            raise ValueError(
                f"input fiber.dom {sorted(fiber.dom)!r} does not match "
                f"dom({predicate!r}) = {sorted(expected_dom)!r}"
            )
        result = self.family[predicate](fiber)
        if result.dom != expected_dom:
            raise ValueError(
                f"closure cl_{predicate!r} returned a fiber with dom "
                f"{sorted(result.dom)!r}, expected {sorted(expected_dom)!r}"
            )
        return result

    # ---- axiom 1: monotone in ≤_k ----------------------------------------

    def check_monotone_k(
        self,
        samples: Iterable[
            tuple[Hashable, FiberValuation[T], FiberValuation[T]]
        ],
    ) -> ClosureAxiomWitness[T]:
        """For each ``(p, v, v')`` with ``v ≤_k v'``, check
        ``cl_p(v) ≤_k cl_p(v')``."""
        checks: list[ClosureAxiomCheck[T]] = []
        for predicate, v, v_prime in samples:
            if not v.knowledge_leq(v_prime):
                raise ValueError(
                    f"monotone_k sample requires v ≤_k v' for predicate "
                    f"{predicate!r}; got {v} ≰_k {v_prime}"
                )
            cl_v = self.apply(predicate, v)
            cl_v_prime = self.apply(predicate, v_prime)
            checks.append(
                ClosureAxiomCheck(
                    axiom="monotone_k",
                    locus=predicate,
                    lhs=cl_v,
                    rhs=cl_v_prime,
                    relation="leq_k",
                )
            )
        return ClosureAxiomWitness(axiom="monotone_k", checks=tuple(checks))

    # ---- axiom 2: inflationary -------------------------------------------

    def check_inflationary(
        self, samples: Iterable[tuple[Hashable, FiberValuation[T]]]
    ) -> ClosureAxiomWitness[T]:
        """For each ``(p, v)``, check ``v ≤_k cl_p(v)``."""
        checks: list[ClosureAxiomCheck[T]] = []
        for predicate, v in samples:
            cl_v = self.apply(predicate, v)
            checks.append(
                ClosureAxiomCheck(
                    axiom="inflationary",
                    locus=predicate,
                    lhs=v,
                    rhs=cl_v,
                    relation="leq_k",
                )
            )
        return ClosureAxiomWitness(axiom="inflationary", checks=tuple(checks))

    # ---- axiom 3: idempotent ---------------------------------------------

    def check_idempotent(
        self, samples: Iterable[tuple[Hashable, FiberValuation[T]]]
    ) -> ClosureAxiomWitness[T]:
        """For each ``(p, v)``, check ``cl_p(cl_p(v)) == cl_p(v)``."""
        checks: list[ClosureAxiomCheck[T]] = []
        for predicate, v in samples:
            cl_v = self.apply(predicate, v)
            cl_cl_v = self.apply(predicate, cl_v)
            checks.append(
                ClosureAxiomCheck(
                    axiom="idempotent",
                    locus=predicate,
                    lhs=cl_cl_v,
                    rhs=cl_v,
                    relation="eq",
                )
            )
        return ClosureAxiomWitness(axiom="idempotent", checks=tuple(checks))

    # ---- axiom 4: 𝒞-naturality -------------------------------------------

    def check_c_natural(
        self,
        samples: Iterable[tuple[PredicateMorphism, FiberValuation[T]]],
    ) -> ClosureAxiomWitness[T]:
        """For each ``(f: q → p, v ∈ A_p)``, check
        ``f^*(cl_p(v)) == cl_q(f^*(v))``.
        """
        checks: list[ClosureAxiomCheck[T]] = []
        for f, v in samples:
            # LHS: f^* ∘ cl_p (v), with v over the target predicate p.
            cl_v = self.apply(f.target, v)
            lhs = f.pullback(cl_v)
            # RHS: cl_q ∘ f^* (v).
            f_star_v = f.pullback(v)
            rhs = self.apply(f.source, f_star_v)
            checks.append(
                ClosureAxiomCheck(
                    axiom="c_natural",
                    locus=f,
                    lhs=lhs,
                    rhs=rhs,
                    relation="eq",
                )
            )
        return ClosureAxiomWitness(axiom="c_natural", checks=tuple(checks))

    def check_c_natural_generated(
        self,
        *,
        samples: Mapping[Hashable, Sequence[FiberValuation[T]]] | None = None,
        max_depth: int = 2,
    ) -> ClosureAxiomWitness[T]:
        """Check 𝒞-naturality over generated PredCat arrows.

        The corpus axiom quantifies over every morphism ``f : q -> p`` in
        ``𝒞``. This helper expands the declared generator presentation to
        identities, generators, and composites up to ``max_depth`` and checks
        ``f* cl_p(v) = cl_q f*(v)`` on the supplied target-fiber samples.
        """
        category = self.hyperdoctrine.category
        fibration = self.hyperdoctrine.fibration
        generated_samples: list[tuple[PredicateMorphism, FiberValuation[T]]] = []
        for morphism in category.generated_morphisms(max_depth=max_depth):
            for sample in fibration._samples_for(morphism.target, samples):
                generated_samples.append((morphism, sample))
        return self.check_c_natural(generated_samples)


# ---- Trivial closure operator (identity on every fiber) -------------------


def identity_closure(
    hyperdoctrine: PredicationHyperdoctrine[T],
) -> ClosureOperator[T]:
    """The trivial closure operator with ``cl_p = id`` on every fiber.

    Satisfies all four axioms vacuously. Useful as a baseline and as a
    test fixture for the axiom-check witnesses.
    """
    family = {
        predicate: (lambda fiber, _p=predicate: fiber)
        for predicate in hyperdoctrine.predicates()
    }
    return ClosureOperator(hyperdoctrine=hyperdoctrine, family=family)


__all__ = [
    "ClosureAxiomCheck",
    "ClosureAxiomWitness",
    "ClosureOperator",
    "identity_closure",
]
