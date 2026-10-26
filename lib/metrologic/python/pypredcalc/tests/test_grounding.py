"""Smoke tests for ``ground_rule``.

The grounder lowers a :class:`FiberClosureRule` to flat
:class:`StoreRule`s. We check it on two shapes: a quantifier-free
dispatch-style rule (subset cover, free vars only) and a ∀-blocked
rule (one ∀-bound antecedent, free var in consequent). For each, the
fixed point reached by the grounded ``StoreClosureRuleSystem`` should
match a hand-computed expected store.
"""
from __future__ import annotations

from pypredcalc import (
    BilatticeValue,
    CellAtom,
    Const,
    FiberClosureRule,
    PredicationCell,
    PredicationStore,
    StoreClosureRuleSystem,
    Var,
    ground_rule,
)
from pypredcalc.predication import And, Or


def _store(cells):
    return PredicationStore.from_cells(
        PredicationCell(subject=s, predicate=p, object=o, value=v)
        for (s, p, o, v) in cells
    )


def _closure(store, rules):
    return StoreClosureRuleSystem(rules=tuple(rules)).closure(store)


# ---- Quantifier-free: dispatch-style subset-cover rule -------------------


def test_grounds_quantifier_free_dispatch_rule():
    """Rule:
        (W, requires-cap, C) ∧ (D, provides-cap, C) ⟹ (W, eligible, D)
    Free vars: W, D, C. No ∀-block. Carrier: {w1, d1, d2, c1}.
    """
    T = (1, 0)  # boolean-twist encoding of FOUR.T
    rule = FiberClosureRule(
        free_vars=("W", "D", "C"),
        forall_vars=(),
        antecedent=And(parts=(
            CellAtom(
                predicate="requires-cap",
                subject=Var("W"), object_=Var("C"), threshold=T,
            ),
            CellAtom(
                predicate="provides-cap",
                subject=Var("D"), object_=Var("C"), threshold=T,
            ),
        )),
        consequent=CellAtom(
            predicate="eligible",
            subject=Var("W"), object_=Var("D"), threshold=T,
        ),
    )
    entities = ("w1", "d1", "d2", "c1")
    store = _store([
        ("w1", "requires-cap", "c1", BilatticeValue.T),
        ("d1", "provides-cap", "c1", BilatticeValue.T),
        # d2 does not provide c1
    ])

    grounded = ground_rule(rule, entities)
    closed = _closure(store, grounded)

    # d1 should be eligible for w1; d2 should not.
    assert closed.get("w1", "eligible", "d1") == BilatticeValue.T
    assert closed.get("w1", "eligible", "d2") == BilatticeValue.BOT


# ---- ∀-blocked: vacancy as universal absence -----------------------------


def test_grounds_forall_blocked_rule():
    """Rule:
        (∀ P. (P, holds, O) = ⊥)  ⟹  (O, vacant, true)

    "An office O is vacant if no personnel P holds it." We can't state
    "= ⊥" directly (CellAtom thresholds are positive in ≥_k, and ⊥ is
    the bottom), but we *can* state the dual: the consequent fires
    whenever the antecedent — for every P, at least the trivial atom
    `(P, holds, O) ≥_k ⊥` (always true) — is satisfied. That makes
    every office vacant, which is wrong for vacancy-detection.

    For this smoke test we instead check the grounder's mechanical
    behavior on a ∀-blocked rule: the antecedent expands to a
    conjunction across the carrier. We use a positive uniform rule:

        (∀ P. (P, type, person) = T)  ⟹  (O, all-persons-typed, true)

    This fires iff *every* entity in the carrier carries the
    ``type=person`` cell. In our fixture only some do, so the
    consequent does not fire. We then add the missing cells and
    confirm the consequent fires.
    """
    T = (1, 0)
    rule = FiberClosureRule(
        free_vars=("O",),
        forall_vars=("P",),
        antecedent=CellAtom(
            predicate="type",
            subject=Var("P"), object_=Const("person"), threshold=T,
        ),
        consequent=CellAtom(
            predicate="all-persons-typed",
            subject=Var("O"), object_=Const("true"), threshold=T,
        ),
    )
    entities = ("o1", "p1", "p2")
    # Only p1 typed person, p2 not.
    partial_store = _store([
        ("p1", "type", "person", BilatticeValue.T),
    ])
    full_store = _store([
        ("p1", "type", "person", BilatticeValue.T),
        ("p2", "type", "person", BilatticeValue.T),
        # o1 too, since the ∀ ranges over the entire carrier
        ("o1", "type", "person", BilatticeValue.T),
    ])

    grounded = ground_rule(rule, entities)
    # Grounded rule list: one StoreRule per O-binding (3), each with
    # antecedent being a conjunction of |entities| substituted atoms.
    assert len(grounded) == 3
    for r in grounded:
        assert len(r.antecedents) == 3  # one per ∀-binding

    partial_closed = _closure(partial_store, grounded)
    full_closed = _closure(full_store, grounded)

    # In the partial store, p2 is not typed person — antecedent fails
    # for every O.
    assert partial_closed.get("o1", "all-persons-typed", "true") == BilatticeValue.BOT
    # In the full store, the antecedent succeeds for every O.
    assert full_closed.get("o1", "all-persons-typed", "true") == BilatticeValue.T
    assert full_closed.get("p1", "all-persons-typed", "true") == BilatticeValue.T


# ---- F-emitting (disqualification) consequent ---------------------------


def test_grounds_disqualification_rule_emitting_F():
    """Rule:
        (D, rate-limit-remaining, 0) = T  ⟹  (W, eligible, D) = F

    With both T-emitting and F-emitting rules over the same cell, a
    contradiction surfaces as ⊤ — the corpus's load-bearing claim.
    """
    T = (1, 0)
    F = (0, 1)
    pos_rule = FiberClosureRule(
        free_vars=("W", "D"),
        forall_vars=(),
        antecedent=CellAtom(
            predicate="ok-to-dispatch",
            subject=Var("D"), object_=Const("true"), threshold=T,
        ),
        consequent=CellAtom(
            predicate="eligible",
            subject=Var("W"), object_=Var("D"), threshold=T,
        ),
    )
    neg_rule = FiberClosureRule(
        free_vars=("W", "D"),
        forall_vars=(),
        antecedent=CellAtom(
            predicate="rate-limit-remaining",
            subject=Var("D"), object_=Const("0"), threshold=T,
        ),
        consequent=CellAtom(
            predicate="eligible",
            subject=Var("W"), object_=Var("D"), threshold=F,
        ),
    )
    entities = ("w1", "d1")
    store = _store([
        ("d1", "ok-to-dispatch", "true", BilatticeValue.T),
        ("d1", "rate-limit-remaining", "0", BilatticeValue.T),
    ])
    grounded = ground_rule(pos_rule, entities) + ground_rule(neg_rule, entities)
    closed = _closure(store, grounded)
    # Both T and F fired on (w1, eligible, d1) → knowledge-join → ⊤.
    assert closed.get("w1", "eligible", "d1") == BilatticeValue.TOP


# ---- Or in antecedent expands via DNF -----------------------------------


def test_grounds_or_antecedent_emits_one_rule_per_disjunct():
    """Rule:
        (W, has-tag, urgent) ∨ (W, has-tag, escalated) ⟹ (W, prioritised, true)

    DNF: two disjuncts → two StoreRules per W-binding.
    """
    T = (1, 0)
    rule = FiberClosureRule(
        free_vars=("W",),
        forall_vars=(),
        antecedent=Or(parts=(
            CellAtom(
                predicate="has-tag",
                subject=Var("W"), object_=Const("urgent"), threshold=T,
            ),
            CellAtom(
                predicate="has-tag",
                subject=Var("W"), object_=Const("escalated"), threshold=T,
            ),
        )),
        consequent=CellAtom(
            predicate="prioritised",
            subject=Var("W"), object_=Const("true"), threshold=T,
        ),
    )
    entities = ("w1", "w2")
    store = _store([
        ("w1", "has-tag", "urgent", BilatticeValue.T),
        ("w2", "has-tag", "escalated", BilatticeValue.T),
    ])
    grounded = ground_rule(rule, entities)
    # 2 W-bindings × 2 disjuncts = 4 StoreRules.
    assert len(grounded) == 4
    closed = _closure(store, grounded)
    assert closed.get("w1", "prioritised", "true") == BilatticeValue.T
    assert closed.get("w2", "prioritised", "true") == BilatticeValue.T
