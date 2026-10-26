"""Bilattice-valued closure-rule system over :class:`PredicationStore`.

This module is the bridge pyfars asked for: a closure-rule system whose
**rules carry explicit bilattice values on both antecedents and
consequents**, applied to a :class:`PredicationStore` with knowledge-
monotone composition on cell collisions. It realises corpus
``concepts/closure-rule`` and ``concepts/closure-rule-system`` at the
flat ``(subject, predicate, object) → BilatticeValue`` presentation
that observation-side ingest already uses.

Relation to other rule modules:

- :mod:`pypredcalc.combinatorics.closure_rule` is the propositional
  set-monotone collapse — sufficient for the strict-regime FOUR case
  if every consequent reads as ``T`` and every absent cell reads as
  ``⊥``. Loses the ability to *positively emit* ``F`` (disqualification),
  which is what pyfars's eligibility rule specs need.
- :mod:`pypredcalc.predication.closure_rule` is the corpus rule
  language at the ``predication-fiber-algebra`` level: ``CellAtom`` is
  ``v(q)(s, o) ≥_k V`` with arbitrary twist-bilattice value, free-
  variable instantiation per firing, optional ``∀``-block. That's the
  full corpus rule shape; this module is the
  observation-side / store-side ergonomic wrapper around it.

Antecedent and consequent atoms here are **grounded** triples — the
``(s, p, o)`` is fixed at rule-construction time (no free variables in
the pyfars use case). The atoms carry a :class:`BilatticeValue`; the
antecedent atom is satisfied at a store ``S`` iff
``S.get(s, p, o) ≥_k V`` in the knowledge order on FOUR; the consequent
atom commits the value into the store via ``knowledge_join``.

Knowledge-monotone composition. When two rules touch the same
``(s, p, o)`` cell with values ``v₁`` and ``v₂``, the resulting cell
holds ``v₁ ∨_k v₂``. The corpus-load-bearing case: a rule emits ``T``
on a cell, another emits ``F`` on the same cell, and the cell becomes
``⊤`` — surfacing the contradiction. ``PredicationStore.insert``
already implements this; the closure runtime here just feeds the
consequent through ``insert``.

Realises corpus concepts ``closure-rule`` and ``closure-rule-system``.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable
from dataclasses import dataclass

from .._realizes import realizes
from ..algebra.bilattice import (
    BilatticeValue,
    fusion,
    knowledge_leq,
    truth_leq,
)
from .cell import PredicationCell
from .store import PredicationStore

CellKey = tuple[Hashable, Hashable, Hashable]


@dataclass(frozen=True)
class StoreFusionAntecedent:
    """A twist-product fusion antecedent at the store level:

        ``store(cell_a) ⊙ store(cell_b) ≥_t threshold``.

    Realises the antecedent shape of corpus theorem
    ``dispatch-as-closure-rule-system`` at the flat-store presentation.
    Pyfars's dispatch-eligibility rule

        ``capability(a) ⊙ required_cap(w) ≥_t threshold``

    becomes ``StoreFusionAntecedent(cell_a, cell_b, threshold)`` where
    ``cell_a`` and ``cell_b`` are the two cell-keys.

    The threshold is in the **truth order**, not the knowledge order
    — distinct from :class:`StoreRule`'s cell-atom antecedents. Per the
    corpus, fusion is the truth-order's residuated-lattice composition
    operator; thresholds compared against fused values use ``≥_t``.
    """

    cell_a: CellKey
    cell_b: CellKey
    threshold: BilatticeValue

    def evaluate(self, store: PredicationStore) -> bool:
        val_a = store.get(*self.cell_a)
        val_b = store.get(*self.cell_b)
        fused = fusion(val_a, val_b)
        return truth_leq(self.threshold, fused)


@realizes("concepts/closure-rule")
@dataclass(frozen=True)
class StoreRule:
    """A closure rule over a :class:`PredicationStore`.

    ``antecedents`` is a tuple of antecedent items. Each item is either:

    - A ``(cell_key, threshold_value)`` pair — a **cell atom** satisfied at
      a store when ``store.get(cell_key) ≥_k threshold_value``
      (``BOT`` is ``≥_k`` only itself; ``T`` is ``≥_k T`` and ``≥_k BOT``;
      ``⊤`` is ``≥_k`` everything).
    - A :class:`StoreFusionAntecedent` — a **fusion atom** satisfied when
      ``store(cell_a) ⊙ store(cell_b) ≥_t threshold``. Realises the
      dispatch theorem's antecedent shape.

    ``consequents`` is a tuple of ``(cell_key, value)`` pairs; on firing,
    each value is knowledge-joined into the store at its cell.

    Empty antecedents == axiom: the rule always fires.
    """

    antecedents: tuple[
        tuple[CellKey, BilatticeValue] | StoreFusionAntecedent, ...
    ]
    consequents: tuple[tuple[CellKey, BilatticeValue], ...]

    def fires_at(self, store: PredicationStore) -> bool:
        """``True`` iff every antecedent is satisfied at ``store``.

        Cell atoms use ``≥_k``; fusion atoms use ``≥_t``.
        """
        for atom in self.antecedents:
            if isinstance(atom, StoreFusionAntecedent):
                if not atom.evaluate(store):
                    return False
            else:
                key, threshold = atom
                if not knowledge_leq(threshold, store.get(*key)):
                    return False
        return True

    def consequent_cells(self) -> Iterable[PredicationCell]:
        """Yield the consequent atoms as :class:`PredicationCell` objects
        (skipping ``BOT``-valued consequents — knowledge-joining ``BOT``
        is a no-op)."""
        for (subject, predicate, object_), value in self.consequents:
            if value == BilatticeValue.BOT:
                continue
            yield PredicationCell(
                subject=subject,
                predicate=predicate,
                object=object_,
                value=value,
            )


@realizes("concepts/closure-rule-system")
@dataclass(frozen=True)
class StoreClosureRuleSystem:
    """A finite collection of :class:`StoreRule` objects.

    The generated closure operator is the least operator on
    :class:`PredicationStore` that is inflationary, idempotent, and
    fires every rule whose antecedent is satisfied. Inflationarity and
    idempotence follow from ``knowledge_join``'s semilattice properties;
    the per-round fire-and-commit loop is the standard Kleene
    iteration to fixed point.
    """

    rules: tuple[StoreRule, ...]
    max_iterations: int = 10_000

    def step(self, store: PredicationStore) -> PredicationStore:
        """Apply one round: every rule whose antecedent is satisfied at
        ``store`` commits its consequents.

        Antecedents evaluate against the *input* ``store``; commits
        accumulate into the output. The function is monotone in the
        knowledge order and equals the identity at fixed points.
        """
        result = store
        for rule in self.rules:
            if rule.fires_at(store):
                for cell in rule.consequent_cells():
                    result = result.insert(cell)
        return result

    def forward_trajectory(
        self, store: PredicationStore
    ) -> list[PredicationStore]:
        """Run the closure to fixed point.

        Returns the list of stages ``[v_0, v_1, ..., v_n]`` where
        ``v_n`` is the fixed point. Raises :class:`RuntimeError` if the
        system fails to stabilise within ``max_iterations`` (which
        indicates a bug in the rule system or that ``max_iterations``
        is too low; with finite cells and finite values the iteration
        is bounded by ``|cells| · |FOUR|``).
        """
        trajectory: list[PredicationStore] = [store]
        for _ in range(self.max_iterations):
            nxt = self.step(trajectory[-1])
            if nxt == trajectory[-1]:
                return trajectory
            trajectory.append(nxt)
        raise RuntimeError(
            f"closure did not stabilise within {self.max_iterations} "
            f"rounds; check for non-terminating rule cycles or raise "
            f"max_iterations"
        )

    def closure(self, store: PredicationStore) -> PredicationStore:
        """Convenience: the fixed point only."""
        return self.forward_trajectory(store)[-1]


__all__ = [
    "StoreClosureRuleSystem",
    "StoreFusionAntecedent",
    "StoreRule",
]
