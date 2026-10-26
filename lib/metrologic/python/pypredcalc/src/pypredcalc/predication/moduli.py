"""Finite coarse-settling moduli witnesses.

The corpus coarse moduli ``|KP^vis(B)|`` is the set of MLD-components of
the visible settling fiber groupoid. This module supplies the finite
SDK-facing surface: given a finite family of captured settlings over a
common base, group them by the settling-associated sheaf isomorphism
signature used by the moduli classifying function.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Mapping
from dataclasses import dataclass
from itertools import permutations
from typing import Generic, TypeVar

from .._realizes import realizes
from .predicate_category import (
    PredicateConverse,
    PredicateMorphism,
    PredicateObjectProjection,
    PredicateSpecialization,
    PredicateSubjectProjection,
)
from .settling import PredicationSettling
from .settling_sheaf import (
    BigradedSettlingCohomologyWitness,
    PredicatedCell,
    SettlingH1Witness,
    StagedPredicatedCell,
    bigraded_settling_cohomology,
    finite_settling_h0,
    finite_settling_h1_witness,
    settling_associated_sheaf,
)

T = TypeVar("T", bound=Hashable)


@realizes("morphisms/moduli-classifying-function")
@dataclass(frozen=True)
class SettlingSheafIsoSignature:
    """Finite sheaf-isomorphism signature used by ``I_B``.

    The full target is a sheaf-isomorphism class. On a finite captured
    prefix, the free abelian stalks are classified by ranks, so the
    signature records rank sequences for every predicate plus the regime
    stratum available from the settling.
    """

    theory_regime: str | None
    predicate_stage_ranks: tuple[tuple[object, tuple[int, ...]], ...]
    total_rank: int


@realizes("morphisms/combined-cohomology-classifying-morphism")
@dataclass(frozen=True)
class CombinedCohomologySignature(Generic[T]):
    """Finite ``H^0 ⊕ H^1`` classifying signature for one settling.

    The corpus morphism sends a moduli point to the degree-zero settling
    support together with the finite H1 classifying invariant available from
    supplied non-Scott firing representatives. This signature keeps those
    summands separate so regime-stratified callers do not collapse
    finite/Scott and transfinite/aperiodic data into one rank.
    """

    theory_regime: str | None
    h0_basis: tuple[PredicatedCell, ...]
    h0_rank: int
    h1_generators: tuple[StagedPredicatedCell, ...]
    h1_rank: int
    h1_classifying_invariant: tuple[tuple[StagedPredicatedCell, int], ...]
    h1_holds: bool
    bigraded_h0: BigradedSettlingCohomologyWitness[T]

    @property
    def h0_plus_h1_rank(self) -> int:
        return self.h0_rank + self.h1_rank

    @property
    def holds(self) -> bool:
        return self.h1_holds


@dataclass(frozen=True)
class CoarseSettlingModuliPoint:
    """One observed component in a finite coarse-moduli approximation."""

    label: int
    member_indices: tuple[int, ...]
    sheaf_signature: SettlingSheafIsoSignature

    @property
    def is_singleton(self) -> bool:
        return len(self.member_indices) == 1


@realizes("concepts/orbifold-moduli-point")
@realizes("concepts/rigid-moduli-point")
@dataclass(frozen=True)
class CoarseModuliPointStratum:
    """Rigid/orbifold substratum witness for one coarse moduli point."""

    point: CoarseSettlingModuliPoint
    representative_index: int
    visible_sources: tuple[str, ...]

    @property
    def is_rigid(self) -> bool:
        return not self.visible_sources

    @property
    def is_orbifold(self) -> bool:
        return bool(self.visible_sources)


@realizes("concepts/invisible-automorphism-subgroup")
@realizes("concepts/visible-automorphism-quotient")
@dataclass(frozen=True)
class AutomorphismStrataWitness:
    """Finite visible quotient / invisible subgroup source summary."""

    visible_sources: tuple[str, ...]
    invisible_sources: tuple[str, ...]

    @property
    def has_visible_quotient(self) -> bool:
        return bool(self.visible_sources)

    @property
    def has_invisible_subgroup(self) -> bool:
        return bool(self.invisible_sources)


@dataclass(frozen=True)
class AutomorphismH1ActionCheck:
    """Action of one stabilizing automorphism source on supplied H1 generators."""

    source: str
    automorphism: object
    images: tuple[tuple[StagedPredicatedCell, StagedPredicatedCell], ...]

    @property
    def preserves_generators(self) -> bool:
        generators = frozenset(source for source, _image in self.images)
        return all(image in generators for _source, image in self.images)

    @property
    def moved_generators(self) -> frozenset[StagedPredicatedCell]:
        return frozenset(
            source for source, image in self.images if source != image
        )

    @property
    def acts_nontrivially_on_h1(self) -> bool:
        return self.preserves_generators and bool(self.moved_generators)


@realizes("theorems/equivariant-settling-cohomology")
@realizes("theorems/settling-automorphism-decomposition")
@dataclass(frozen=True)
class AutomorphismH1ActionWitness:
    """Finite stabilizer action on a supplied H1 generator basis."""

    h1_witness: SettlingH1Witness
    checks: tuple[AutomorphismH1ActionCheck, ...]

    @property
    def preserves_h1_basis(self) -> bool:
        return all(check.preserves_generators for check in self.checks)

    @property
    def visible_sources(self) -> tuple[str, ...]:
        return _unique_sources(
            check.source
            for check in self.checks
            if check.acts_nontrivially_on_h1
        )

    @property
    def invisible_sources(self) -> tuple[str, ...]:
        return _unique_sources(
            check.source
            for check in self.checks
            if check.preserves_generators and not check.acts_nontrivially_on_h1
        )

    @property
    def holds(self) -> bool:
        return self.h1_witness.holds and self.preserves_h1_basis

    def __bool__(self) -> bool:
        return self.holds


@realizes("objects/coarse-settling-moduli")
@dataclass(frozen=True)
class CoarseSettlingModuli(Generic[T]):
    """Observed finite component set for settlings over a common base."""

    settlings: tuple[PredicationSettling[T], ...]

    def __post_init__(self) -> None:
        if not self.settlings:
            raise ValueError("coarse moduli requires at least one settling")
        first = self._base_fingerprint(self.settlings[0])
        for settling in self.settlings[1:]:
            if self._base_fingerprint(settling) != first:
                raise ValueError("all settlings must live over the same base")

    def sheaf_signature(
        self, settling: PredicationSettling[T]
    ) -> SettlingSheafIsoSignature:
        sheaf = settling_associated_sheaf(settling)
        predicate_ranks = tuple(
            (predicate, sheaf.stage_ranks(predicate))
            for predicate in settling.hyperdoctrine.predicates()
        )
        return SettlingSheafIsoSignature(
            theory_regime=settling.theory_regime,
            predicate_stage_ranks=predicate_ranks,
            total_rank=sheaf.total_rank(),
        )

    def components(self) -> tuple[CoarseSettlingModuliPoint, ...]:
        groups: dict[SettlingSheafIsoSignature, list[int]] = {}
        for index, settling in enumerate(self.settlings):
            groups.setdefault(self.sheaf_signature(settling), []).append(index)
        return tuple(
            CoarseSettlingModuliPoint(
                label=label,
                member_indices=tuple(indices),
                sheaf_signature=signature,
            )
            for label, (signature, indices) in enumerate(groups.items())
        )

    def classifying_function(self) -> Mapping[int, SettlingSheafIsoSignature]:
        """Finite version of ``I_B : |KP^vis(B)| -> {sheaf iso classes}``."""
        return {
            point.label: point.sheaf_signature
            for point in self.components()
        }

    def combined_classifying_function(
        self,
        h1_generators_by_index: Mapping[
            int, Iterable[StagedPredicatedCell]
        ] | None = None,
    ) -> Mapping[int, CombinedCohomologySignature[T]]:
        """Finite ``H^0 ⊕ H^1`` classifier on observed moduli points."""
        generators_by_index = h1_generators_by_index or {}
        return {
            point.label: combined_cohomology_signature(
                self.settlings[point.member_indices[0]],
                h1_generators=generators_by_index.get(
                    point.member_indices[0],
                    (),
                ),
            )
            for point in self.components()
        }

    def point_stratum(
        self,
        point: CoarseSettlingModuliPoint,
    ) -> CoarseModuliPointStratum:
        """Classify an observed moduli point as rigid or orbifold."""
        representative_index = point.member_indices[0]
        representative = self.settlings[representative_index]
        return CoarseModuliPointStratum(
            point=point,
            representative_index=representative_index,
            visible_sources=_visible_source_names(representative),
        )

    def strata(self) -> tuple[CoarseModuliPointStratum, ...]:
        return tuple(self.point_stratum(point) for point in self.components())

    @staticmethod
    def _base_fingerprint(settling: PredicationSettling[T]) -> tuple[object, ...]:
        category = settling.hyperdoctrine.category
        domains = tuple(
            (predicate, tuple(sorted(category.dom_of(predicate), key=repr)))
            for predicate in category.predicates
        )
        return (
            tuple(category.entities),
            tuple(category.predicates),
            domains,
            settling.bound,
            settling.hyperdoctrine.bilattice,
        )


@realizes("theorems/visible-automorphism-sources")
@dataclass(frozen=True)
class EntityPermutationAutomorphismWitness(Generic[T]):
    """Finite entity-permutation contribution to visible automorphisms."""

    settling: PredicationSettling[T]
    permutation: Mapping[Hashable, Hashable]

    @property
    def is_permutation(self) -> bool:
        entities = frozenset(self.settling.hyperdoctrine.category.entities)
        return (
            frozenset(self.permutation.keys()) == entities
            and frozenset(self.permutation.values()) == entities
        )

    @property
    def stabilizes_settling(self) -> bool:
        if not self.is_permutation:
            return False
        category = self.settling.hyperdoctrine.category
        for predicate in category.predicates:
            dom = category.dom_of(predicate)
            if _permute_cells(dom, self.permutation) != dom:
                return False
        for stage in self.settling.trajectory:
            for predicate in category.predicates:
                fiber = stage[predicate]
                for cell in fiber.dom:
                    image = _permute_cell(cell, self.permutation)
                    if fiber.get(*cell) != fiber.get(*image):
                        return False
        return True

    @property
    def moved_new_cells(self) -> frozenset[
        tuple[Hashable, int, tuple[Hashable, Hashable]]
    ]:
        if not self.stabilizes_settling:
            return frozenset()
        sheaf = settling_associated_sheaf(self.settling)
        moved: set[tuple[Hashable, int, tuple[Hashable, Hashable]]] = set()
        for predicate in self.settling.hyperdoctrine.predicates():
            for stage in range(len(self.settling.trajectory)):
                for cell in sheaf.delta_plus(predicate, stage):
                    if _permute_cell(cell, self.permutation) != cell:
                        moved.add((predicate, stage, cell))
        return frozenset(moved)

    @property
    def acts_nontrivially_on_sheaf(self) -> bool:
        return bool(self.moved_new_cells)

    @property
    def contributes_to_visible_quotient(self) -> bool:
        return self.stabilizes_settling and self.acts_nontrivially_on_sheaf

    @property
    def contributes_to_invisible_subgroup(self) -> bool:
        return self.stabilizes_settling and not self.acts_nontrivially_on_sheaf


@realizes("theorems/visible-automorphism-sources")
@dataclass(frozen=True)
class FiberSwapAutomorphismWitness(Generic[T]):
    """Finite fiber-swap contribution ``(s, o) -> (o, s)``."""

    settling: PredicationSettling[T]

    @property
    def stabilizes_settling(self) -> bool:
        category = self.settling.hyperdoctrine.category
        for predicate in category.predicates:
            dom = category.dom_of(predicate)
            if _swap_cells(dom) != dom:
                return False
        for stage in self.settling.trajectory:
            for predicate in category.predicates:
                fiber = stage[predicate]
                for cell in fiber.dom:
                    image = _swap_cell(cell)
                    if fiber.get(*cell) != fiber.get(*image):
                        return False
        return True

    @property
    def moved_new_cells(self) -> frozenset[
        tuple[Hashable, int, tuple[Hashable, Hashable]]
    ]:
        if not self.stabilizes_settling:
            return frozenset()
        sheaf = settling_associated_sheaf(self.settling)
        moved: set[tuple[Hashable, int, tuple[Hashable, Hashable]]] = set()
        for predicate in self.settling.hyperdoctrine.predicates():
            for stage in range(len(self.settling.trajectory)):
                for cell in sheaf.delta_plus(predicate, stage):
                    if _swap_cell(cell) != cell:
                        moved.add((predicate, stage, cell))
        return frozenset(moved)

    @property
    def acts_nontrivially_on_sheaf(self) -> bool:
        return bool(self.moved_new_cells)

    @property
    def contributes_to_visible_quotient(self) -> bool:
        return self.stabilizes_settling and self.acts_nontrivially_on_sheaf

    @property
    def contributes_to_invisible_subgroup(self) -> bool:
        return self.stabilizes_settling and not self.acts_nontrivially_on_sheaf


@realizes("theorems/visible-automorphism-sources")
@dataclass(frozen=True)
class PredicateAutomorphismWitness(Generic[T]):
    """Finite predicate-label automorphism contribution."""

    settling: PredicationSettling[T]
    permutation: Mapping[Hashable, Hashable]

    @property
    def is_permutation(self) -> bool:
        predicates = frozenset(self.settling.hyperdoctrine.category.predicates)
        return (
            frozenset(self.permutation.keys()) == predicates
            and frozenset(self.permutation.values()) == predicates
        )

    @property
    def preserves_domains(self) -> bool:
        if not self.is_permutation:
            return False
        category = self.settling.hyperdoctrine.category
        return all(
            category.dom_of(predicate) == category.dom_of(self.permutation[predicate])
            for predicate in category.predicates
        )

    @property
    def preserves_generators(self) -> bool:
        if not self.is_permutation:
            return False
        generators = self.settling.hyperdoctrine.category.generators
        signatures = frozenset(_morphism_signature(generator) for generator in generators)
        relabeled = frozenset(
            _relabel_morphism_signature(generator, self.permutation)
            for generator in generators
        )
        return relabeled == signatures

    @property
    def stabilizes_settling(self) -> bool:
        if not self.preserves_domains or not self.preserves_generators:
            return False
        category = self.settling.hyperdoctrine.category
        for stage in self.settling.trajectory:
            for predicate in category.predicates:
                if stage[predicate] != stage[self.permutation[predicate]]:
                    return False
        return True

    @property
    def moved_new_cells(self) -> frozenset[
        tuple[Hashable, int, tuple[Hashable, Hashable]]
    ]:
        if not self.stabilizes_settling:
            return frozenset()
        sheaf = settling_associated_sheaf(self.settling)
        moved: set[tuple[Hashable, int, tuple[Hashable, Hashable]]] = set()
        for predicate in self.settling.hyperdoctrine.predicates():
            image_predicate = self.permutation[predicate]
            if image_predicate == predicate:
                continue
            for stage in range(len(self.settling.trajectory)):
                for cell in sheaf.delta_plus(predicate, stage):
                    moved.add((predicate, stage, cell))
        return frozenset(moved)

    @property
    def acts_nontrivially_on_sheaf(self) -> bool:
        return bool(self.moved_new_cells)

    @property
    def contributes_to_visible_quotient(self) -> bool:
        return self.stabilizes_settling and self.acts_nontrivially_on_sheaf

    @property
    def contributes_to_invisible_subgroup(self) -> bool:
        return self.stabilizes_settling and not self.acts_nontrivially_on_sheaf


@realizes("concepts/internal-z2-gauge")
@realizes("theorems/visible-automorphism-sources")
@dataclass(frozen=True)
class NegationGaugeAutomorphismWitness(Generic[T]):
    """Intrinsic ``Z/2`` negation gauge witness for one settling.

    The gauge may or may not stabilize the settling values. When it does,
    it is still invisible for the basic settling-associated sheaf because
    negation fixes cell positions.
    """

    settling: PredicationSettling[T]

    @property
    def stabilizes_settling(self) -> bool:
        for stage in self.settling.trajectory:
            for predicate in self.settling.hyperdoctrine.predicates():
                fiber = stage[predicate]
                if fiber.negate() != fiber:
                    return False
        return True

    @property
    def moved_new_cells(self) -> frozenset[
        tuple[Hashable, int, tuple[Hashable, Hashable]]
    ]:
        return frozenset()

    @property
    def acts_nontrivially_on_sheaf(self) -> bool:
        return False

    @property
    def contributes_to_visible_quotient(self) -> bool:
        return False

    @property
    def contributes_to_invisible_subgroup(self) -> bool:
        return self.stabilizes_settling


def coarse_settling_moduli(
    *settlings: PredicationSettling[T],
) -> CoarseSettlingModuli[T]:
    return CoarseSettlingModuli(tuple(settlings))


def combined_cohomology_signature(
    settling: PredicationSettling[T],
    *,
    h1_generators: Iterable[StagedPredicatedCell] = (),
) -> CombinedCohomologySignature[T]:
    """Return the finite ``H^0 ⊕ H^1`` classifying signature."""
    sheaf = settling_associated_sheaf(settling)
    h0 = finite_settling_h0(sheaf, variant="truth")
    h1 = finite_settling_h1_witness(
        sheaf,
        h1_generators,
        variant="truth",
    )
    return CombinedCohomologySignature(
        theory_regime=settling.theory_regime,
        h0_basis=tuple(sorted(h0.basis, key=repr)),
        h0_rank=h0.rank,
        h1_generators=tuple(sorted(h1.generator_basis, key=repr)),
        h1_rank=h1.rank,
        h1_classifying_invariant=tuple(
            sorted(h1.classifying_invariant.items(), key=repr)
        ),
        h1_holds=h1.holds,
        bigraded_h0=bigraded_settling_cohomology(settling),
    )


def entity_permutation_automorphism_witness(
    settling: PredicationSettling[T],
    permutation: Mapping[Hashable, Hashable],
) -> EntityPermutationAutomorphismWitness[T]:
    return EntityPermutationAutomorphismWitness(settling, dict(permutation))


def visible_entity_permutation_automorphisms(
    settling: PredicationSettling[T],
) -> tuple[EntityPermutationAutomorphismWitness[T], ...]:
    """Enumerate finite entity permutations that visibly stabilize a settling."""
    entities = tuple(settling.hyperdoctrine.category.entities)
    witnesses: list[EntityPermutationAutomorphismWitness[T]] = []
    for image in permutations(entities):
        permutation = dict(zip(entities, image, strict=True))
        witness = entity_permutation_automorphism_witness(
            settling,
            permutation,
        )
        if witness.contributes_to_visible_quotient:
            witnesses.append(witness)
    return tuple(witnesses)


def invisible_entity_permutation_automorphisms(
    settling: PredicationSettling[T],
) -> tuple[EntityPermutationAutomorphismWitness[T], ...]:
    """Enumerate finite entity permutations in the invisible subgroup."""
    entities = tuple(settling.hyperdoctrine.category.entities)
    witnesses: list[EntityPermutationAutomorphismWitness[T]] = []
    for image in permutations(entities):
        permutation = dict(zip(entities, image, strict=True))
        witness = entity_permutation_automorphism_witness(
            settling,
            permutation,
        )
        if witness.contributes_to_invisible_subgroup:
            witnesses.append(witness)
    return tuple(witnesses)


def visible_predicate_automorphisms(
    settling: PredicationSettling[T],
) -> tuple[PredicateAutomorphismWitness[T], ...]:
    """Enumerate finite predicate permutations that visibly stabilize a settling."""
    predicates = tuple(settling.hyperdoctrine.category.predicates)
    witnesses: list[PredicateAutomorphismWitness[T]] = []
    for image in permutations(predicates):
        permutation = dict(zip(predicates, image, strict=True))
        witness = predicate_automorphism_witness(settling, permutation)
        if witness.contributes_to_visible_quotient:
            witnesses.append(witness)
    return tuple(witnesses)


def invisible_predicate_automorphisms(
    settling: PredicationSettling[T],
) -> tuple[PredicateAutomorphismWitness[T], ...]:
    """Enumerate finite predicate permutations in the invisible subgroup."""
    predicates = tuple(settling.hyperdoctrine.category.predicates)
    witnesses: list[PredicateAutomorphismWitness[T]] = []
    for image in permutations(predicates):
        permutation = dict(zip(predicates, image, strict=True))
        witness = predicate_automorphism_witness(settling, permutation)
        if witness.contributes_to_invisible_subgroup:
            witnesses.append(witness)
    return tuple(witnesses)


def fiber_swap_automorphism_witness(
    settling: PredicationSettling[T],
) -> FiberSwapAutomorphismWitness[T]:
    return FiberSwapAutomorphismWitness(settling)


def predicate_automorphism_witness(
    settling: PredicationSettling[T],
    permutation: Mapping[Hashable, Hashable],
) -> PredicateAutomorphismWitness[T]:
    return PredicateAutomorphismWitness(settling, dict(permutation))


def negation_gauge_automorphism_witness(
    settling: PredicationSettling[T],
) -> NegationGaugeAutomorphismWitness[T]:
    return NegationGaugeAutomorphismWitness(settling)


def automorphism_strata_witness(
    settling: PredicationSettling[T],
) -> AutomorphismStrataWitness:
    """Summarize finite automorphism sources by visible/invisible action."""
    visible: list[str] = []
    invisible: list[str] = []

    fiber_swap = fiber_swap_automorphism_witness(settling)
    if fiber_swap.contributes_to_visible_quotient:
        visible.append("fiber_swap")
    if fiber_swap.contributes_to_invisible_subgroup:
        invisible.append("fiber_swap")

    if visible_entity_permutation_automorphisms(settling):
        visible.append("entity_permutation")
    if invisible_entity_permutation_automorphisms(settling):
        invisible.append("entity_permutation")

    if visible_predicate_automorphisms(settling):
        visible.append("predicate_automorphism")
    if invisible_predicate_automorphisms(settling):
        invisible.append("predicate_automorphism")

    gauge = negation_gauge_automorphism_witness(settling)
    if gauge.contributes_to_invisible_subgroup:
        invisible.append("negation_gauge")

    return AutomorphismStrataWitness(
        visible_sources=tuple(visible),
        invisible_sources=tuple(invisible),
    )


def automorphism_h1_action_witness(
    settling: PredicationSettling[T],
    h1_witness: SettlingH1Witness,
) -> AutomorphismH1ActionWitness:
    """Inspect stabilizer actions on supplied finite H1 generators."""
    checks: list[AutomorphismH1ActionCheck] = []
    generators = tuple(sorted(h1_witness.generator_basis, key=repr))

    for entity_witness in (
        *visible_entity_permutation_automorphisms(settling),
        *invisible_entity_permutation_automorphisms(settling),
    ):
        checks.append(
            AutomorphismH1ActionCheck(
                source="entity_permutation",
                automorphism=entity_witness,
                images=tuple(
                    (
                        generator,
                        _image_entity_generator(
                            generator,
                            entity_witness.permutation,
                        ),
                    )
                    for generator in generators
                ),
            )
        )

    fiber_swap = fiber_swap_automorphism_witness(settling)
    if fiber_swap.stabilizes_settling:
        checks.append(
            AutomorphismH1ActionCheck(
                source="fiber_swap",
                automorphism=fiber_swap,
                images=tuple(
                    (generator, _image_fiber_swap_generator(generator))
                    for generator in generators
                ),
            )
        )

    for predicate_witness in (
        *visible_predicate_automorphisms(settling),
        *invisible_predicate_automorphisms(settling),
    ):
        checks.append(
            AutomorphismH1ActionCheck(
                source="predicate_automorphism",
                automorphism=predicate_witness,
                images=tuple(
                    (
                        generator,
                        _image_predicate_generator(
                            generator,
                            predicate_witness.permutation,
                        ),
                    )
                    for generator in generators
                ),
            )
        )

    gauge = negation_gauge_automorphism_witness(settling)
    if gauge.stabilizes_settling:
        checks.append(
            AutomorphismH1ActionCheck(
                source="negation_gauge",
                automorphism=gauge,
                images=tuple((generator, generator) for generator in generators),
            )
        )

    return AutomorphismH1ActionWitness(
        h1_witness=h1_witness,
        checks=tuple(checks),
    )


def _visible_source_names(settling: PredicationSettling[T]) -> tuple[str, ...]:
    names: list[str] = []
    if fiber_swap_automorphism_witness(settling).contributes_to_visible_quotient:
        names.append("fiber_swap")
    if visible_entity_permutation_automorphisms(settling):
        names.append("entity_permutation")
    if visible_predicate_automorphisms(settling):
        names.append("predicate_automorphism")
    return tuple(names)


def _permute_cell(
    cell: tuple[Hashable, Hashable],
    permutation: Mapping[Hashable, Hashable],
) -> tuple[Hashable, Hashable]:
    return (permutation[cell[0]], permutation[cell[1]])


def _permute_cells(
    cells: Iterable[tuple[Hashable, Hashable]],
    permutation: Mapping[Hashable, Hashable],
) -> frozenset[tuple[Hashable, Hashable]]:
    return frozenset(_permute_cell(cell, permutation) for cell in cells)


def _swap_cell(cell: tuple[Hashable, Hashable]) -> tuple[Hashable, Hashable]:
    return (cell[1], cell[0])


def _swap_cells(
    cells: Iterable[tuple[Hashable, Hashable]],
) -> frozenset[tuple[Hashable, Hashable]]:
    return frozenset(_swap_cell(cell) for cell in cells)


def _morphism_signature(morphism: PredicateMorphism) -> tuple[object, ...]:
    if isinstance(morphism, PredicateSpecialization):
        return (
            "specialization",
            morphism.source,
            morphism.target,
            morphism.sub_support,
        )
    if isinstance(morphism, PredicateConverse):
        return ("converse", morphism.source, morphism.target)
    if isinstance(morphism, PredicateSubjectProjection):
        return ("subject_projection", morphism.source, morphism.target)
    if isinstance(morphism, PredicateObjectProjection):
        return ("object_projection", morphism.source, morphism.target)
    return (type(morphism).__name__, morphism.source, morphism.target)


def _relabel_morphism_signature(
    morphism: PredicateMorphism,
    permutation: Mapping[Hashable, Hashable],
) -> tuple[object, ...]:
    signature = _morphism_signature(morphism)
    kind = signature[0]
    source = permutation[signature[1]]
    target = permutation[signature[2]]
    if kind == "specialization":
        return (kind, source, target, signature[3])
    return (kind, source, target)


def _image_entity_generator(
    generator: StagedPredicatedCell,
    permutation: Mapping[Hashable, Hashable],
) -> StagedPredicatedCell:
    predicate, stage, cell = generator
    return (predicate, stage, _permute_cell(cell, permutation))


def _image_fiber_swap_generator(
    generator: StagedPredicatedCell,
) -> StagedPredicatedCell:
    predicate, stage, cell = generator
    return (predicate, stage, _swap_cell(cell))


def _image_predicate_generator(
    generator: StagedPredicatedCell,
    permutation: Mapping[Hashable, Hashable],
) -> StagedPredicatedCell:
    predicate, stage, cell = generator
    return (permutation[predicate], stage, cell)


def _unique_sources(sources: Iterable[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(sources))


__all__ = [
    "CoarseSettlingModuli",
    "CoarseSettlingModuliPoint",
    "CoarseModuliPointStratum",
    "AutomorphismStrataWitness",
    "AutomorphismH1ActionCheck",
    "AutomorphismH1ActionWitness",
    "BigradedSettlingCohomologyWitness",
    "EntityPermutationAutomorphismWitness",
    "FiberSwapAutomorphismWitness",
    "CombinedCohomologySignature",
    "NegationGaugeAutomorphismWitness",
    "PredicateAutomorphismWitness",
    "SettlingSheafIsoSignature",
    "automorphism_strata_witness",
    "automorphism_h1_action_witness",
    "coarse_settling_moduli",
    "combined_cohomology_signature",
    "entity_permutation_automorphism_witness",
    "fiber_swap_automorphism_witness",
    "invisible_entity_permutation_automorphisms",
    "invisible_predicate_automorphisms",
    "negation_gauge_automorphism_witness",
    "predicate_automorphism_witness",
    "visible_entity_permutation_automorphisms",
    "visible_predicate_automorphisms",
]
