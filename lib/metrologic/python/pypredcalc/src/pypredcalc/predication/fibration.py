"""Predication fibration: the cloven A-structure under the hyperdoctrine.

The corpus presents a predication hyperdoctrine as a predication
fibration satisfying A1-A3, plus the additional B1-B4 hyperdoctrine
structure. This module realises that lower layer directly:

- A1: each predicate fiber is the bilattice-valued relation object
  ``A_p = L^tw_{dom(p)}``.
- A2: generator morphisms act cellwise through their ``IndexMap(E)``
  cleavage.
- A3: reindexing preserves the bilattice-residuated fiber structure.

The witness methods return structural evidence rather than bare booleans.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping, Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar, cast

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .fiber_valuation import FiberValuation
from .index_map import IndexMap
from .predicate_category import PredicateCategory, PredicateMorphism

T = TypeVar("T", bound=Hashable)


@dataclass(frozen=True)
class FibrationAxiomCheck:
    """One localized check inside a predication-fibration witness."""

    axiom: str
    locus: object
    operation: str
    observed: object
    expected: object
    message: str = ""

    @property
    def holds(self) -> bool:
        return self.observed == self.expected


@dataclass(frozen=True)
class FibrationAxiomWitness(Generic[T]):
    """Structural witness for one predication-fibration axiom."""

    fibration: PredicationFibration[T]
    axiom: str
    checks: tuple[FibrationAxiomCheck, ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[FibrationAxiomCheck, ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class PredicationFibrationWitness(Generic[T]):
    """Aggregate A1-A3 witness for a cloven predication fibration."""

    fibration: PredicationFibration[T]
    a1: FibrationAxiomWitness[T]
    a2: FibrationAxiomWitness[T]
    a3: FibrationAxiomWitness[T]

    @property
    def axiom_witnesses(self) -> tuple[FibrationAxiomWitness[T], ...]:
        return (self.a1, self.a2, self.a3)

    @property
    def holds(self) -> bool:
        return all(witness.holds for witness in self.axiom_witnesses)

    @property
    def failures(self) -> tuple[FibrationAxiomWitness[T], ...]:
        return tuple(
            witness for witness in self.axiom_witnesses if not witness.holds
        )

    @property
    def failed_checks(self) -> tuple[FibrationAxiomCheck, ...]:
        return tuple(
            check
            for witness in self.axiom_witnesses
            for check in witness.failures
        )

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class PredicationFiberFunctorCheck(Generic[T]):
    """One identity or contravariant-composition check for the fiber functor."""

    law: str
    locus: object
    sample: FiberValuation[T]
    observed: FiberValuation[T]
    expected: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.observed == self.expected


@dataclass(frozen=True)
class PredicationFiberFunctorWitness(Generic[T]):
    """Structural witness that ``p ↦ A_p`` and ``f ↦ f*`` form a functor."""

    functor: PredicationFiberFunctor[T]
    checks: tuple[PredicationFiberFunctorCheck[T], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[PredicationFiberFunctorCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


@realizes("theorems/predication-fiber-functor")
@dataclass(frozen=True)
class PredicationFiberFunctor(Generic[T]):
    """Contravariant PredCat fiber functor ``C^op -> DBiLat(L)``.

    Objects are sent to their predication fiber algebras ``A_p``. A
    predicate morphism ``f : q -> p`` is sent to the reindexing
    homomorphism ``f* : A_p -> A_q`` supplied by the cloven fibration.
    """

    fibration: PredicationFibration[T]

    def object_map(self, predicate: Hashable) -> FiberValuation[T]:
        """Return the canonical bottom element carrying the fiber object data."""
        return self.fibration.fiber(predicate)

    def morphism_map(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[T],
    ) -> FiberValuation[T]:
        """Apply the contravariant arrow map ``F(morphism) = morphism*``."""
        return self.fibration.f_star(morphism, fiber)

    def check_functoriality(
        self,
        *,
        morphisms: Sequence[PredicateMorphism] | None = None,
        samples: Mapping[Hashable, Sequence[FiberValuation[T]]] | None = None,
        max_depth: int = 1,
    ) -> PredicationFiberFunctorWitness[T]:
        """Check identity and contravariant-composition laws on samples."""
        category = self.fibration.category
        arrows = (
            tuple(morphisms)
            if morphisms is not None
            else category.generated_morphisms(max_depth=max_depth)
        )
        checks: list[PredicationFiberFunctorCheck[T]] = []

        for predicate in category.predicates:
            identity = category.identity(predicate)
            for sample in self.fibration._samples_for(predicate, samples):
                checks.append(
                    PredicationFiberFunctorCheck(
                        law="identity",
                        locus=predicate,
                        sample=sample,
                        observed=self.morphism_map(identity, sample),
                        expected=sample,
                    )
                )

        for f in arrows:
            for g in arrows:
                if f.target != g.source:
                    continue
                composite = category.compose(g, f)
                for sample in self.fibration._samples_for(g.target, samples):
                    observed = self.morphism_map(composite, sample)
                    expected = self.morphism_map(
                        f,
                        self.morphism_map(g, sample),
                    )
                    checks.append(
                        PredicationFiberFunctorCheck(
                            law="composition",
                            locus=(g, f),
                            sample=sample,
                            observed=observed,
                            expected=expected,
                        )
                    )
        return PredicationFiberFunctorWitness(
            functor=self,
            checks=tuple(checks),
        )


@realizes("objects/predication-fibration")
@dataclass(frozen=True)
class PredicationFibration(Generic[T]):
    """The cloven predication fibration over a predicate category.

    ``category`` supplies the base category ``C`` and per-predicate domains.
    ``bilattice`` supplies the twist-bilattice value object. The cleavage is
    exposed by :meth:`cleavage`, which returns the corresponding cellwise
    :class:`IndexMap` for a predicate generator.
    """

    category: PredicateCategory
    bilattice: TwistBilattice[T]

    def predicates(self) -> tuple[Hashable, ...]:
        """The object set ``Ob(C)`` as an ordered tuple."""
        return self.category.predicates.predicates

    def dom(self, predicate: Hashable) -> frozenset[tuple[Hashable, Hashable]]:
        """The designated fiber domain ``dom(predicate)``."""
        return self.category.dom_of(predicate)

    def fiber(self, predicate: Hashable) -> FiberValuation[T]:
        """The canonical knowledge-bottom element of ``A_predicate``."""
        return FiberValuation(
            bilattice=self.bilattice,
            entities=self.category.entities,
            bottom=self.bilattice.knowledge_bottom(),
            cells={},
            dom=self.dom(predicate),
        )

    def fiber_functor(self) -> PredicationFiberFunctor[T]:
        """Return the contravariant predication-fiber functor."""
        return PredicationFiberFunctor(self)

    def f_star(
        self, f: PredicateMorphism, fiber: FiberValuation[T]
    ) -> FiberValuation[T]:
        """Reindex ``fiber`` along ``f``."""
        expected = self.dom(f.target)
        if fiber.dom != expected:
            raise ValueError(
                f"fiber.dom {sorted(fiber.dom)!r} does not match "
                f"dom({f.target!r}) = {sorted(expected)!r} required for "
                f"reindexing along {f!r}"
            )
        return f.pullback(fiber)

    def cleavage(self, f: PredicateMorphism) -> IndexMap[T]:
        """The chosen cartesian cell map for a predicate generator."""
        return IndexMap.from_generator(
            f,
            source_dom=self.dom(f.source),
            target_dom=self.dom(f.target),
            bilattice=self.bilattice,
        )

    index_map = cleavage

    def check_axioms(
        self,
        samples: Mapping[Hashable, Sequence[FiberValuation[T]]] | None = None,
    ) -> PredicationFibrationWitness[T]:
        """Check the full predication-fibration A-layer.

        This packages A1 fiber formation, A2 generator cleavage, and A3
        fiber-algebra preservation into one certificate. ``samples`` is
        forwarded to :meth:`check_a3` for extra algebra-preservation probes.
        """
        return PredicationFibrationWitness(
            fibration=self,
            a1=self.check_a1(),
            a2=self.check_a2(),
            a3=self.check_a3(samples),
        )

    def check_a1(self) -> FibrationAxiomWitness[T]:
        """Check fiber uniformity for every predicate."""
        checks: list[FibrationAxiomCheck] = []
        for predicate in self.predicates():
            fiber = self.fiber(predicate)
            checks.extend(
                [
                    FibrationAxiomCheck(
                        axiom="A1",
                        locus=predicate,
                        operation="bilattice",
                        observed=fiber.bilattice,
                        expected=self.bilattice,
                    ),
                    FibrationAxiomCheck(
                        axiom="A1",
                        locus=predicate,
                        operation="entities",
                        observed=fiber.entities,
                        expected=self.category.entities,
                    ),
                    FibrationAxiomCheck(
                        axiom="A1",
                        locus=predicate,
                        operation="bottom",
                        observed=fiber.bottom,
                        expected=self.bilattice.knowledge_bottom(),
                    ),
                    FibrationAxiomCheck(
                        axiom="A1",
                        locus=predicate,
                        operation="dom",
                        observed=fiber.dom,
                        expected=self.dom(predicate),
                    ),
                ]
            )
        return FibrationAxiomWitness(
            fibration=self, axiom="A1", checks=tuple(checks)
        )

    def check_a2(self) -> FibrationAxiomWitness[T]:
        """Check generator action against the chosen ``IndexMap`` cleavage."""
        checks: list[FibrationAxiomCheck] = []
        for generator in self.category.generators:
            try:
                index = self.cleavage(generator)
            except Exception as exc:  # pragma: no cover - exercised via witness
                checks.append(
                    FibrationAxiomCheck(
                        axiom="A2",
                        locus=generator,
                        operation="cleavage",
                        observed=type(exc).__name__,
                        expected="IndexMap",
                        message=str(exc),
                    )
                )
                continue
            for sample in self._samples_for(generator.target):
                observed = self.f_star(generator, sample)
                expected = FiberValuation(
                    bilattice=self.bilattice,
                    entities=self.category.entities,
                    bottom=self.bilattice.knowledge_bottom(),
                    cells=cast(
                        Mapping[tuple[Hashable, Hashable], tuple[T, T]],
                        index.pullback_cells(
                            cast(Mapping[Hashable, tuple[T, T]], sample.cells)
                        ),
                    ),
                    dom=self.dom(generator.source),
                )
                checks.append(
                    FibrationAxiomCheck(
                        axiom="A2",
                        locus=generator,
                        operation="pullback",
                        observed=observed,
                        expected=expected,
                    )
                )
        return FibrationAxiomWitness(
            fibration=self, axiom="A2", checks=tuple(checks)
        )

    def check_a3(
        self,
        samples: Mapping[Hashable, Sequence[FiberValuation[T]]] | None = None,
    ) -> FibrationAxiomWitness[T]:
        """Check that reindexing preserves the fiber-algebra operations.

        ``samples`` may provide additional target-side fibers per predicate.
        Missing predicates use a small canonical sweep: bottom plus one-cell
        top samples when the predicate domain is nonempty.
        """
        checks: list[FibrationAxiomCheck] = []
        for generator in self.category.generators:
            source_dom = self.dom(generator.source)
            target_samples = self._samples_for(generator.target, samples)
            for sample in target_samples:
                observed_dom = self.f_star(generator, sample).dom
                checks.append(
                    FibrationAxiomCheck(
                        axiom="A3",
                        locus=generator,
                        operation="reindexed-dom",
                        observed=observed_dom,
                        expected=source_dom,
                    )
                )
                lhs = self.f_star(generator, sample.negate())
                rhs = self.f_star(generator, sample).negate()
                checks.append(
                    FibrationAxiomCheck(
                        axiom="A3",
                        locus=generator,
                        operation="negation",
                        observed=lhs,
                        expected=rhs,
                    )
                )
            for v in target_samples:
                for w in target_samples:
                    for name, op in self._binary_ops():
                        lhs = self.f_star(generator, op(v, w))
                        rhs = op(
                            self.f_star(generator, v),
                            self.f_star(generator, w),
                        )
                        checks.append(
                            FibrationAxiomCheck(
                                axiom="A3",
                                locus=generator,
                                operation=name,
                                observed=lhs,
                                expected=rhs,
                            )
                        )
        return FibrationAxiomWitness(
            fibration=self, axiom="A3", checks=tuple(checks)
        )

    def _samples_for(
        self,
        predicate: Hashable,
        supplied: Mapping[Hashable, Sequence[FiberValuation[T]]] | None = None,
    ) -> tuple[FiberValuation[T], ...]:
        if supplied is not None and predicate in supplied:
            samples = tuple(supplied[predicate])
            for sample in samples:
                self._require_sample(predicate, sample)
            return samples

        bottom = self.fiber(predicate)
        dom = tuple(sorted(self.dom(predicate), key=repr))
        if not dom:
            return (bottom,)
        cell = dom[0]
        return (
            bottom,
            self._one_cell(predicate, cell, self.bilattice.truth_top()),
            self._one_cell(predicate, cell, self.bilattice.knowledge_top()),
        )

    def _one_cell(
        self,
        predicate: Hashable,
        cell: tuple[Hashable, Hashable],
        value: tuple[T, T],
    ) -> FiberValuation[T]:
        return FiberValuation(
            bilattice=self.bilattice,
            entities=self.category.entities,
            bottom=self.bilattice.knowledge_bottom(),
            cells={cell: value},
            dom=self.dom(predicate),
        )

    def _require_sample(
        self, predicate: Hashable, sample: FiberValuation[T]
    ) -> None:
        if sample.bilattice is not self.bilattice:
            raise ValueError("sample carries a different bilattice")
        if sample.entities != self.category.entities:
            raise ValueError("sample carries a different entity set")
        if sample.dom != self.dom(predicate):
            raise ValueError(
                f"sample for {predicate!r} has dom {sorted(sample.dom)!r}; "
                f"expected {sorted(self.dom(predicate))!r}"
            )

    @staticmethod
    def _binary_ops() -> tuple[
        tuple[
            str,
            Callable[
                [FiberValuation[T], FiberValuation[T]],
                FiberValuation[T],
            ],
        ],
        ...,
    ]:
        return (
            ("knowledge_join", FiberValuation.knowledge_join),
            ("knowledge_meet", FiberValuation.knowledge_meet),
            ("truth_join", FiberValuation.truth_join),
            ("truth_meet", FiberValuation.truth_meet),
            ("fusion", FiberValuation.fusion),
            ("right_residual", FiberValuation.right_residual),
        )


__all__ = [
    "FibrationAxiomCheck",
    "FibrationAxiomWitness",
    "PredicationFiberFunctor",
    "PredicationFiberFunctorCheck",
    "PredicationFiberFunctorWitness",
    "PredicationFibrationWitness",
    "PredicationFibration",
]
