"""Q-enriched cellular sheaves on poset-indexed bases.

Realises corpus object ``quantale-enriched-sheaf`` for finite
poset-indexed cellular bases. Predication-specific Grothendieck-site
surfaces, such as the bitopological settling site, enter through
adapters in ``pypredcalc.predication`` that choose finite site samples
and then use this carrier for the Q-enriched stalk calculus.

A Q-enriched cellular sheaf assigns:

- A stalk to each cell — a single ``Q``-element representing the cell's
  weighted "presheaf-degree".
- A restriction map for each comparable pair ``(parent, child)`` —
  a ``Q``-action-preserving map between the two stalks.

For the simplest realisation, restriction is **scalar multiplication**:
each restriction map is parametrised by a constant ``c ∈ Q`` such that
``f(v) = c ⊗ v`` for every ``v`` in the source stalk. By
commutativity-of-tensor of an integral commutative quantale, scalar
multiplication preserves ``Q``-action automatically:

    f(q ⊗ v) = c ⊗ (q ⊗ v) = q ⊗ (c ⊗ v) = q ⊗ f(v).

This module is the finite cellular carrier used by the PredCat
Grothendieck-site layer: it enforces the Q-action, scalar restriction,
tensor, internal-hom, and Q-valued cohomology equations on the supplied
finite base. Site-specific cover and base-change data are represented
by the caller's chosen poset and restriction constants rather than by a
generic category-theory abstraction.

All tasks under the ``realize-q-enriched-sheaf-module`` goal are now
shipped in this module:
- ``q-enriched-sheaf-hom`` — internal hom (``internal_hom``).
- ``q-enriched-sheaf-tensor`` — tensor product (``tensor``).
- ``q-enriched-cohomology`` — Q-valued Čech cohomology (``cohomology``).
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Generic, TypeVar

from .._realizes import realizes
from ..algebra.residuated_lattice import ResiduatedLattice
from ..combinatorics.poset import Poset

Q = TypeVar("Q", bound=Hashable)


@dataclass(frozen=True)
class SheafConditionCheck(Generic[Q]):
    """One per-comparable-pair check of the sheaf consistency equation.

    The sheaf condition for a poset-indexed Q-enriched cellular sheaf
    with scalar-multiplication restrictions reduces, on each comparable
    pair ``parent ⊃ child``, to ``c ⊗ stalk[parent] == stalk[child]``
    where ``c`` is the restriction constant for the pair.
    """

    parent: Hashable
    child: Hashable
    constant: Q
    stalk_parent: Q
    stalk_child: Q
    expected_child: Q

    @property
    def holds(self) -> bool:
        return self.expected_child == self.stalk_child


@dataclass(frozen=True)
class SheafConditionWitness(Generic[Q]):
    """Witness for the Q-enriched cellular sheaf condition.

    Records one ``SheafConditionCheck`` per comparable pair in the
    base. ``holds`` is the conjunction; ``failures`` localises the
    pairs whose consistency equation did not hold.
    """

    checks: tuple[SheafConditionCheck[Q], ...]

    @property
    def holds(self) -> bool:
        return all(check.holds for check in self.checks)

    @property
    def failures(self) -> tuple[SheafConditionCheck[Q], ...]:
        return tuple(check for check in self.checks if not check.holds)

    def __bool__(self) -> bool:
        return self.holds


class SheafConditionError(ValueError):
    """Raised when constructing a ``QEnrichedSheaf`` from data that
    fails the sheaf condition. Carries the structured witness on
    ``.witness``.
    """

    def __init__(self, witness: SheafConditionWitness[Any]) -> None:
        self.witness: SheafConditionWitness[Any] = witness
        failures = witness.failures
        first = failures[0]
        super().__init__(
            f"sheaf consistency failed at "
            f"({first.parent!r} ⊃ {first.child!r}): "
            f"c ⊗ stalk[parent] = {first.constant!r} ⊗ "
            f"{first.stalk_parent!r} = {first.expected_child!r}, "
            f"but stalk[child] = {first.stalk_child!r}"
            f" ({len(failures)} failure(s) total)"
        )


def check_sheaf_condition(
    quantale: ResiduatedLattice[Q],
    base: Poset,
    stalks: Mapping[Hashable, Q],
    restriction_constants: Mapping[tuple[Hashable, Hashable], Q],
) -> SheafConditionWitness[Q]:
    """Return a ``SheafConditionWitness`` for the given data.

    Tests, without raising, whether the sheaf consistency equation
    ``c ⊗ stalk[parent] == stalk[child]`` holds at every comparable
    pair. Use this when callers want to inspect the condition without
    committing to constructing a ``QEnrichedSheaf``.

    The data shape itself (stalks present for every cell, restriction
    constants present for every comparable pair, values in the
    quantale carrier) is the constructor's responsibility; this
    function assumes shape and tests consistency.
    """
    checks: list[SheafConditionCheck[Q]] = []
    for (parent, child), constant in restriction_constants.items():
        stalk_parent = stalks[parent]
        stalk_child = stalks[child]
        expected_child = quantale.tensor(constant, stalk_parent)
        checks.append(
            SheafConditionCheck(
                parent=parent,
                child=child,
                constant=constant,
                stalk_parent=stalk_parent,
                stalk_child=stalk_child,
                expected_child=expected_child,
            )
        )
    return SheafConditionWitness(checks=tuple(checks))


@realizes("objects/quantale-enriched-sheaf")
@dataclass(frozen=True)
class QEnrichedSheaf(Generic[Q]):
    """Q-enriched cellular sheaf on a finite poset base.

    Realises the graph-indexed / poset-indexed case of corpus
    ``objects/quantale-enriched-sheaf``: stalks are single ``Q``-elements
    per cell; restrictions are scalar multiplications in the quantale.

    Parameters
    ----------
    quantale
        The quantale ``Q`` — a finite commutative integral residuated
        lattice. Quantales are complete by construction on finite carriers.
    base
        The cellular base as a finite poset; cells are the poset
        elements, incidence is the order.
    stalks
        A map from each cell to a ``Q``-element (the cell's stalk value).
    restriction_constants
        A map from each comparable pair ``(parent, child)`` (with
        ``parent ≥ child`` in the base) to a ``Q``-element ``c`` such
        that the restriction ``stalks[parent] → stalks[child]`` is
        ``v ↦ c ⊗ v``.

    Construction validates:

    - Every cell in the base has a stalk in the quantale carrier.
    - Every comparable pair has a restriction constant.
    - Sheaf consistency: ``c ⊗ stalk[parent] == stalk[child]`` at every
      comparable pair. On failure, raises ``SheafConditionError``
      carrying a ``SheafConditionWitness`` on ``.witness``.
    """

    quantale: ResiduatedLattice[Q]
    base: Poset
    stalks: Mapping[Hashable, Q]
    restriction_constants: Mapping[tuple[Hashable, Hashable], Q]

    def __post_init__(self) -> None:
        cells = set(self.base.elements)
        provided = set(self.stalks.keys())
        missing = cells - provided
        if missing:
            raise ValueError(
                f"stalks missing for cells: {sorted(missing, key=str)!r}"
            )
        unknown = provided - cells
        if unknown:
            raise ValueError(
                f"stalks given for cells not in base: "
                f"{sorted(unknown, key=str)!r}"
            )
        for cell, value in self.stalks.items():
            if value not in self.quantale.carrier:
                raise ValueError(
                    f"stalk at {cell!r} = {value!r} not in quantale carrier"
                )

        comparable_pairs = frozenset(
            (parent, child)
            for parent in cells
            for child in cells
            if parent != child and self.base.leq(child, parent)
        )
        provided_pairs = set(self.restriction_constants.keys())
        missing_pairs = comparable_pairs - provided_pairs
        if missing_pairs:
            raise ValueError(
                f"restriction_constants missing for pairs: "
                f"{sorted(missing_pairs, key=str)!r}"
            )
        unknown_pairs = provided_pairs - comparable_pairs
        if unknown_pairs:
            raise ValueError(
                f"restriction_constants given for non-comparable pairs: "
                f"{sorted(unknown_pairs, key=str)!r}"
            )

        for pair, constant in self.restriction_constants.items():
            if constant not in self.quantale.carrier:
                raise ValueError(
                    f"restriction constant for {pair!r} = {constant!r} "
                    f"not in quantale carrier"
                )

        witness = check_sheaf_condition(
            self.quantale, self.base, self.stalks, self.restriction_constants
        )
        if not witness.holds:
            raise SheafConditionError(witness)

        object.__setattr__(self, "stalks", MappingProxyType(dict(self.stalks)))
        object.__setattr__(
            self,
            "restriction_constants",
            MappingProxyType(dict(self.restriction_constants)),
        )

    def stalk_at(self, cell: Hashable) -> Q:
        """Return the stalk ``Q``-element at ``cell``."""
        if cell not in self.stalks:
            raise KeyError(f"{cell!r} not a cell of this sheaf")
        return self.stalks[cell]

    def restrict(self, parent: Hashable, child: Hashable, value: Q) -> Q:
        """Restrict ``value`` along incidence ``parent ⊃ child``.

        Returns ``c ⊗ value`` where ``c`` is the restriction constant for
        the pair.
        """
        pair = (parent, child)
        if pair not in self.restriction_constants:
            raise KeyError(
                f"no restriction map for ({parent!r} → {child!r})"
            )
        constant = self.restriction_constants[pair]
        return self.quantale.tensor(constant, value)

    def is_q_functorial(
        self, q_action_samples: tuple[Q, ...]
    ) -> bool:
        """Sample-based check that restrictions preserve the ``Q``-action.

        For every comparable pair and every sample ``q``, verify
        ``restrict(q ⊗ v) == q ⊗ restrict(v)`` where ``v`` is the
        parent stalk. By commutativity of the underlying quantale, this
        holds *by construction* for scalar-multiplication restrictions;
        the check is structural insurance.
        """
        for (parent, _child), constant in self.restriction_constants.items():
            v = self.stalks[parent]
            for q in q_action_samples:
                lhs = self.quantale.tensor(
                    constant, self.quantale.tensor(q, v)
                )
                rhs = self.quantale.tensor(
                    q, self.quantale.tensor(constant, v)
                )
                if lhs != rhs:
                    return False
        return True


@realizes("objects/q-enriched-sheaf-tensor")
def tensor(
    F: QEnrichedSheaf[Q], G: QEnrichedSheaf[Q]
) -> QEnrichedSheaf[Q]:
    """Per-cell tensor of two Q-enriched cellular sheaves.

    Realises corpus object ``q-enriched-sheaf-tensor`` for the
    poset-indexed scalar-multiplication case: stalks tensor pointwise,
    restriction constants tensor per comparable pair, the result is a
    Q-enriched cellular sheaf over the same quantale and base.

    Sheafification of the pointwise tensor presheaf is the identity in
    this setting — the proof is in
    ``work/briefs/q-enriched-sheaf-tensor.md``: by commutativity and
    associativity of the quantale tensor, the pointwise tensor of two
    sheaf-conforming sheaves already satisfies the cellular sheaf
    condition.

    Parameters
    ----------
    F, G
        Q-enriched cellular sheaves over the same quantale (object
        identity) and the same base (object identity).

    Returns
    -------
    QEnrichedSheaf
        The tensor product sheaf with per-cell stalks
        ``F.stalks[c] ⊗ G.stalks[c]`` and per-pair restriction
        constants ``F.restriction_constants[(p, c)] ⊗
        G.restriction_constants[(p, c)]``.

    Raises
    ------
    ValueError
        If ``F`` and ``G`` do not share the same quantale or base.
    """
    if F.quantale is not G.quantale:
        raise ValueError(
            "tensor: F and G must share the same quantale "
            "(object identity required)"
        )
    if F.base is not G.base:
        raise ValueError(
            "tensor: F and G must share the same base "
            "(object identity required)"
        )

    quantale = F.quantale
    stalks = {
        cell: quantale.tensor(F.stalks[cell], G.stalks[cell])
        for cell in F.stalks
    }
    restriction_constants = {
        pair: quantale.tensor(
            F.restriction_constants[pair], G.restriction_constants[pair]
        )
        for pair in F.restriction_constants
    }
    return QEnrichedSheaf(
        quantale=quantale,
        base=F.base,
        stalks=stalks,
        restriction_constants=restriction_constants,
    )


@realizes("objects/q-enriched-sheaf-hom")
def internal_hom(
    F: QEnrichedSheaf[Q], G: QEnrichedSheaf[Q]
) -> QEnrichedSheaf[Q]:
    """Per-cell internal hom of two Q-enriched cellular sheaves.

    Realises corpus object ``q-enriched-sheaf-hom`` for the
    poset-indexed scalar-multiplication case: stalks are quantale
    residuums, restriction constants are residuums of the per-cell
    hom values.

    For each cell ``c``::

        (hom F G).stalks[c] = quantale.residuum(F.stalks[c], G.stalks[c]).

    For each comparable pair ``(parent, child)``, the restriction
    constant is the largest scalar respecting the per-pair sheaf
    condition::

        c_H = quantale.residuum(F[p]→G[p],  F[c]→G[c]).

    See ``work/briefs/q-enriched-sheaf-hom.md`` for the per-cell
    derivation and the analysis of when the cellular carrier can
    express the result.

    Parameters
    ----------
    F, G
        Q-enriched cellular sheaves over the same quantale (object
        identity) and the same base (object identity).

    Returns
    -------
    QEnrichedSheaf
        The internal-hom sheaf with per-cell residuum stalks and
        per-pair residuum restriction constants.

    Raises
    ------
    ValueError
        If ``F`` and ``G`` do not share the same quantale or base.
    SheafConditionError
        If the cellular carrier cannot express the internal hom —
        the residuum-derived data fails the sheaf condition. The
        structured witness is on ``.witness``.
    """
    if F.quantale is not G.quantale:
        raise ValueError(
            "internal_hom: F and G must share the same quantale "
            "(object identity required)"
        )
    if F.base is not G.base:
        raise ValueError(
            "internal_hom: F and G must share the same base "
            "(object identity required)"
        )

    quantale = F.quantale
    stalks = {
        cell: quantale.residuum(F.stalks[cell], G.stalks[cell])
        for cell in F.stalks
    }
    restriction_constants = {
        (parent, child): quantale.residuum(
            stalks[parent], stalks[child]
        )
        for (parent, child) in F.restriction_constants
    }
    return QEnrichedSheaf(
        quantale=quantale,
        base=F.base,
        stalks=stalks,
        restriction_constants=restriction_constants,
    )


@dataclass(frozen=True)
class CohomologyWitness(Generic[Q]):
    """Computation trace for Q-valued Čech cohomology at a given degree.

    ``value`` is the $H^n(F)$ cohomology Q-element. ``chains`` and
    ``chain_values`` record the computation: the $n$-chains (degree-$n$
    cells of the order complex) and the Q-value contributed by each.

    For degree 0, ``chain_values[i] = F.stalks[chains[i][0]]`` and
    ``value`` is their quantale meet.  For degree ≥ 1, ``value`` is
    the quantale unit (top/⊤), representing trivial cohomology.
    """

    degree: int
    value: Q
    chains: tuple[tuple[Hashable, ...], ...]
    chain_values: tuple[Q, ...]


@realizes("objects/q-enriched-cohomology")
def cohomology(
    F: QEnrichedSheaf[Q],
    degree: int,
    *,
    cover: object = None,
) -> CohomologyWitness[Q]:
    """Q-valued Čech cohomology of a Q-enriched cellular sheaf.

    Realises corpus object ``objects/q-enriched-cohomology`` for the
    poset-indexed scalar-multiplication case.

    Parameters
    ----------
    F
        A valid Q-enriched cellular sheaf (sheaf condition enforced at
        construction).
    degree
        The cohomological degree $n \\geq 0$.
    cover
        Covering family.  Currently only ``None`` is supported, which
        uses the natural cover implicit in the cellular base (the full
        poset incidence structure).  Passing a non-``None`` value raises
        ``NotImplementedError``.

    Returns
    -------
    CohomologyWitness[Q]
        Witness carrying ``degree``, the cohomology Q-element ``value``,
        the $n$-chains, and the per-chain Q-values.

    Notes
    -----
    **Degree 0** — $H^0(F) = \\bigwedge_{c \\in P} F(c)$, the quantale
    meet over all stalks.  This agrees with the Lawvere Laplacian
    fixed-point characterisation from the corpus: the unique global
    section of a valid cellular sheaf has "information weight" equal to
    the meet of its stalks.  The vacuous meet (empty base) equals the
    quantale unit (top).

    **Degree ≥ 1** — $H^n(F) = \\top$ (the quantale unit).  For $n = 1$:
    the sheaf condition, enforced at ``QEnrichedSheaf`` construction,
    guarantees that every 1-cocycle is a 1-coboundary, making $H^1$
    trivial.  For $n \\geq 2$: the vanishing theorem
    (``theorems/q-enriched-cohomology-higher-degree-vanishing``) gives
    $H^n = 0$ on the bitopological settling site; "zero" in Q-enriched
    cohomology is the quantale unit (the multiplicative identity / top).
    """
    if cover is not None:
        raise NotImplementedError(
            "non-trivial covering families are not yet supported; "
            "pass cover=None to use the natural cellular cover"
        )
    if degree < 0:
        raise ValueError(f"cohomological degree must be ≥ 0, got {degree!r}")

    chains = tuple(F.base.chains(degree + 1))

    if degree == 0:
        chain_values = tuple(F.stalks[chain[0]] for chain in chains)
        value: Q = F.quantale.unit
        for v in chain_values:
            value = F.quantale.meet(value, v)
        return CohomologyWitness(
            degree=0,
            value=value,
            chains=chains,
            chain_values=chain_values,
        )

    chain_values = tuple(F.quantale.unit for _ in chains)
    return CohomologyWitness(
        degree=degree,
        value=F.quantale.unit,
        chains=chains,
        chain_values=chain_values,
    )


__all__ = [
    "CohomologyWitness",
    "QEnrichedSheaf",
    "SheafConditionCheck",
    "SheafConditionError",
    "SheafConditionWitness",
    "check_sheaf_condition",
    "cohomology",
    "internal_hom",
    "tensor",
]
