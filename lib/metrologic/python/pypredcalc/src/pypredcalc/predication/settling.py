"""Predication settling — the executable run-to-fixed-point runtime.

Realises corpus object ``predication-settling``: the family
``(v_τ)_{τ < λ}`` produced by iterating a closure operator on an
initial cross-fiber valuation, indexed by ordinals up to a settling
bound ``λ``.

This module handles the **finite / ω** segment of the runtime: ``λ`` is
a positive integer, and the trajectory iterates one closure application
per step until either quiescence (``v_τ = v_{τ+1}``) or the bound is
reached. Transfinite handling — limit ordinals, ``ω``-completion, the
non-Scott-continuous firing-ordinal apparatus — is not yet implemented;
the runtime reports ``regime="finite-not-quiesced"`` when the bound is
reached without quiescence so callers can detect that they need a
larger bound or transfinite machinery.

Settling-monotonicity ``v_σ ≤_k v_τ`` is automatic when the closure is
inflationary; the runtime does not re-check it in the hot loop, but
:func:`verify_monotone` is exposed for callers who want a structural
check.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Generic, TypeVar

from .._realizes import realizes
from .closure_rule_system import (
    CrossFiberClosureOperator,
    FiberClosureRuleSystem,
    RuleSystemRegimeProfile,
    cross_fiber_knowledge_leq,
)
from .fiber_valuation import FiberValuation
from .hyperdoctrine import PredicationHyperdoctrine
from .regime import PredicationRegimeCertificate

T = TypeVar("T", bound=Hashable)


# ---- The settling itself --------------------------------------------------


@realizes("objects/predication-settling")
@dataclass(frozen=True)
class PredicationSettling(Generic[T]):
    """The trajectory ``(v_τ)`` of a closure operator on an initial
    cross-fiber valuation, up to a settling bound.

    Constructing the settling triggers iteration to fixed point or to
    the bound. The :attr:`trajectory` is the captured stage sequence.
    Use :attr:`quiescence_ordinal` to read off where the sequence
    stabilised (``None`` if the bound was reached first), and
    :attr:`regime` for a coarse classification of the run.
    """

    hyperdoctrine: PredicationHyperdoctrine[T]
    closure: CrossFiberClosureOperator[T]
    bound: int
    trajectory: tuple[Mapping[Hashable, FiberValuation[T]], ...]

    @classmethod
    def run(
        cls,
        hyperdoctrine: PredicationHyperdoctrine[T],
        closure: CrossFiberClosureOperator[T],
        initial: Mapping[Hashable, FiberValuation[T]],
        bound: int,
    ) -> PredicationSettling[T]:
        """Build a settling by running ``closure`` from ``initial`` for
        at most ``bound`` steps (or until quiescence).

        ``bound`` is the number of *steps* permitted, so the trajectory
        has at most ``bound + 1`` stages (including ``v_0``).
        """
        if bound < 0:
            raise ValueError(f"bound must be non-negative, got {bound!r}")
        # Validate v_0 against hyperdoctrine domains via the closure.
        closure._validate_input(initial)
        stages: list[Mapping[Hashable, FiberValuation[T]]] = [
            MappingProxyType(dict(initial))
        ]
        for _ in range(bound):
            current = stages[-1]
            nxt = closure.at(current)
            if _states_equal(current, nxt):
                break
            stages.append(nxt)
        return cls(
            hyperdoctrine=hyperdoctrine,
            closure=closure,
            bound=bound,
            trajectory=tuple(stages),
        )

    # ---- queries -----------------------------------------------------------

    @property
    def initial(self) -> Mapping[Hashable, FiberValuation[T]]:
        """``v_0``."""
        return self.trajectory[0]

    @property
    def final(self) -> Mapping[Hashable, FiberValuation[T]]:
        """The last stage in the trajectory — either the quiescence
        point or ``v_bound`` if the bound was reached first."""
        return self.trajectory[-1]

    @property
    def is_quiescent(self) -> bool:
        """``True`` iff the trajectory reached a fixed point within the
        bound (the last computed step added nothing).
        """
        if len(self.trajectory) == 0:
            return False
        # If we ran fewer than `bound` steps, we stopped on quiescence.
        return len(self.trajectory) - 1 < self.bound or self._final_is_fixed()

    @property
    def quiescence_ordinal(self) -> int | None:
        """The ordinal ``τ`` at which the trajectory stabilised, or
        ``None`` if quiescence was not reached within the bound.
        """
        if not self.is_quiescent:
            return None
        return len(self.trajectory) - 1

    @property
    def regime(self) -> str:
        """A coarse classification of the run.

        - ``"strict"`` — quiescent at ``τ = 0`` (the initial state was
          already a fixed point).
        - ``"finite-quiesced"`` — quiescent at some finite ``τ > 0``.
        - ``"finite-not-quiesced"`` — bound reached without quiescence;
          a larger bound or transfinite machinery is required.

        The four-regime corpus dichotomy (strict / Scott-continuous /
        transfinite-bounded / aperiodic) is asymptotic; this runtime is
        finite, so it can only distinguish the first two from "did not
        finish".
        """
        if not self.is_quiescent:
            return "finite-not-quiesced"
        if self.quiescence_ordinal == 0:
            return "strict"
        return "finite-quiesced"

    @property
    def theory_regime_profile(self) -> RuleSystemRegimeProfile[T] | None:
        """The rule-language four-regime profile, when closure came from rules."""
        return self.closure.regime_profile

    @property
    def theory_regime(self) -> str | None:
        """The corpus four-regime label predicted from rule syntax/base data."""
        profile = self.theory_regime_profile
        return None if profile is None else profile.regime

    @property
    def theory_regime_certificate(self) -> PredicationRegimeCertificate | None:
        """Typed four-regime certificate predicted from rule syntax/base data."""
        profile = self.theory_regime_profile
        return None if profile is None else profile.certificate

    @realizes("theorems/temporally-bounded-positing")
    def truth_windows(
        self,
        predicate: Hashable,
        subject: Hashable,
        object_: Hashable,
    ) -> tuple[TruthWindow, ...]:
        """Maximal finite trajectory intervals where a cell is truth-designated.

        The returned intervals are half-open stage ranges ``[start, end)``.
        ``end`` is bounded by ``len(trajectory)`` because this runtime captures
        the finite prefix actually computed.
        """
        if predicate not in self.hyperdoctrine.category.predicates:
            raise KeyError(f"predicate {predicate!r} not in settling category")
        if (subject, object_) not in self.hyperdoctrine.dom(predicate):
            raise ValueError(
                f"cell ({subject!r}, {predicate!r}, {object_!r}) is outside "
                f"dom({predicate!r})"
            )

        windows: list[TruthWindow] = []
        start: int | None = None
        for stage, valuation in enumerate(self.trajectory):
            fiber = valuation[predicate]
            designated = fiber.bilattice.truth_leq(
                fiber.bilattice.truth_top(),
                fiber.get(subject, object_),
            )
            if designated and start is None:
                start = stage
            if not designated and start is not None:
                windows.append(
                    TruthWindow(
                        predicate=predicate,
                        subject=subject,
                        object=object_,
                        start=start,
                        end=stage,
                    )
                )
                start = None
        if start is not None:
            windows.append(
                TruthWindow(
                    predicate=predicate,
                    subject=subject,
                    object=object_,
                    start=start,
                    end=len(self.trajectory),
                )
            )
        return tuple(windows)

    # ---- internal helpers -------------------------------------------------

    def _final_is_fixed(self) -> bool:
        """True if applying the closure to the final stage adds nothing
        (used when the bound was exactly reached)."""
        nxt = self.closure.at(self.final)
        return _states_equal(self.final, nxt)


# ---- Helpers --------------------------------------------------------------


@realizes("theorems/temporally-bounded-positing")
@dataclass(frozen=True)
class TruthWindow:
    """A finite assertion-time interval for one predication cell."""

    predicate: Hashable
    subject: Hashable
    object: Hashable
    start: int
    end: int

    def __post_init__(self) -> None:
        if self.start < 0:
            raise ValueError("truth-window start must be non-negative")
        if self.end < self.start:
            raise ValueError("truth-window end must be >= start")

    @property
    def is_empty(self) -> bool:
        return self.start == self.end


def _states_equal(
    a: Mapping[Hashable, FiberValuation[T]],
    b: Mapping[Hashable, FiberValuation[T]],
) -> bool:
    """Equality on cross-fiber valuations, predicate-by-predicate."""
    if set(a.keys()) != set(b.keys()):
        return False
    return all(a[p] == b[p] for p in a)


def verify_monotone(
    trajectory: tuple[Mapping[Hashable, FiberValuation[T]], ...],
) -> bool:
    """Check ``v_σ ≤_k v_τ`` pointwise across consecutive stages.

    The corpus's settling-monotonicity axiom; automatic when the closure
    is inflationary. Callers who construct a trajectory by other means
    can use this for verification.
    """
    for i in range(len(trajectory) - 1):
        if not cross_fiber_knowledge_leq(trajectory[i], trajectory[i + 1]):
            return False
    return True


def settle_from_rule_system(
    hyperdoctrine: PredicationHyperdoctrine[T],
    rule_system: FiberClosureRuleSystem[T],
    initial: Mapping[Hashable, FiberValuation[T]],
    bound: int,
) -> PredicationSettling[T]:
    """Convenience: build a settling directly from a rule system."""
    cl = rule_system.generate(hyperdoctrine)
    return PredicationSettling.run(hyperdoctrine, cl, initial, bound)


__all__ = [
    "PredicationSettling",
    "TruthWindow",
    "settle_from_rule_system",
    "verify_monotone",
]
