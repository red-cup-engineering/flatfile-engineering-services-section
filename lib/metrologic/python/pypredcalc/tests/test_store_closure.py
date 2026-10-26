"""Sprint inbox-1 — bilattice-valued closure-rule system over PredicationStore.

This module is the answer to pyfars's inbox inquiry
``closure-rule-system-over-bilattice-valued-store``: rules whose
consequents carry an explicit ``BilatticeValue``, applied to a
:class:`PredicationStore`, with ``knowledge_join`` semantics on
collisions.

Tests verify:

- The pyfars example: a disqualification rule emits ``F`` (not just
  presence) on the consequent cell.
- Two rules emitting ``T`` and ``F`` on the same cell knowledge-join
  to ``⊤`` — the contradiction-surfacing the corpus calls for.
- Antecedent ``≥_k`` thresholds: a rule whose antecedent is ``T`` does
  not fire when the cell holds ``⊥``; does fire when the cell holds
  ``T`` or ``⊤``.
- Empty antecedents = axiom: the rule always fires.
- Fixed-point iteration terminates and produces a knowledge-stable
  store.
"""

from __future__ import annotations

from pypredcalc.algebra.bilattice import BilatticeValue
from pypredcalc.predication.cell import PredicationCell
from pypredcalc.predication.store import PredicationStore
from pypredcalc.predication.store_closure import (
    StoreClosureRuleSystem,
    StoreRule,
)

T = BilatticeValue.T
F = BilatticeValue.F
BOT = BilatticeValue.BOT
TOP = BilatticeValue.TOP


def store_with(*cells: tuple[tuple, BilatticeValue]) -> PredicationStore:
    s = PredicationStore.empty()
    for key, value in cells:
        subject, predicate, object_ = key
        s = s.insert(
            PredicationCell(
                subject=subject,
                predicate=predicate,
                object=object_,
                value=value,
            )
        )
    return s


# ---- The pyfars use case --------------------------------------------------


class TestPyfarsDisqualification:
    """Pyfars's exact example: rate-limit-exhausted ⟹ eligibility = F."""

    def test_disqualification_emits_F(self) -> None:
        rule = StoreRule(
            antecedents=(
                (("ep:groq", "rate-limit-remaining", "0"), T),
            ),
            consequents=(
                (
                    ("task:t", "eligible-by-capabilities", "ep:groq"),
                    F,
                ),
            ),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s0 = store_with(
            (("ep:groq", "rate-limit-remaining", "0"), T),
        )
        trajectory = system.forward_trajectory(s0)
        s_inf = trajectory[-1]
        # The consequent cell should hold F, not just be "present".
        cell_value = s_inf.get(
            "task:t", "eligible-by-capabilities", "ep:groq"
        )
        assert cell_value == F

    def test_does_not_fire_when_antecedent_unmet(self) -> None:
        rule = StoreRule(
            antecedents=(
                (("ep:groq", "rate-limit-remaining", "0"), T),
            ),
            consequents=(
                (
                    ("task:t", "eligible-by-capabilities", "ep:groq"),
                    F,
                ),
            ),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        # Empty store: antecedent cell is BOT, not ≥_k T.
        s0 = PredicationStore.empty()
        trajectory = system.forward_trajectory(s0)
        s_inf = trajectory[-1]
        # No consequent committed — cell remains BOT.
        assert s_inf.get(
            "task:t", "eligible-by-capabilities", "ep:groq"
        ) == BOT


# ---- Knowledge-monotone composition --------------------------------------


class TestContradictionSurfacing:
    """Two rules emitting T and F on the same cell ⟹ cell = ⊤."""

    def test_t_plus_f_yields_top(self) -> None:
        # Rule A: assert eligibility = T.
        rule_a = StoreRule(
            antecedents=(
                (("ep:openai", "capability-passes", "true"), T),
            ),
            consequents=(
                (
                    ("task:t", "eligible-by-capabilities", "ep:openai"),
                    T,
                ),
            ),
        )
        # Rule B: assert eligibility = F.
        rule_b = StoreRule(
            antecedents=(
                (("ep:openai", "rate-limit-remaining", "0"), T),
            ),
            consequents=(
                (
                    ("task:t", "eligible-by-capabilities", "ep:openai"),
                    F,
                ),
            ),
        )
        system = StoreClosureRuleSystem(rules=(rule_a, rule_b))
        s0 = store_with(
            (("ep:openai", "capability-passes", "true"), T),
            (("ep:openai", "rate-limit-remaining", "0"), T),
        )
        s_inf = system.closure(s0)
        # The cell should now be ⊤ — capability passes AND rate-limit
        # exhausted, both load-bearing facts the cell carries.
        assert s_inf.get(
            "task:t", "eligible-by-capabilities", "ep:openai"
        ) == TOP


# ---- ≥_k threshold semantics on antecedents -----------------------------


class TestAntecedentThresholds:
    """Antecedent atoms are ``≥_k V`` lower-bound formulas."""

    def test_t_antecedent_satisfied_by_t(self) -> None:
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s = store_with((("a", "p", "b"), T))
        assert system.closure(s).get("c", "q", "d") == T

    def test_t_antecedent_satisfied_by_top(self) -> None:
        # ⊤ ≥_k T (⊤ dominates everything in the knowledge order).
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s = store_with((("a", "p", "b"), TOP))
        assert system.closure(s).get("c", "q", "d") == T

    def test_t_antecedent_not_satisfied_by_bot(self) -> None:
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s = PredicationStore.empty()
        assert system.closure(s).get("c", "q", "d") == BOT

    def test_t_antecedent_not_satisfied_by_f(self) -> None:
        # F is incomparable to T in the knowledge order — neither
        # dominates the other.
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s = store_with((("a", "p", "b"), F))
        assert system.closure(s).get("c", "q", "d") == BOT

    def test_top_antecedent_requires_top(self) -> None:
        # ⊤ antecedent: only ⊤ at the cell satisfies.
        rule = StoreRule(
            antecedents=((("a", "p", "b"), TOP),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        # T does not dominate ⊤ in ≤_k.
        s_t = store_with((("a", "p", "b"), T))
        assert system.closure(s_t).get("c", "q", "d") == BOT
        # ⊤ does.
        s_top = store_with((("a", "p", "b"), TOP))
        assert system.closure(s_top).get("c", "q", "d") == T


# ---- Axiom rules (empty antecedent) --------------------------------------


class TestAxiomRule:
    def test_empty_antecedent_always_fires(self) -> None:
        rule = StoreRule(
            antecedents=(),
            consequents=((("a", "p", "b"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        # On empty store: the consequent commits anyway.
        s = system.closure(PredicationStore.empty())
        assert s.get("a", "p", "b") == T


# ---- Trajectory + fixed-point semantics ----------------------------------


class TestTrajectory:
    def test_chained_inference(self) -> None:
        """Three rules forming a chain a→b→c→d. The trajectory must
        carry each step in order."""
        rules = (
            StoreRule(
                antecedents=((("a", "p", "x"), T),),
                consequents=((("b", "p", "x"), T),),
            ),
            StoreRule(
                antecedents=((("b", "p", "x"), T),),
                consequents=((("c", "p", "x"), T),),
            ),
            StoreRule(
                antecedents=((("c", "p", "x"), T),),
                consequents=((("d", "p", "x"), T),),
            ),
        )
        system = StoreClosureRuleSystem(rules=rules)
        s0 = store_with((("a", "p", "x"), T))
        trajectory = system.forward_trajectory(s0)
        s_inf = trajectory[-1]
        for letter in ["a", "b", "c", "d"]:
            assert s_inf.get(letter, "p", "x") == T
        # The trajectory should have multiple stages (chain doesn't
        # collapse to one round under our antecedent-evaluation order).
        assert len(trajectory) >= 2

    def test_idempotent(self) -> None:
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s0 = store_with((("a", "p", "b"), T))
        once = system.closure(s0)
        twice = system.closure(once)
        assert once == twice

    def test_inflationary(self) -> None:
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), T),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s0 = store_with((("a", "p", "b"), T))
        s_inf = system.closure(s0)
        # Original cells remain.
        assert s_inf.get("a", "p", "b") == T

    def test_no_rules_is_identity(self) -> None:
        system = StoreClosureRuleSystem(rules=())
        s0 = store_with((("a", "p", "b"), T))
        trajectory = system.forward_trajectory(s0)
        assert len(trajectory) == 1
        assert trajectory[0] == s0


# ---- BOT consequents -----------------------------------------------------


class TestBotConsequent:
    """A consequent of BOT is a no-op (knowledge-join with BOT is identity)."""

    def test_bot_consequent_no_op(self) -> None:
        rule = StoreRule(
            antecedents=((("a", "p", "b"), T),),
            consequents=((("c", "q", "d"), BOT),),
        )
        system = StoreClosureRuleSystem(rules=(rule,))
        s = system.closure(store_with((("a", "p", "b"), T)))
        assert s.get("c", "q", "d") == BOT
