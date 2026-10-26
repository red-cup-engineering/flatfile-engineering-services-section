"""Closure-rule systems and their generated closure operators.

Realises corpus concept ``closure-rule-system``: a finite set of
:class:`FiberClosureRule` objects, plus the construction of the least
closure operator ``cl^S`` satisfying every rule.

The corpus's structural closure operator (:class:`ClosureOperator`) is
strictly per-fiber (``cl_p : A_p → A_p``). Rules, however, naturally
read across fibers (``R(x, y) ∧ S(y, z) ⟹ T(x, z)``), so the operator a
rule system generates is most naturally a *cross-fiber* operator
``cl^S : (Π → A_·) → (Π → A_·)``. We model that here as
:class:`CrossFiberClosureOperator` and produce one from a rule system
via Kleene iteration to fixed point.

Iteration. Per round: evaluate every rule's antecedent at the current
cross-fiber state; for each free-variable instantiation that satisfies
the antecedent, knowledge-join the consequent cell value into the
working state. The round commits all changes simultaneously. Stop when
a round adds nothing. The operator is *inflationary* (joins only
raise), *idempotent* (a fixed point of the round-function), and (when
rules are stated uniformly across the predicate-category generators)
``𝒞``-natural.

Domain handling. A rule firing whose consequent resolves to a cell
outside the consequent predicate's ``dom`` is silently skipped — out-of-
domain cells are structurally absent in the corpus, not zero values.
This matches how :class:`FiberValuation` carries ``dom`` first-class.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterator, Mapping
from dataclasses import dataclass
from itertools import product as cartesian_product
from types import MappingProxyType
from typing import Generic, TypeVar

from .._realizes import realizes
from .closure_rule import FiberClosureRule
from .fiber_valuation import FiberValuation
from .hyperdoctrine import PredicationHyperdoctrine
from .regime import (
    PredicationRegimeCertificate,
    StateSpaceCofinality,
    derive_regime_certificate,
)
from .witness import GeneratorNaturalityCheck, NaturalityWitness

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class RuleSystemRegimeProfile(Generic[T]):
    """Syntactic regime profile for a closure-rule system.

    The four-regime dichotomy depends on closure ordinal, base finiteness,
    and Scott-continuity. A finite executable rule system cannot decide
    every transfinite case, but it can expose the load-bearing syntactic
    data: whether rules are quantifier-free and which cofinality assumption
    the caller is making for the state space.
    """

    rule_system: FiberClosureRuleSystem[T]
    finite_lattice: bool
    finite_entities: bool
    finite_predicate_category: bool
    state_space_cofinality: StateSpaceCofinality

    @property
    def finite_base(self) -> bool:
        return (
            self.finite_lattice
            and self.finite_entities
            and self.finite_predicate_category
        )

    @property
    def is_scott_continuous(self) -> bool:
        return self.rule_system.is_scott_continuous

    @property
    def regime(self) -> str:
        return self.certificate.regime.value

    @property
    def has_transfinite_obstruction(self) -> bool:
        return self.certificate.requires_transfinite_runtime

    @property
    def certificate(self) -> PredicationRegimeCertificate:
        return derive_regime_certificate(
            finite_lattice=self.finite_lattice,
            finite_entities=self.finite_entities,
            finite_predicate_category=self.finite_predicate_category,
            scott_continuous=self.is_scott_continuous,
            state_space_cofinality=self.state_space_cofinality,
        )


# ---- Cross-fiber closure operator -----------------------------------------


@dataclass(frozen=True)
class CrossFiberClosureOperator(Generic[T]):
    """A closure operator on the *cross-fiber* state ``Π → A_·``.

    Whereas :class:`pypredcalc.predication.closure.ClosureOperator` is
    per-fiber and matches the corpus's structural definition, this
    object is what a rule system actually generates: a map
    ``cl^S : (Π → A_·) → (Π → A_·)`` whose action at predicate ``p``
    can depend on the values at other predicates.

    The wrapped ``apply`` callable is expected to be inflationary and
    idempotent on cross-fiber states (knowledge-pointwise) and to
    preserve every fiber's ``dom``. The constructor does not enforce
    these — call the axiom-check methods on a sample sweep to verify.
    """

    hyperdoctrine: PredicationHyperdoctrine[T]
    apply: Callable[
        [Mapping[Hashable, FiberValuation[T]]],
        Mapping[Hashable, FiberValuation[T]],
    ]
    regime_profile: RuleSystemRegimeProfile[T] | None = None

    def at(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
    ) -> Mapping[Hashable, FiberValuation[T]]:
        """Apply the closure to a cross-fiber valuation, validating
        that every fiber lives over its predicate's ``dom``."""
        self._validate_input(valuation)
        result = dict(self.apply(valuation))
        # Result must cover every predicate and preserve dom.
        for predicate in self.hyperdoctrine.predicates():
            if predicate not in result:
                raise ValueError(
                    f"closure result missing predicate {predicate!r}"
                )
            if result[predicate].dom != self.hyperdoctrine.dom(predicate):
                raise ValueError(
                    f"closure result on {predicate!r} has dom "
                    f"{sorted(result[predicate].dom)!r}, expected "
                    f"{sorted(self.hyperdoctrine.dom(predicate))!r}"
                )
        return MappingProxyType(result)

    def _validate_input(
        self, valuation: Mapping[Hashable, FiberValuation[T]]
    ) -> None:
        for predicate in self.hyperdoctrine.predicates():
            if predicate not in valuation:
                raise ValueError(
                    f"input valuation missing predicate {predicate!r}"
                )
            if valuation[predicate].dom != self.hyperdoctrine.dom(predicate):
                raise ValueError(
                    f"input fiber on {predicate!r} has dom "
                    f"{sorted(valuation[predicate].dom)!r}, expected "
                    f"{sorted(self.hyperdoctrine.dom(predicate))!r}"
                )

    def output_naturality(
        self,
        valuation: Mapping[Hashable, FiberValuation[T]],
        *,
        max_depth: int = 1,
    ) -> NaturalityWitness[T]:
        """Apply the closure and witness 𝒞-naturality of the result.

        Predicate-category naturality says a closed settling state satisfies
        ``f*(v(p)) = v(q)`` for every ``f : q -> p``. This method checks that
        condition after one full closure application, over identities,
        generators, and generated composites up to ``max_depth``.
        """
        closed = self.at(valuation)
        checks: list[GeneratorNaturalityCheck[T]] = []
        for morphism in self.hyperdoctrine.category.generated_morphisms(
            max_depth=max_depth
        ):
            pulled = morphism.pullback(closed[morphism.target])
            expected = closed[morphism.source]
            checks.append(
                GeneratorNaturalityCheck(
                    generator=morphism,
                    pulled=pulled,
                    expected=expected,
                )
            )
        return NaturalityWitness(valuation=closed, checks=tuple(checks))


# ---- The rule system ------------------------------------------------------


@realizes("concepts/closure-rule-system")
@dataclass(frozen=True)
class FiberClosureRuleSystem(Generic[T]):
    """A finite collection of :class:`FiberClosureRule` objects.

    Generates a :class:`CrossFiberClosureOperator` via least-fixed-point
    iteration. The system is **Scott-continuous** when every rule is
    quantifier-free; this property is read off
    :attr:`is_scott_continuous` and corresponds to the strict /
    Scott-continuous regimes of the four-regime dichotomy. A system
    with at least one ``∀``-blocked rule may generate a non-Scott-
    continuous operator (transfinite-bounded or aperiodic regime).
    """

    rules: tuple[FiberClosureRule[T], ...]
    max_iterations: int = 10_000

    @property
    def is_scott_continuous(self) -> bool:
        """``True`` iff every rule is quantifier-free."""
        return all(rule.is_quantifier_free for rule in self.rules)

    def regime_profile(
        self,
        *,
        finite_lattice: bool = True,
        finite_entities: bool = True,
        finite_predicate_category: bool = True,
        state_space_cofinality: StateSpaceCofinality = "finite",
    ) -> RuleSystemRegimeProfile[T]:
        """Return the rule-language profile used by the four-regime split.

        ``state_space_cofinality`` is relevant only for non-finite,
        non-Scott-continuous cases. Accepted values are ``"finite"``,
        ``"countable"``, ``"uncountable"``, and ``"unknown"``.
        """
        if state_space_cofinality not in {
            "finite",
            "countable",
            "uncountable",
            "unknown",
        }:
            raise ValueError(
                "state_space_cofinality must be one of: "
                "'finite', 'countable', 'uncountable', 'unknown'"
            )
        return RuleSystemRegimeProfile(
            rule_system=self,
            finite_lattice=finite_lattice,
            finite_entities=finite_entities,
            finite_predicate_category=finite_predicate_category,
            state_space_cofinality=state_space_cofinality,
        )

    def generate(
        self, hyperdoctrine: PredicationHyperdoctrine[T]
    ) -> CrossFiberClosureOperator[T]:
        """Build the closure operator generated by this system."""
        rules = self.rules
        max_iter = self.max_iterations
        bilattice = hyperdoctrine.bilattice
        entities = tuple(hyperdoctrine.category.entities)

        def closure(
            valuation: Mapping[Hashable, FiberValuation[T]],
        ) -> Mapping[Hashable, FiberValuation[T]]:
            current = {p: v for p, v in valuation.items()}
            for _round in range(max_iter):
                updated = {p: v for p, v in current.items()}
                round_changed = False
                for rule in rules:
                    for free_env in _iter_envs(rule.free_vars, entities):
                        if not rule.fires_at(current, free_env, entities, bilattice):
                            continue
                        predicate, cell, threshold = rule.consequent_at(free_env)
                        if predicate not in updated:
                            # Rule references an out-of-category predicate.
                            raise KeyError(
                                f"rule consequent predicate {predicate!r} not "
                                f"in hyperdoctrine"
                            )
                        target_dom = updated[predicate].dom
                        if cell not in target_dom:
                            # Out-of-domain cell — silently skip.
                            continue
                        existing = updated[predicate].get(*cell)
                        joined = bilattice.knowledge_join(existing, threshold)
                        if joined == existing:
                            continue
                        # Commit the raise.
                        new_cells = dict(updated[predicate].cells)
                        if joined == updated[predicate].bottom:
                            new_cells.pop(cell, None)
                        else:
                            new_cells[cell] = joined
                        updated[predicate] = FiberValuation(
                            bilattice=updated[predicate].bilattice,
                            entities=updated[predicate].entities,
                            bottom=updated[predicate].bottom,
                            cells=new_cells,
                            dom=updated[predicate].dom,
                        )
                        round_changed = True
                if not round_changed:
                    return updated
                current = updated
            raise RuntimeError(
                f"closure did not stabilize within {max_iter} rounds; "
                f"either the system has a non-terminating cycle, or "
                f"max_iterations is too small (currently "
                f"{self.max_iterations})"
            )

        return CrossFiberClosureOperator(
            hyperdoctrine=hyperdoctrine,
            apply=closure,
            regime_profile=self.regime_profile(),
        )


# ---- Helpers --------------------------------------------------------------


def _iter_envs(
    var_names: tuple[str, ...], entities: tuple[Hashable, ...]
) -> Iterator[dict[str, Hashable]]:
    """Iterate every environment binding ``var_names`` to entities."""
    if not var_names:
        yield {}
        return
    for picks in cartesian_product(entities, repeat=len(var_names)):
        yield dict(zip(var_names, picks, strict=True))


def empty_valuation(
    hyperdoctrine: PredicationHyperdoctrine[T],
) -> Mapping[Hashable, FiberValuation[T]]:
    """The constant-``⊥_k`` cross-fiber valuation — every fiber the empty
    fiber. Useful as the starting state for forward closure runs."""
    return MappingProxyType(
        {p: hyperdoctrine.fiber(p) for p in hyperdoctrine.predicates()}
    )


def cross_fiber_knowledge_leq(
    a: Mapping[Hashable, FiberValuation[T]],
    b: Mapping[Hashable, FiberValuation[T]],
) -> bool:
    """Pointwise ``≤_k`` on cross-fiber valuations."""
    if set(a.keys()) != set(b.keys()):
        return False
    return all(a[p].knowledge_leq(b[p]) for p in a)


__all__ = [
    "CrossFiberClosureOperator",
    "FiberClosureRuleSystem",
    "RuleSystemRegimeProfile",
    "cross_fiber_knowledge_leq",
    "empty_valuation",
]
