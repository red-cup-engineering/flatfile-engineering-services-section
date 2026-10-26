"""Concrete predication-calculus calculator.

This is the ergonomic SDK entry point: users work with entities, predicates,
and FOUR-valued predication cells; the calculator keeps the predicate category,
fibration, hyperdoctrine, store, and fiber views coherent.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Mapping, Sequence
from dataclasses import dataclass

from .._realizes import realizes
from ..algebra.bilattice import BilatticeValue
from ..algebra.twist_product import TwistBilattice, boolean_twist
from .bridge import fibers_to_store, store_to_fibers
from .cell import PredicationCell
from .closure_rule import And, CellAtom, Const, FiberClosureRule, Formula, Or, Var
from .closure_rule_system import CrossFiberClosureOperator, FiberClosureRuleSystem
from .comprehension import ComprehensionAdjunctionWitness
from .entity_set import EntitySet
from .fiber_valuation import FiberValuation
from .fibration import PredicationFibration
from .four import four_to_twist
from .hyperdoctrine import PredicationHyperdoctrine
from .index_map import IndexMap
from .positing import (
    PositingMorphism,
    batch_positing_naturality_witness,
    positing_naturality_witness,
    reindex_positing,
)
from .predicate_category import (
    PredicateCategory,
    PredicateMorphism,
    PredicateSet,
    PredicateSpecialization,
)
from .settling import PredicationSettling, settle_from_rule_system
from .store import PredicationStore
from .witness import (
    BatchPositingNaturalityWitness,
    BeckChevalleyWitness,
    FrobeniusWitness,
    FusionFrobeniusWitness,
    NaturalityWitness,
    PositingNaturalityWitness,
    QuantifierAdjunctionWitness,
    QuiescenceWitness,
)


@dataclass(frozen=True)
class PredicationCalculator:
    """A concrete FOUR-valued predication category calculator.

    The calculator is immutable. Methods that add observations return a new
    calculator, mirroring the monotone ``PredicationStore`` underneath.
    """

    category: PredicateCategory
    store: PredicationStore
    bilattice: TwistBilattice[int]

    # ---- construction -------------------------------------------------

    @classmethod
    def of(
        cls,
        *,
        entities: Iterable[Hashable],
        predicates: Iterable[Hashable],
        generators: Iterable[PredicateMorphism] = (),
        domains: Mapping[
            Hashable, frozenset[tuple[Hashable, Hashable]]
        ] | None = None,
        cells: Iterable[PredicationCell] = (),
    ) -> PredicationCalculator:
        """Build a calculator from ordinary Python iterables."""
        category = PredicateCategory(
            entities=EntitySet.of(entities),
            predicates=PredicateSet.of(predicates),
            generators=tuple(generators),
            domains={} if domains is None else domains,
        )
        calculator = cls(
            category=category,
            store=PredicationStore.empty(),
            bilattice=boolean_twist(),
        )
        for cell in cells:
            calculator = calculator.tell(
                cell.subject,
                cell.predicate,
                cell.object,
                cell.value,
            )
        return calculator

    # ---- closure-rule builders ---------------------------------------

    @staticmethod
    def var(name: str) -> Var:
        """Build an entity variable for closure-rule syntax."""
        return Var(name)

    @staticmethod
    def const(value: Hashable) -> Const:
        """Build an entity constant for closure-rule syntax."""
        return Const(value)

    @staticmethod
    def atom(
        predicate: Hashable,
        subject: Var | Const,
        object_: Var | Const,
        value: BilatticeValue = BilatticeValue.T,
    ) -> CellAtom[int]:
        """Build a FOUR-valued cell atom for closure-rule syntax."""
        return CellAtom(
            predicate=predicate,
            subject=subject,
            object_=object_,
            threshold=four_to_twist(value),
        )

    @staticmethod
    def all_of(*parts: Formula[int]) -> Formula[int]:
        """Build a positive conjunction for closure-rule syntax."""
        if not parts:
            raise ValueError("all_of requires at least one formula")
        if len(parts) == 1:
            return parts[0]
        return And(parts=tuple(parts))

    @staticmethod
    def any_of(*parts: Formula[int]) -> Formula[int]:
        """Build a positive disjunction for closure-rule syntax."""
        if not parts:
            raise ValueError("any_of requires at least one formula")
        if len(parts) == 1:
            return parts[0]
        return Or(parts=tuple(parts))

    @staticmethod
    def rule(
        *,
        free_vars: Iterable[str],
        antecedent: Formula[int],
        consequent: CellAtom[int],
        forall_vars: Iterable[str] = (),
    ) -> FiberClosureRule[int]:
        """Build one closure rule."""
        return FiberClosureRule(
            free_vars=tuple(free_vars),
            forall_vars=tuple(forall_vars),
            antecedent=antecedent,
            consequent=consequent,
        )

    @staticmethod
    def rule_system(
        *rules: FiberClosureRule[int],
        max_iterations: int = 10_000,
    ) -> FiberClosureRuleSystem[int]:
        """Build a closure-rule system."""
        return FiberClosureRuleSystem(
            rules=tuple(rules),
            max_iterations=max_iterations,
        )

    # ---- mathematical structure --------------------------------------

    @property
    def fibration(self) -> PredicationFibration[int]:
        """The predication fibration for the calculator's category."""
        return PredicationFibration(self.category, self.bilattice)

    @property
    def hyperdoctrine(self) -> PredicationHyperdoctrine[int]:
        """The predication hyperdoctrine for the calculator's category."""
        return PredicationHyperdoctrine(self.category, self.bilattice)

    # ---- observation/store operations --------------------------------

    def tell(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
        value: BilatticeValue = BilatticeValue.T,
    ) -> PredicationCalculator:
        """Return a calculator with one more observed predication cell."""
        return self.posit(subject, predicate, object_, value)

    def positing(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
        value: BilatticeValue = BilatticeValue.T,
    ) -> PositingMorphism:
        """Build the in-scope positing morphism for one cell."""
        self._require_cell_scope(subject, predicate, object_)
        return PositingMorphism(subject, predicate, object_, value)

    def posit(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
        value: BilatticeValue = BilatticeValue.T,
    ) -> PredicationCalculator:
        """Apply a positing morphism to the calculator's current store."""
        return PredicationCalculator(
            category=self.category,
            store=self.positing(subject, predicate, object_, value).apply(
                self.store
            ),
            bilattice=self.bilattice,
        )

    def assert_(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> PredicationCalculator:
        """Return a calculator after assertive positing at one cell."""
        return self.posit(subject, predicate, object_, BilatticeValue.T)

    def deny(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> PredicationCalculator:
        """Return a calculator with a false observation for a cell."""
        return self.posit(subject, predicate, object_, BilatticeValue.F)

    def contest(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> PredicationCalculator:
        """Return a calculator with explicit contestation at one cell."""
        return self.posit(subject, predicate, object_, BilatticeValue.TOP)

    def abstain(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> PredicationCalculator:
        """Validate a cell and return the abstaining identity morphism's result."""
        return self.posit(subject, predicate, object_, BilatticeValue.BOT)

    def posit_batch(
        self,
        *positings: PositingMorphism,
    ) -> PredicationCalculator:
        """Apply a finite batch of positing morphisms."""
        store = self.store
        for morphism in positings:
            self._require_cell_scope(
                morphism.subject,
                morphism.predicate,
                morphism.object,
            )
            store = morphism.apply(store)
        return self.with_store(store)

    def operational_step(
        self,
        *positings: PositingMorphism,
        rule_system: FiberClosureRuleSystem[int],
    ) -> OperationalStep:
        """Factor one operational step as batch positing followed by closure."""
        after_positing = self.posit_batch(*positings)
        return OperationalStep(
            initial=self,
            positings=tuple(positings),
            after_positing=after_positing,
            final=after_positing.infer(rule_system),
        )

    def value(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> BilatticeValue:
        """Return the FOUR value currently stored for a cell."""
        self._require_cell_scope(subject, predicate, object_)
        return self.store.get(subject, predicate, object_)

    # ---- fiber views --------------------------------------------------

    def fibers(self) -> dict[Hashable, FiberValuation[int]]:
        """Return the current store sliced into predicate fibers."""
        return store_to_fibers(self.store, self.category, self.bilattice)

    def fiber(self, predicate: Hashable) -> FiberValuation[int]:
        """Return the current fiber valuation for one predicate."""
        if predicate not in self.category.predicates:
            raise KeyError(f"{predicate!r} not in calculator predicates")
        return self.fibers()[predicate]

    # ---- predicate-category coherence --------------------------------

    def naturality(
        self,
        fibers: Mapping[Hashable, FiberValuation[int]] | None = None,
    ) -> NaturalityWitness[int]:
        """Witness 𝒞-naturality of the calculator's cross-fiber state."""
        valuation = self.fibers() if fibers is None else fibers
        self._require_valuation_scope(valuation)
        return self.category.naturality(valuation)

    def is_natural(
        self,
        fibers: Mapping[Hashable, FiberValuation[int]] | None = None,
    ) -> bool:
        """Return whether the calculator's cross-fiber state is 𝒞-natural."""
        return bool(self.naturality(fibers))

    # ---- hyperdoctrine operations ------------------------------------

    def pullback(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> FiberValuation[int]:
        """Calculate ``morphism*`` on a target fiber.

        If ``fiber`` is omitted, the calculator's current target-predicate
        fiber is used.
        """
        target_fiber = self._target_fiber(morphism, fiber)
        return self.hyperdoctrine.f_star(morphism, target_fiber)

    def exists_k(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> FiberValuation[int]:
        """Calculate the knowledge-order existential adjoint ``exists_f^k``."""
        source_fiber = self._source_fiber(morphism, fiber)
        return self.hyperdoctrine.exists_k(morphism, source_fiber)

    def exists_t(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> FiberValuation[int]:
        """Calculate the truth-order existential adjoint ``exists_f^t``."""
        source_fiber = self._source_fiber(morphism, fiber)
        return self.hyperdoctrine.exists_t(morphism, source_fiber)

    def forall_k(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> FiberValuation[int]:
        """Calculate the knowledge-order universal adjoint ``forall_f^k``."""
        source_fiber = self._source_fiber(morphism, fiber)
        return self.hyperdoctrine.forall_k(morphism, source_fiber)

    def forall_t(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> FiberValuation[int]:
        """Calculate the truth-order universal adjoint ``forall_f^t``."""
        source_fiber = self._source_fiber(morphism, fiber)
        return self.hyperdoctrine.forall_t(morphism, source_fiber)

    def quantifier_adjunctions(
        self,
        morphism: PredicateMorphism,
        *,
        source_samples: Sequence[FiberValuation[int]] | None = None,
        target_samples: Sequence[FiberValuation[int]] | None = None,
    ) -> QuantifierAdjunctionWitness[int]:
        """Witness the four B1 quantifier adjunctions for ``morphism``."""
        self._require_morphism_scope(morphism)
        return self.hyperdoctrine.quantifier_adjunctions(
            morphism,
            source_samples=source_samples,
            target_samples=target_samples,
        )

    def frobenius(
        self,
        morphism: PredicateMorphism,
        *,
        target_samples: Sequence[FiberValuation[int]] | None = None,
        source_samples: Sequence[FiberValuation[int]] | None = None,
    ) -> FrobeniusWitness[int]:
        """Witness the B2k/B2t Frobenius identities for ``morphism``."""
        self._require_morphism_scope(morphism)
        return self.hyperdoctrine.frobenius(
            morphism,
            target_samples=target_samples,
            source_samples=source_samples,
        )

    def fusion_frobenius(
        self,
        morphism: PredicateMorphism,
        *,
        target_samples: Sequence[FiberValuation[int]] | None = None,
        source_samples: Sequence[FiberValuation[int]] | None = None,
    ) -> FusionFrobeniusWitness[int]:
        """Witness whether the fusion-Frobenius identity holds for ``morphism``."""
        self._require_morphism_scope(morphism)
        return self.hyperdoctrine.fusion_frobenius(
            morphism,
            target_samples=target_samples,
            source_samples=source_samples,
        )

    def index_map(self, morphism: PredicateMorphism) -> IndexMap[int]:
        """Reduce a predicate morphism to its cellwise ``IndexMap``."""
        self._require_morphism_scope(morphism)
        return self.hyperdoctrine.index_map(morphism)

    def beck_chevalley_square(
        self,
        f: PredicateMorphism,
        g: PredicateMorphism,
    ) -> tuple[IndexMap[int], IndexMap[int]]:
        """Return the cellwise pullback square for parallel morphisms ``f`` and ``g``."""
        f_index, g_index = self._parallel_index_maps(f, g)
        return IndexMap.pullback_square(f_index, g_index)

    def beck_chevalley(
        self,
        f: PredicateMorphism,
        g: PredicateMorphism,
        fibers_at_g_source: Iterable[
            Mapping[Hashable, tuple[int, int]]
        ] | None = None,
    ) -> BeckChevalleyWitness[int]:
        """Witness Beck-Chevalley commutation for ``f`` and ``g``.

        ``f`` and ``g`` must share a target predicate. If no fiber sweep is
        supplied, the calculator's current fiber over ``g.source`` is used.
        """
        self._parallel_index_maps(f, g)
        if fibers_at_g_source is None:
            samples: list[Mapping[Hashable, tuple[int, int]]] = [
                {
                    cell: value
                    for cell, value in self.fiber(g.source).cells.items()
                }
            ]
        else:
            samples = [
                {cell: value for cell, value in sample.items()}
                for sample in fibers_at_g_source
            ]
        return self.hyperdoctrine.beck_chevalley(f, g, samples)

    def reindex_positing(
        self,
        morphism: PredicateMorphism,
        positing: PositingMorphism,
    ) -> tuple[PositingMorphism, ...]:
        """Pull a target-side positing back to a source-side positing batch."""
        self._require_morphism_scope(morphism)
        if positing.predicate != morphism.target:
            raise ValueError(
                "positing predicate must be the morphism target for reindexing"
            )
        self._require_cell_scope(
            positing.subject,
            positing.predicate,
            positing.object,
        )
        return reindex_positing(
            self.category,
            self.bilattice,
            morphism,
            positing,
        )

    def positing_naturality(
        self,
        morphism: PredicateMorphism,
        positing: PositingMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> PositingNaturalityWitness[int]:
        """Witness ``f^*(posit(v)) = posit(f^*(v))`` for one positing."""
        self._require_morphism_scope(morphism)
        if positing.predicate != morphism.target:
            raise ValueError(
                "positing predicate must be the morphism target for naturality"
            )
        self._require_cell_scope(
            positing.subject,
            positing.predicate,
            positing.object,
        )
        target_fiber = self._target_fiber(morphism, fiber)
        return positing_naturality_witness(
            self.hyperdoctrine,
            morphism,
            target_fiber,
            positing,
        )

    def batch_positing_naturality(
        self,
        morphism: PredicateMorphism,
        *positings: PositingMorphism,
        fiber: FiberValuation[int] | None = None,
    ) -> BatchPositingNaturalityWitness[int]:
        """Witness naturality for a finite batch of target-side positings."""
        self._require_morphism_scope(morphism)
        for positing in positings:
            if positing.predicate != morphism.target:
                raise ValueError(
                    "every positing predicate must be the morphism target"
                )
            self._require_cell_scope(
                positing.subject,
                positing.predicate,
                positing.object,
            )
        target_fiber = self._target_fiber(morphism, fiber)
        return batch_positing_naturality_witness(
            self.hyperdoctrine,
            morphism,
            target_fiber,
            positings,
        )

    def extension_t(
        self, specialization: PredicateSpecialization
    ) -> FiberValuation[int]:
        """Calculate the truth-order comprehension extension ``Ext^t``."""
        self._require_morphism_scope(specialization)
        return self.hyperdoctrine.extension_t(specialization)

    def extension_k(
        self, specialization: PredicateSpecialization
    ) -> FiberValuation[int]:
        """Calculate the knowledge-order comprehension extension ``Ext^k``."""
        self._require_morphism_scope(specialization)
        return self.hyperdoctrine.extension_k(specialization)

    def comprehension_t(
        self,
        predicate: Hashable,
        fiber: FiberValuation[int] | None = None,
    ) -> PredicateSpecialization:
        """Calculate the truth-order comprehension specialization ``{p:-}_t``."""
        psi = self.fiber(predicate) if fiber is None else fiber
        self._require_fiber_scope(predicate, psi)
        return self.hyperdoctrine.comprehension_t(predicate, psi)

    def comprehension_k(
        self,
        predicate: Hashable,
        fiber: FiberValuation[int] | None = None,
    ) -> PredicateSpecialization:
        """Calculate the knowledge-order comprehension specialization ``{p:-}_top``."""
        psi = self.fiber(predicate) if fiber is None else fiber
        self._require_fiber_scope(predicate, psi)
        return self.hyperdoctrine.comprehension_k(predicate, psi)

    def comprehension_adjunction(
        self,
        specialization: PredicateSpecialization,
        *,
        psis: Sequence[FiberValuation[int]] | None = None,
        schema: str,
    ) -> ComprehensionAdjunctionWitness[int]:
        """Witness a B4 comprehension adjunction for one specialization."""
        self._require_morphism_scope(specialization)
        return self.hyperdoctrine.comprehension_adjunction(
            specialization,
            psis=psis,
            schema=schema,
        )

    def refine_t(
        self,
        predicate: Hashable,
        *,
        as_predicate: Hashable,
    ) -> PredicationCalculator:
        """Add the truth-order comprehension of ``predicate`` as a subpredicate."""
        return self._with_refinement(
            predicate,
            as_predicate=as_predicate,
            specialization=self.comprehension_t(predicate),
        )

    def refine_k(
        self,
        predicate: Hashable,
        *,
        as_predicate: Hashable,
    ) -> PredicationCalculator:
        """Add the knowledge-order comprehension of ``predicate`` as a subpredicate."""
        return self._with_refinement(
            predicate,
            as_predicate=as_predicate,
            specialization=self.comprehension_k(predicate),
        )

    # ---- closure and settling ----------------------------------------

    def closure(
        self,
        rule_system: FiberClosureRuleSystem[int],
    ) -> CrossFiberClosureOperator[int]:
        """Generate the cross-fiber closure operator for ``rule_system``."""
        return rule_system.generate(self.hyperdoctrine)

    def settle(
        self,
        rule_system: FiberClosureRuleSystem[int],
        *,
        bound: int,
    ) -> PredicationSettling[int]:
        """Run ``rule_system`` from the calculator's current fiber state."""
        return settle_from_rule_system(
            self.hyperdoctrine,
            rule_system,
            self.fibers(),
            bound,
        )

    def close(
        self,
        rule_system: FiberClosureRuleSystem[int],
        *,
        bound: int,
    ) -> PredicationCalculator:
        """Return a calculator whose store is the settling's final state."""
        settling = self.settle(rule_system, bound=bound)
        return self.with_store(fibers_to_store(settling.final, self.category))

    def infer(
        self,
        rule_system: FiberClosureRuleSystem[int],
    ) -> PredicationCalculator:
        """Return a calculator closed under ``rule_system``.

        Unlike :meth:`settle`, this does not retain the trajectory. It applies
        the rule system's generated closure operator directly to the current
        fibers and rebuilds the calculator from the closed state.
        """
        inferred = self.closure(rule_system).at(self.fibers())
        return self.with_store(fibers_to_store(inferred, self.category))

    def quiescence(
        self,
        rule_system: FiberClosureRuleSystem[int],
    ) -> QuiescenceWitness[int]:
        """Witness whether the current store is closed under ``rule_system``."""
        before = self.fibers()
        self._require_valuation_scope(before)
        after = self.closure(rule_system).at(before)
        return QuiescenceWitness(before=before, after=after)

    def is_quiescent(
        self,
        rule_system: FiberClosureRuleSystem[int],
    ) -> bool:
        """Return whether the current store is closed under ``rule_system``."""
        return bool(self.quiescence(rule_system))

    # ---- replacement and validation ----------------------------------

    def with_store(self, store: PredicationStore) -> PredicationCalculator:
        """Return this calculator over another in-scope store."""
        for cell in store.cells():
            self._require_cell_scope(cell.subject, cell.predicate, cell.object)
        return PredicationCalculator(
            category=self.category,
            store=store,
            bilattice=self.bilattice,
        )

    def _require_cell_scope(
        self,
        subject: Hashable,
        predicate: Hashable,
        object_: Hashable,
    ) -> None:
        if subject not in self.category.entities:
            raise KeyError(f"subject {subject!r} not in calculator entities")
        if object_ not in self.category.entities:
            raise KeyError(f"object {object_!r} not in calculator entities")
        if predicate not in self.category.predicates:
            raise KeyError(f"predicate {predicate!r} not in calculator predicates")
        if (subject, object_) not in self.category.dom_of(predicate):
            raise ValueError(
                f"cell ({subject!r}, {predicate!r}, {object_!r}) is outside "
                f"dom({predicate!r})"
            )

    def _target_fiber(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None,
    ) -> FiberValuation[int]:
        self._require_morphism_scope(morphism)
        if fiber is None:
            return self.fiber(morphism.target)
        self._require_fiber_scope(morphism.target, fiber)
        return fiber

    def _source_fiber(
        self,
        morphism: PredicateMorphism,
        fiber: FiberValuation[int] | None,
    ) -> FiberValuation[int]:
        self._require_morphism_scope(morphism)
        if fiber is None:
            return self.fiber(morphism.source)
        self._require_fiber_scope(morphism.source, fiber)
        return fiber

    def _parallel_index_maps(
        self,
        f: PredicateMorphism,
        g: PredicateMorphism,
    ) -> tuple[IndexMap[int], IndexMap[int]]:
        if f.target != g.target:
            raise ValueError("Beck-Chevalley requires f.target == g.target")
        return self.index_map(f), self.index_map(g)

    def _with_refinement(
        self,
        predicate: Hashable,
        *,
        as_predicate: Hashable,
        specialization: PredicateSpecialization,
    ) -> PredicationCalculator:
        if as_predicate in self.category.predicates:
            raise ValueError(
                f"refinement predicate {as_predicate!r} already exists"
            )
        renamed = PredicateSpecialization(
            source=as_predicate,
            target=predicate,
            sub_support=specialization.sub_support,
        )
        domains = {
            p: self.category.dom_of(p) for p in self.category.predicates
        }
        domains[as_predicate] = renamed.sub_support
        category = PredicateCategory(
            entities=self.category.entities,
            predicates=PredicateSet.of(
                [*self.category.predicates, as_predicate]
            ),
            generators=(*self.category.generators, renamed),
            domains=domains,
        )
        fibers = self.fibers()
        fibers[as_predicate] = renamed.pullback(fibers[predicate])
        return PredicationCalculator(
            category=category,
            store=fibers_to_store(fibers, category),
            bilattice=self.bilattice,
        )

    def _require_morphism_scope(self, morphism: PredicateMorphism) -> None:
        if morphism.source not in self.category.predicates:
            raise KeyError(
                f"morphism source {morphism.source!r} not in calculator predicates"
            )
        if morphism.target not in self.category.predicates:
            raise KeyError(
                f"morphism target {morphism.target!r} not in calculator predicates"
            )
        if not self.category.contains_morphism(morphism):
            raise KeyError(f"{morphism!r} is not a morphism of the calculator category")

    def _require_fiber_scope(
        self,
        predicate: Hashable,
        fiber: FiberValuation[int],
    ) -> None:
        expected = self.category.dom_of(predicate)
        if fiber.bilattice is not self.bilattice:
            raise ValueError("fiber carries a different bilattice")
        if fiber.entities != self.category.entities:
            raise ValueError("fiber carries a different entity set")
        if fiber.dom != expected:
            raise ValueError(
                f"fiber.dom {sorted(fiber.dom)!r} does not match "
                f"dom({predicate!r}) = {sorted(expected)!r}"
            )

    def _require_valuation_scope(
        self,
        valuation: Mapping[Hashable, FiberValuation[int]],
    ) -> None:
        for predicate in self.category.predicates:
            if predicate not in valuation:
                raise KeyError(
                    f"valuation missing fiber for predicate {predicate!r}"
                )
            self._require_fiber_scope(predicate, valuation[predicate])


@realizes("theorems/positing-realizable-factorization")
@realizes("theorems/locution-illocution-perlocution-factorization")
@dataclass(frozen=True)
class OperationalStep:
    """A calculator-level witness of posit-batch-then-closure factorization."""

    initial: PredicationCalculator
    positings: tuple[PositingMorphism, ...]
    after_positing: PredicationCalculator
    final: PredicationCalculator

    @property
    def locution(self) -> frozenset[tuple[Hashable, Hashable, Hashable]]:
        """The finite set of targeted cells."""
        return frozenset(morphism.key for morphism in self.positings)

    @property
    def is_trivial(self) -> bool:
        """Return whether the step performs no non-abstaining positing."""
        return all(
            morphism.value is BilatticeValue.BOT for morphism in self.positings
        )


__all__ = ["OperationalStep", "PredicationCalculator"]
