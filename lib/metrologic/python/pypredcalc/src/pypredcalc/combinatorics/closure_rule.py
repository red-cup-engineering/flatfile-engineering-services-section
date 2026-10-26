"""Closure rule systems and their forward/backward operators.

Realizes corpus objects: `closure-rule-system`, `closure-rule`,
`forward-trajectory`, `cosettling`.

A closure-rule system is a set of inference rules driving a closure operator
T on subsets of a cell set. The current primitive handles binary-presence
cells only — sufficient for the strict-regime combinatorial theorems.
Multi-valued / bilattice-valued cells need an extension.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable
from dataclasses import dataclass
from itertools import combinations
from typing import TypeAlias

State: TypeAlias = frozenset[Hashable]


@dataclass(frozen=True)
class Rule:
    """A closure rule: if all antecedents are present, produce consequents."""

    antecedents: tuple[Hashable, ...]
    consequents: tuple[Hashable, ...]

    def fires_on(self, state: State) -> bool:
        return all(c in state for c in self.antecedents)


@dataclass(frozen=True)
class ClosureRuleSystem:
    """A closure-rule system: finite set of rules + cell universe."""

    rules: tuple[Rule, ...]
    universe: frozenset[Hashable] | None = None

    def __post_init__(self) -> None:
        if self.universe is not None:
            for r in self.rules:
                for c in r.antecedents:
                    if c not in self.universe:
                        raise ValueError(f"rule antecedent {c!r} not in universe")
                for c in r.consequents:
                    if c not in self.universe:
                        raise ValueError(f"rule consequent {c!r} not in universe")

    def cells(self) -> frozenset[Hashable]:
        if self.universe is not None:
            return self.universe
        result: set[Hashable] = set()
        for r in self.rules:
            result.update(r.antecedents)
            result.update(r.consequents)
        return frozenset(result)

    def apply(self, state: State) -> State:
        """One closure step: fire every rule whose antecedent is satisfied.
        Inflation is automatic (cells in state stay)."""
        new_state = set(state)
        for r in self.rules:
            if r.fires_on(state):
                new_state.update(r.consequents)
        return frozenset(new_state)

    def forward_trajectory(self, seed: Iterable[Hashable], max_steps: int = 1000) -> list[State]:
        """Forward trajectory from seed until closure-stable."""
        traj: list[State] = [frozenset(seed)]
        for _ in range(max_steps):
            nxt = self.apply(traj[-1])
            if nxt == traj[-1]:
                return traj
            traj.append(nxt)
        raise RuntimeError(f"trajectory did not stabilize within {max_steps} steps")

    def cosettling(self, target: Iterable[Hashable]) -> list[State]:
        """T^{-1}(target): all v ⊆ target with T(v) = target.

        Enumeration over 2^|target| subsets — exponential but tractable for
        the small targets used in the strict-regime benchmarks.
        """
        target_fs = frozenset(target)
        cells_list = sorted(target_fs, key=lambda x: str(x))
        result: list[State] = []
        for r in range(len(cells_list) + 1):
            for combo in combinations(cells_list, r):
                v = frozenset(combo)
                if self.apply(v) == target_fs:
                    result.append(v)
        return result

    def iterated_cosettling(self, target: Iterable[Hashable], max_iter: int = 100) -> set[State]:
        """T^{*-1}(target): all v with T^k(v) = target for some k ≥ 0.

        Backward BFS via T^{-1}; converges when the frontier stabilizes.
        """
        target_fs = frozenset(target)
        seen: set[State] = {target_fs}
        frontier: set[State] = {target_fs}
        for _ in range(max_iter):
            new_frontier: set[State] = set()
            for s in frontier:
                for v in self.cosettling(s):
                    if v not in seen:
                        seen.add(v)
                        new_frontier.add(v)
            if not new_frontier:
                return seen
            frontier = new_frontier
        raise RuntimeError(
            f"iterated cosettling did not stabilize within {max_iter} iterations"
        )

    def closure_ordinal(self, seed: Iterable[Hashable]) -> int:
        """Smallest k such that T^k(seed) is closure-stable.

        Finite for strict-regime systems; non-strict systems need transfinite
        iteration which this primitive does not handle.
        """
        return len(self.forward_trajectory(seed)) - 1


def rule(antecedents: Iterable[Hashable], consequents: Iterable[Hashable]) -> Rule:
    """Convenience constructor for `Rule` from any iterables."""
    return Rule(antecedents=tuple(antecedents), consequents=tuple(consequents))
