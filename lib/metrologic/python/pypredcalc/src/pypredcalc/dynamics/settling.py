"""Strict-regime predication settling.

Realizes corpus objects:

- ``predication-settling`` (`objects/predication-settling.md`) — a family
  ``(v_τ)_{τ<λ}`` of cross-fiber valuations, monotone in ``≤_k``, driven
  by a closure operator and an increment sequence.
- ``increment-sequence`` (`objects/increment-sequence.md`) — the family
  ``U = (u_τ)`` of external-evidence increments.
- ``settling-endofunctor`` (`morphisms/settling-endofunctor.md`) — the
  step rule (see "Step rule" below).

This realisation handles the **strict regime only**: ``L``, ``E`` and
``𝒞`` finite, the closure operator Scott-continuous (in fact
finitely-generated), and the increment sequence eventually zero. Under
those hypotheses the orbit stabilises at a finite ordinal — the closure
ordinal ``κ < ω`` — and naturality at quiescence is decidable. The
non-Scott-continuous, transfinite, stochastic, continuous-state, and
Lorentzian-causal regimes named in the corpus are out of scope here.

Step rule. The authoritative formula is the one used in the corpus
theorem ``closure-driven-settling-monotonicity`` (a *proved* result):

    v_{τ+1}(p) = cl_p(v_τ(p) ∨_k u_{τ+1}(p)).

Merge first, close second. Each ``v_τ`` for ``τ ≥ 1`` is closed
(``cl(v_τ) = v_τ``), so the orbit lives in the closure 2-monad's
algebras except possibly at the seed ``v_0``. This implementation
follows that formula exactly.

Caveat: the corpus's ``morphisms/settling-endofunctor.md`` defines
``F_U(E)_τ := Cl(E) ∨_k u_τ``, which is close-then-merge — contradicting
the theorem. The discrepancy is flagged in
``questions/settling-endofunctor-step-order.md``; pypredcalc follows
the theorem rather than that definition note.

Increment indexing. The corpus formula uses ``u_{τ+1}`` to produce
``v_{τ+1}``: the entry indexed ``τ+1`` fires at the step ``τ → τ+1``.
This implementation indexes the :class:`IncrementSequence` zero-based
with the same per-step semantics: ``increments[τ]`` fires at the step
``τ → τ+1``, so the corpus's ``u_{τ+1}`` is this implementation's
``increments[τ]``. The math is identical; only the index label differs.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Generic, TypeVar

from .._realizes import realizes
from ..predication.fiber_valuation import FiberValuation
from .closure import ClosureOperator, _eq_cross

if TYPE_CHECKING:
    from ..predication.witness import NaturalityWitness, QuiescenceWitness

T = TypeVar("T", bound=Hashable)

CrossFiberValuation = Mapping[Hashable, FiberValuation[T]]


@realizes("objects/increment-sequence")
@dataclass(frozen=True)
class IncrementSequence(Generic[T]):
    """A finite, eventually-zero increment sequence ``U = (u_τ)``.

    Each ``u_τ`` is a cross-fiber valuation; entries past the explicit
    list are interpreted as the empty (knowledge-bottom) cross-fiber
    valuation. The corpus's ``increment-sequence`` requires each ``u_τ``
    be ``𝒞``-natural; this constructor does **not** enforce naturality —
    use :meth:`PredicateCategory.is_natural` on each entry to verify.
    """

    increments: tuple[Mapping[Hashable, FiberValuation[T]], ...] = field(
        default_factory=tuple
    )

    def get(self, tau: int) -> Mapping[Hashable, FiberValuation[T]] | None:
        """Return ``u_τ``, or ``None`` past the end (interpret as zero)."""
        if 0 <= tau < len(self.increments):
            return self.increments[tau]
        return None

    def __len__(self) -> int:
        return len(self.increments)


@realizes("objects/predication-settling")
@dataclass(frozen=True)
class PredicationSettling(Generic[T]):
    """The orbit ``(v_τ)`` of a closure-driven predication settling.

    Drives ``v_{τ+1} = cl(v_τ ∨_k u_τ)`` from an initial state ``v_0``,
    consuming the increment sequence one entry per successor step. After
    increments run out, the rule reduces to plain closure iteration; in
    the strict regime that orbit terminates at a finite ordinal.
    """

    closure: ClosureOperator[T]
    increments: IncrementSequence[T]
    initial_state: Mapping[Hashable, FiberValuation[T]]
    max_steps: int = 10_000

    def step(
        self,
        v: Mapping[Hashable, FiberValuation[T]],
        tau: int,
    ) -> dict[Hashable, FiberValuation[T]]:
        """One settling step: ``v_{τ+1} = cl(v ∨_k u_τ)``.

        ``tau`` is the index of the *increment* consumed at this step
        (``u_τ``); the resulting valuation is ``v_{τ+1}``.
        """
        u = self.increments.get(tau)
        if u is None:
            merged = v
        else:
            merged = {p: v[p].knowledge_join(u[p]) for p in v if p in u}
            # Predicates present in v but not in u keep their value.
            for p in v:
                if p not in u:
                    merged[p] = v[p]
            # Predicates in u but not in v adopt the increment.
            for p in u:
                if p not in v:
                    merged[p] = u[p]
        return self.closure.apply(merged)

    def forward_trajectory(
        self,
    ) -> list[dict[Hashable, FiberValuation[T]]]:
        """The full ``≤_k``-monotone orbit ``v_0, v_1, …, v_κ``.

        Stops when a step produces an unchanged valuation. Because the
        closure operator is inflationary and ``∨_k`` is monotone, this
        is a strict knowledge-order ascending chain until termination.
        """
        traj: list[dict[Hashable, FiberValuation[T]]] = [
            self.closure._ensure_full_valuation(self.initial_state)
        ]
        # Number of explicit increments — we run at least this many steps
        # to consume them all, and then iterate closure to fixed point.
        n_increments = len(self.increments)
        tau = 0
        for _ in range(self.max_steps):
            nxt = self.step(traj[-1], tau)
            tau += 1
            if _eq_cross(nxt, traj[-1]) and tau > n_increments:
                # Reached a fixed point and we've consumed all increments.
                return traj
            traj.append(nxt)
        raise RuntimeError(
            f"settling did not stabilise within {self.max_steps} steps "
            "(non-strict regime, or rule loop)"
        )

    def closure_ordinal(self) -> int:
        """Smallest ``κ`` such that ``v_κ = v_{κ+1}``. Strict regime only."""
        return len(self.forward_trajectory()) - 1

    def quiescent_state(self) -> dict[Hashable, FiberValuation[T]]:
        """The fixed-point ``v_κ`` of the orbit."""
        return self.forward_trajectory()[-1]

    def quiescence(
        self, v: Mapping[Hashable, FiberValuation[T]]
    ) -> QuiescenceWitness[T]:
        """Return the structural quiescence witness for ``v``.

        ``v`` is quiescent iff ``cl(v) = v``. The witness records the
        before-and-after states and (when they differ) the per-predicate
        cells where the closure step changed something — exactly the
        evidence that justifies (or refutes) the fixed-point claim.
        """
        from ..predication.witness import QuiescenceWitness
        after = self.closure.apply(v)
        return QuiescenceWitness(before=dict(v), after=after)

    def naturality_at_quiescence(self) -> NaturalityWitness[T]:
        """Return the structural naturality witness for the orbit's fixed point.

        Computes the orbit's quiescent state ``v_κ`` and returns
        ``cat.naturality(v_κ)``. Captures the per-generator structure
        that the corpus's ``predicate-category-naturality`` condition
        names — at the orbit's resting point.
        """
        v = self.quiescent_state()
        return self.closure.category.naturality(v)

    # ----- bool conveniences ----------------------------------------

    def is_quiescent(
        self, v: Mapping[Hashable, FiberValuation[T]]
    ) -> bool:
        """``bool(self.quiescence(v))`` — flat summary. Prefer
        :meth:`quiescence` when you can use the witness."""
        return bool(self.quiescence(v))

    def is_natural_at_quiescence(self) -> bool:
        """``bool(self.naturality_at_quiescence())`` — flat summary.
        Prefer :meth:`naturality_at_quiescence` when you can use the
        witness."""
        return bool(self.naturality_at_quiescence())


def __getattr__(name: str) -> object:
    raise AttributeError(
        f"pypredcalc.dynamics.settling has no attribute {name!r}; "
        "non-strict / transfinite / stochastic regimes are not yet "
        "implemented — see corpus notes objects/predication-settling*.md "
        "and friends"
    )


__all__ = ["IncrementSequence", "PredicationSettling"]
