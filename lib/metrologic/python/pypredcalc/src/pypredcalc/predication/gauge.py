"""Klein-four gauge connections over predicate categories.

Predication category theory uses the intrinsic automorphism group of FOUR,
``K4 = Aut(FOUR) = {id, negation, conflation, combined}``, as a gauge group
over predicate-category morphisms. This module keeps that construction on the
PredCat surface: a finite connection is a functor from a generated fragment of
``PredicateCategory`` to ``BK4``.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping, Sequence
from dataclasses import dataclass
from typing import Generic, Literal, TypeAlias, TypeVar

from .._realizes import realizes
from ..algebra.twist_product import TwistBilattice
from .fiber_valuation import FiberValuation
from .fibration import PredicationFibration
from .predicate_category import PredicateCategory, PredicateIdentity, PredicateMorphism

T = TypeVar("T", bound=Hashable)

KleinFourElement: TypeAlias = Literal[
    "id",
    "negation",
    "conflation",
    "combined",
]

KLEIN_FOUR_ELEMENTS: frozenset[KleinFourElement] = frozenset(
    {"id", "negation", "conflation", "combined"}
)

_K4_BITS: Mapping[KleinFourElement, tuple[int, int]] = {
    "id": (0, 0),
    "negation": (1, 0),
    "conflation": (0, 1),
    "combined": (1, 1),
}
_K4_FROM_BITS: Mapping[tuple[int, int], KleinFourElement] = {
    bits: name for name, bits in _K4_BITS.items()
}


def klein_four_product(
    left: KleinFourElement,
    right: KleinFourElement,
) -> KleinFourElement:
    """Return the product in ``K4 = Z/2 × Z/2``.

    The corpus convention for connections writes
    ``A(g ∘ f) = A(g) · A(f)``. Since K4 is abelian the order does not alter
    the value, but keeping the two arguments explicit makes composition
    witnesses read in the same direction as the theory.
    """
    if left not in KLEIN_FOUR_ELEMENTS:
        raise ValueError(f"{left!r} is not a K4 element")
    if right not in KLEIN_FOUR_ELEMENTS:
        raise ValueError(f"{right!r} is not a K4 element")
    left_bits = _K4_BITS[left]
    right_bits = _K4_BITS[right]
    return _K4_FROM_BITS[
        (left_bits[0] ^ right_bits[0], left_bits[1] ^ right_bits[1])
    ]


def klein_four_inverse(element: KleinFourElement) -> KleinFourElement:
    """Return the inverse of a K4 element."""
    if element not in KLEIN_FOUR_ELEMENTS:
        raise ValueError(f"{element!r} is not a K4 element")
    return element


def klein_four_order_profile(element: KleinFourElement) -> KleinFourOrderProfile:
    """Return the truth/knowledge order behavior of a K4 element."""
    if element not in KLEIN_FOUR_ELEMENTS:
        raise ValueError(f"{element!r} is not a K4 element")
    return KleinFourOrderProfile(element)


def klein_four_action_value(
    element: KleinFourElement,
    bilattice: TwistBilattice[T],
    value: tuple[T, T],
) -> tuple[T, T]:
    """Apply a K4 element to one FOUR/twist-product value.

    ``conflation`` and ``combined`` use the boolean complement convention from
    the corpus's FOUR gauge surface, so they require ``base_zero`` and
    ``base_unit`` and values lying in that two-point base.
    """
    if element not in KLEIN_FOUR_ELEMENTS:
        raise ValueError(f"{element!r} is not a K4 element")
    if element == "id":
        return value
    if element == "negation":
        return bilattice.negate(value)
    first, second = value
    if element == "conflation":
        return (
            _boolean_complement(bilattice, second),
            _boolean_complement(bilattice, first),
        )
    return (
        _boolean_complement(bilattice, first),
        _boolean_complement(bilattice, second),
    )


def klein_four_action_fiber(
    fiber: FiberValuation[T],
    element: KleinFourElement,
) -> FiberValuation[T]:
    """Apply a K4 element pointwise to a fiber valuation."""
    cells: dict[tuple[Hashable, Hashable], tuple[T, T]] = {}
    for cell in fiber.dom:
        cells[cell] = klein_four_action_value(
            element,
            fiber.bilattice,
            fiber.get(*cell),
        )
    return FiberValuation(
        bilattice=fiber.bilattice,
        entities=fiber.entities,
        bottom=fiber.bottom,
        cells=cells,
        dom=fiber.dom,
    )


def _boolean_complement(bilattice: TwistBilattice[T], value: T) -> T:
    zero = bilattice.base_zero
    unit = bilattice.base_unit
    if zero is None or unit is None:
        raise ValueError("conflation requires a bounded boolean base")
    if value == zero:
        return unit
    if value == unit:
        return zero
    raise ValueError(
        "conflation is currently implemented on the FOUR/boolean gauge surface"
    )


@dataclass(frozen=True)
class KleinFourOrderProfile:
    """Truth/knowledge order behavior of a K4 gauge value."""

    element: KleinFourElement

    @property
    def preserves_truth_order(self) -> bool:
        return self.element in {"id", "conflation"}

    @property
    def reverses_truth_order(self) -> bool:
        return self.element in {"negation", "combined"}

    @property
    def preserves_knowledge_order(self) -> bool:
        return self.element in {"id", "negation"}

    @property
    def reverses_knowledge_order(self) -> bool:
        return self.element in {"conflation", "combined"}

    @property
    def fixes_knowledge_bottom(self) -> bool:
        return self.element in {"id", "negation"}

    def graded_operation(self, operation: str) -> str:
        """Return the lattice operation symbol after K4 grading."""
        if operation not in {
            "truth_join",
            "truth_meet",
            "knowledge_join",
            "knowledge_meet",
        }:
            raise ValueError(f"{operation!r} is not a graded lattice operation")
        if self.reverses_truth_order and operation == "truth_join":
            return "truth_meet"
        if self.reverses_truth_order and operation == "truth_meet":
            return "truth_join"
        if self.reverses_knowledge_order and operation == "knowledge_join":
            return "knowledge_meet"
        if self.reverses_knowledge_order and operation == "knowledge_meet":
            return "knowledge_join"
        return operation


@dataclass(frozen=True)
class GaugeIdentityLawCheck:
    """Finite check of ``A(id_q) = e`` for one predicate identity."""

    identity: PredicateIdentity
    value: KleinFourElement

    @property
    def holds(self) -> bool:
        return self.value == "id"


@dataclass(frozen=True)
class GaugeCompositionLawCheck:
    """Finite check of ``A(g ∘ f) = A(g) · A(f)``."""

    f: PredicateMorphism
    g: PredicateMorphism
    composite: PredicateMorphism
    composite_value: KleinFourElement
    product_value: KleinFourElement

    @property
    def holds(self) -> bool:
        return self.composite_value == self.product_value


@realizes("objects/gauge-connection")
@realizes("theorems/flat-connections-classified-by-h1")
@dataclass(frozen=True)
class FlatGaugeConnectionWitness:
    """Finite flat ``K4`` connection witness on a predicate category.

    This is the SDK-facing fragment of the corpus statement that flat gauge
    connections are normalized K4-valued 1-cocycles on the nerve of ``C``.
    ``morphisms`` is the generated PredCat fragment being checked, and
    ``composition_checks`` includes exactly the composable triples whose
    composite is also in that finite fragment.
    """

    category: PredicateCategory
    values: Mapping[PredicateMorphism, KleinFourElement]
    morphisms: tuple[PredicateMorphism, ...]
    max_depth: int
    identity_checks: tuple[GaugeIdentityLawCheck, ...]
    composition_checks: tuple[GaugeCompositionLawCheck, ...]

    def value(self, morphism: PredicateMorphism) -> KleinFourElement:
        try:
            return self.values[morphism]
        except KeyError as exc:
            raise KeyError(
                f"{morphism!r} is not in this finite connection fragment"
            ) from exc

    @property
    def identities_hold(self) -> bool:
        return all(check.holds for check in self.identity_checks)

    @property
    def cocycle_holds(self) -> bool:
        return all(check.holds for check in self.composition_checks)

    @property
    def holds(self) -> bool:
        return self.identities_hold and self.cocycle_holds

    @property
    def h1_class_signature(self) -> tuple[tuple[str, KleinFourElement], ...]:
        """Deterministic finite 1-cocycle signature for SDK comparison."""
        return tuple(
            (repr(morphism), self.values[morphism])
            for morphism in sorted(self.morphisms, key=repr)
            if not morphism.is_identity()
        )

    def holonomy(
        self,
        loop: Sequence[PredicateMorphism],
    ) -> KleinFourElement:
        """Return the K4 holonomy around a finite closed PredCat loop."""
        if not loop:
            return "id"
        for morphism in loop:
            if morphism not in self.values:
                raise KeyError(
                    f"{morphism!r} is not in this finite connection fragment"
                )
        for left, right in zip(loop, loop[1:], strict=False):
            if left.target != right.source:
                raise ValueError("holonomy path is not composable")
        if loop[-1].target != loop[0].source:
            raise ValueError("holonomy path is not closed")
        total: KleinFourElement = "id"
        for morphism in loop:
            total = klein_four_product(self.values[morphism], total)
        return total

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class GaugeCoboundaryLawCheck:
    """Finite check of ``A'(f)=eta(tgt)·A(f)·eta(src)^-1``."""

    morphism: PredicateMorphism
    source_value: KleinFourElement
    target_value: KleinFourElement
    coboundary_value: KleinFourElement

    @property
    def holds(self) -> bool:
        return self.target_value == self.coboundary_value


@realizes("theorems/flat-connections-classified-by-h1")
@dataclass(frozen=True)
class GaugeCoboundaryWitness:
    """Finite 0-cochain witness relating two K4 connections."""

    source: FlatGaugeConnectionWitness
    target: FlatGaugeConnectionWitness
    eta: Mapping[Hashable, KleinFourElement]
    checks: tuple[GaugeCoboundaryLawCheck, ...]

    @property
    def same_fragment(self) -> bool:
        return self.source.morphisms == self.target.morphisms

    @property
    def holds(self) -> bool:
        return self.same_fragment and all(check.holds for check in self.checks)

    def __bool__(self) -> bool:
        return self.holds


@dataclass(frozen=True)
class GaugeTwistedReindexingCheck(Generic[T]):
    """One finite check for the K4-graded twisted reindexing law."""

    law: str
    morphism: PredicateMorphism
    gauge_value: KleinFourElement
    operation: str
    observed: FiberValuation[T]
    expected: FiberValuation[T]

    @property
    def holds(self) -> bool:
        return self.observed == self.expected


@realizes("morphisms/gauge-twisted-reindexing")
@realizes("theorems/gauge-twisted-reindexing-graded-homomorphism")
@dataclass(frozen=True)
class GaugeTwistedReindexingWitness(Generic[T]):
    """Finite witness for ``f_A^* = A(f) . f^*``.

    The witness deliberately separates the bilattice fragment from the
    residuated fragment. K4 grades the four lattice operations and commutes
    with the two involutions, while fusion and residual preservation are only
    strict when the gauge value is the identity.
    """

    fibration: PredicationFibration[T]
    connection: FlatGaugeConnectionWitness
    morphism: PredicateMorphism
    gauge_value: KleinFourElement
    left: FiberValuation[T]
    right: FiberValuation[T]
    left_output: FiberValuation[T]
    right_output: FiberValuation[T]
    checks: tuple[GaugeTwistedReindexingCheck[T], ...]

    @property
    def order_profile(self) -> KleinFourOrderProfile:
        return klein_four_order_profile(self.gauge_value)

    @property
    def lattice_fragment_holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def fixes_knowledge_bottom(self) -> bool:
        return self.order_profile.fixes_knowledge_bottom

    @property
    def strict_residuated_fragment_preserved(self) -> bool:
        return self.gauge_value == "id"

    @property
    def failures(self) -> tuple[GaugeTwistedReindexingCheck[T], ...]:
        return tuple(check for check in self.checks if not check.holds)

    @property
    def holds(self) -> bool:
        return self.lattice_fragment_holds

    def __bool__(self) -> bool:
        return self.holds


def flat_gauge_connection_witness(
    category: PredicateCategory,
    assignments: Mapping[PredicateMorphism, KleinFourElement] | None = None,
    *,
    max_depth: int = 2,
) -> FlatGaugeConnectionWitness:
    """Build the finite flat K4 connection witness on generated morphisms."""
    morphisms = category.generated_morphisms(max_depth=max_depth)
    values: dict[PredicateMorphism, KleinFourElement] = {
        morphism: "id" for morphism in morphisms
    }
    fragment = frozenset(morphisms)
    if assignments:
        for morphism, element in assignments.items():
            if morphism not in fragment:
                raise ValueError(
                    f"{morphism!r} is not in generated morphisms at max_depth="
                    f"{max_depth}"
                )
            if element not in KLEIN_FOUR_ELEMENTS:
                raise ValueError(f"{element!r} is not a K4 element")
            values[morphism] = element

    identity_checks = tuple(
        GaugeIdentityLawCheck(morphism, values[morphism])
        for morphism in morphisms
        if isinstance(morphism, PredicateIdentity)
    )
    composition_checks = _composition_law_checks(category, morphisms, values)
    return FlatGaugeConnectionWitness(
        category=category,
        values=values,
        morphisms=morphisms,
        max_depth=max_depth,
        identity_checks=identity_checks,
        composition_checks=composition_checks,
    )


def gauge_coboundary_witness(
    source: FlatGaugeConnectionWitness,
    target: FlatGaugeConnectionWitness,
    eta: Mapping[Hashable, KleinFourElement],
) -> GaugeCoboundaryWitness:
    """Check finite gauge equivalence between two K4 connection witnesses."""
    predicates = tuple(source.category.predicates)
    if target.category != source.category:
        raise ValueError("gauge coboundary requires the same predicate category")
    if source.morphisms != target.morphisms:
        raise ValueError("gauge coboundary requires the same generated fragment")
    for predicate in predicates:
        if predicate not in eta:
            raise ValueError(f"eta missing object {predicate!r}")
        if eta[predicate] not in KLEIN_FOUR_ELEMENTS:
            raise ValueError(f"{eta[predicate]!r} is not a K4 element")

    checks: list[GaugeCoboundaryLawCheck] = []
    for morphism in source.morphisms:
        source_value = source.value(morphism)
        coboundary_value = klein_four_product(
            eta[morphism.target],
            klein_four_product(
                source_value,
                klein_four_inverse(eta[morphism.source]),
            ),
        )
        checks.append(
            GaugeCoboundaryLawCheck(
                morphism=morphism,
                source_value=source_value,
                target_value=target.value(morphism),
                coboundary_value=coboundary_value,
            )
        )
    return GaugeCoboundaryWitness(
        source=source,
        target=target,
        eta=dict(eta),
        checks=tuple(checks),
    )


def gauge_twisted_reindexing(
    fibration: PredicationFibration[T],
    connection: FlatGaugeConnectionWitness,
    morphism: PredicateMorphism,
    fiber: FiberValuation[T],
) -> FiberValuation[T]:
    """Apply ``f_A^* = A(f) . f^*`` to one fiber valuation."""
    _require_connection_over_fibration(fibration, connection)
    gauge_value = connection.value(morphism)
    return klein_four_action_fiber(
        fibration.f_star(morphism, fiber),
        gauge_value,
    )


def gauge_twisted_reindexing_witness(
    fibration: PredicationFibration[T],
    connection: FlatGaugeConnectionWitness,
    morphism: PredicateMorphism,
    left: FiberValuation[T],
    right: FiberValuation[T],
) -> GaugeTwistedReindexingWitness[T]:
    """Check the finite graded bilattice laws for one twisted reindexing."""
    _require_connection_over_fibration(fibration, connection)
    expected_dom = fibration.dom(morphism.target)
    if left.dom != expected_dom or right.dom != expected_dom:
        raise ValueError("twisted reindexing samples must live over dom(target)")
    left._require_compat(right)

    gauge_value = connection.value(morphism)
    profile = klein_four_order_profile(gauge_value)
    left_output = gauge_twisted_reindexing(
        fibration,
        connection,
        morphism,
        left,
    )
    right_output = gauge_twisted_reindexing(
        fibration,
        connection,
        morphism,
        right,
    )
    checks: list[GaugeTwistedReindexingCheck[T]] = []
    for operation in (
        "truth_join",
        "truth_meet",
        "knowledge_join",
        "knowledge_meet",
    ):
        graded = profile.graded_operation(operation)
        checks.append(
            GaugeTwistedReindexingCheck(
                law="graded-lattice",
                morphism=morphism,
                gauge_value=gauge_value,
                operation=operation,
                observed=gauge_twisted_reindexing(
                    fibration,
                    connection,
                    morphism,
                    _fiber_operation(operation, left, right),
                ),
                expected=_fiber_operation(graded, left_output, right_output),
            )
        )

    checks.append(
        GaugeTwistedReindexingCheck(
            law="strict-involution",
            morphism=morphism,
            gauge_value=gauge_value,
            operation="negation",
            observed=gauge_twisted_reindexing(
                fibration,
                connection,
                morphism,
                left.negate(),
            ),
            expected=left_output.negate(),
        )
    )
    checks.append(
        GaugeTwistedReindexingCheck(
            law="strict-involution",
            morphism=morphism,
            gauge_value=gauge_value,
            operation="conflation",
            observed=gauge_twisted_reindexing(
                fibration,
                connection,
                morphism,
                klein_four_action_fiber(left, "conflation"),
            ),
            expected=klein_four_action_fiber(left_output, "conflation"),
        )
    )
    return GaugeTwistedReindexingWitness(
        fibration=fibration,
        connection=connection,
        morphism=morphism,
        gauge_value=gauge_value,
        left=left,
        right=right,
        left_output=left_output,
        right_output=right_output,
        checks=tuple(checks),
    )


def _require_connection_over_fibration(
    fibration: PredicationFibration[T],
    connection: FlatGaugeConnectionWitness,
) -> None:
    if connection.category != fibration.category:
        raise ValueError("gauge connection must be over the fibration category")


def _fiber_operation(
    operation: str,
    left: FiberValuation[T],
    right: FiberValuation[T],
) -> FiberValuation[T]:
    if operation == "truth_join":
        return left.truth_join(right)
    if operation == "truth_meet":
        return left.truth_meet(right)
    if operation == "knowledge_join":
        return left.knowledge_join(right)
    if operation == "knowledge_meet":
        return left.knowledge_meet(right)
    raise ValueError(f"{operation!r} is not a supported fiber operation")


def _composition_law_checks(
    category: PredicateCategory,
    morphisms: tuple[PredicateMorphism, ...],
    values: Mapping[PredicateMorphism, KleinFourElement],
) -> tuple[GaugeCompositionLawCheck, ...]:
    fragment = frozenset(morphisms)
    checks: list[GaugeCompositionLawCheck] = []
    for f in morphisms:
        for g in morphisms:
            if f.target != g.source:
                continue
            composite = category.compose(g, f)
            if composite not in fragment:
                continue
            checks.append(
                GaugeCompositionLawCheck(
                    f=f,
                    g=g,
                    composite=composite,
                    composite_value=values[composite],
                    product_value=klein_four_product(values[g], values[f]),
                )
            )
    return tuple(checks)


__all__ = [
    "FlatGaugeConnectionWitness",
    "GaugeCoboundaryLawCheck",
    "GaugeCoboundaryWitness",
    "GaugeCompositionLawCheck",
    "GaugeIdentityLawCheck",
    "GaugeTwistedReindexingCheck",
    "GaugeTwistedReindexingWitness",
    "KLEIN_FOUR_ELEMENTS",
    "KleinFourElement",
    "flat_gauge_connection_witness",
    "gauge_twisted_reindexing",
    "gauge_twisted_reindexing_witness",
    "gauge_coboundary_witness",
    "klein_four_action_fiber",
    "klein_four_action_value",
    "klein_four_inverse",
    "klein_four_order_profile",
    "klein_four_product",
]
