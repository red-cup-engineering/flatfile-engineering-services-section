"""Substrate-native work-dispatch readiness over the pypredcalc work tree.

Run as::

    python governance/skills/computing-dispatch-readiness/dispatch.py \\
           [--work-dir DIR] [--verbose] [--all] [--task SLUG]

The script is the executable side of the
``computing-dispatch-readiness`` and ``selecting-next-work`` skills,
exercised by the ``pypredcalc-executive-officer`` office.

Realises the schema in ``governance/specifications/work-dispatch-readiness.md``
by encoding the work tree (tasks, goals, briefs, offices, powers) as
a :class:`pypredcalc.predication.store.PredicationStore` and the
readiness preconditions as :class:`StoreRule` objects over the store.
Runs the closure to fixpoint; reads each task's ``dispatch-readiness``
cell; sorts by lex with prep-advancement tiebreak; reports the head.

It needs the pypredcalc source on ``sys.path``, which it arranges
itself by computing the repo root from this file's location and adding
``<repo>/src`` to the path.

Realises corpus theorem ``dispatch-as-closure-rule-system`` for the
governance-of-pypredcalc-development case: pypredcalc's own work tree
governed by pypredcalc's own substrate.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Hashable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

# Inject pypredcalc source on sys.path.
# governance/skills/computing-dispatch-readiness/dispatch.py → repo root
_REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_REPO_ROOT / "src"))

from pypredcalc.algebra.bilattice import BilatticeValue  # noqa: E402
from pypredcalc.predication.cell import PredicationCell  # noqa: E402
from pypredcalc.predication.store import PredicationStore  # noqa: E402
from pypredcalc.predication.store_closure import (  # noqa: E402
    StoreClosureRuleSystem,
    StoreRule,
)

T = BilatticeValue.T
F = BilatticeValue.F
BOT = BilatticeValue.BOT
TOP = BilatticeValue.TOP

# Terminal task / goal statuses — readiness machinery treats these as
# "out of the active queue."
TERMINAL_TASK_STATUSES = frozenset({"done", "completed", "abandoned"})
TERMINAL_GOAL_STATUSES = frozenset({"met", "abandoned", "superseded"})

# Horizon-rank for lex ordering.
HORIZON_RANK = {
    "now": 0,
    "soon": 1,
    "later": 2,
    "someday": 3,
    "done": 4,
}


# ---------------------------------------------------------------------------
# Frontmatter loader
# ---------------------------------------------------------------------------


def parse_frontmatter(path: Path) -> dict[str, Any] | None:
    """Read a markdown file's YAML frontmatter (between two ``---`` lines).

    Returns ``None`` if the file has no frontmatter.
    """
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    parts = text.split("---", maxsplit=2)
    if len(parts) < 3:
        return None
    block = parts[1]
    parsed = yaml.safe_load(block)
    if not isinstance(parsed, dict):
        return None
    return parsed


def normalise_capability_section(
    raw: Any,
) -> dict[str, BilatticeValue]:
    """Normalise the surface form of a fiber section.

    Accepts:
      - ``None`` → empty section
      - ``str`` → ``{value: T}``
      - ``list[str]`` → ``{v: T for v in list}``
      - ``dict[str, str]`` → ``{k: bilattice_from_str(v)}``
    """
    if raw is None:
        return {}
    if isinstance(raw, str):
        return {raw: T}
    if isinstance(raw, list):
        return {item: T for item in raw if isinstance(item, str)}
    if isinstance(raw, dict):
        result: dict[str, BilatticeValue] = {}
        for k, v in raw.items():
            if not isinstance(k, str):
                continue
            if isinstance(v, BilatticeValue):
                result[k] = v
            elif isinstance(v, str):
                # accept "t" / "f" / "bot" / "top"
                v_lower = v.lower()
                lookup = {b.value: b for b in BilatticeValue}
                if v_lower in lookup:
                    result[k] = lookup[v_lower]
                else:
                    result[k] = T
            elif v is True:
                result[k] = T
            elif v is False:
                result[k] = F
        return result
    return {}


@dataclass
class WorkTreeIndex:
    """Parsed frontmatter of every record in the work tree."""

    tasks: dict[str, dict[str, Any]] = field(default_factory=dict)
    goals: dict[str, dict[str, Any]] = field(default_factory=dict)
    offices: dict[str, dict[str, Any]] = field(default_factory=dict)
    powers: dict[str, dict[str, Any]] = field(default_factory=dict)
    skills: dict[str, dict[str, Any]] = field(default_factory=dict)
    briefs: dict[str, Path] = field(default_factory=dict)
    repo_root: Path = field(default_factory=Path)


def load_work_tree(repo_root: Path) -> WorkTreeIndex:
    """Walk the work tree and governance and return the parsed index."""
    index = WorkTreeIndex(repo_root=repo_root)

    # Tasks (recursive; skip _index.md).
    tasks_dir = repo_root / "work" / "tasks"
    if tasks_dir.is_dir():
        for path in tasks_dir.rglob("*.md"):
            if path.name == "_index.md":
                continue
            meta = parse_frontmatter(path)
            if meta is None or meta.get("type") != "task":
                continue
            slug = meta.get("slug") or path.stem
            meta["__path"] = path
            index.tasks[slug] = meta

    # Goals (flat).
    goals_dir = repo_root / "work" / "goals"
    if goals_dir.is_dir():
        for path in goals_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            meta = parse_frontmatter(path)
            if meta is None or meta.get("type") != "goal":
                continue
            slug = meta.get("slug") or path.stem
            meta["__path"] = path
            index.goals[slug] = meta

    # Offices (flat).
    offices_dir = repo_root / "governance" / "offices"
    if offices_dir.is_dir():
        for path in offices_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            meta = parse_frontmatter(path)
            if meta is None or meta.get("type") != "office":
                continue
            slug = meta.get("slug") or path.stem
            meta["__path"] = path
            index.offices[slug] = meta

    # Powers (flat).
    powers_dir = repo_root / "governance" / "powers"
    if powers_dir.is_dir():
        for path in powers_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            meta = parse_frontmatter(path)
            if meta is None:
                continue
            kind = meta.get("kind")
            if meta.get("type") != "jural-relation" or kind != "power":
                continue
            slug = meta.get("slug") or path.stem
            meta["__path"] = path
            index.powers[slug] = meta

    # Skills (flat).
    skills_dir = repo_root / "governance" / "skills"
    if skills_dir.is_dir():
        for path in skills_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            meta = parse_frontmatter(path)
            if meta is None:
                continue
            slug = meta.get("name") or path.stem
            meta["__path"] = path
            index.skills[slug] = meta

    # Briefs (paths only — content irrelevant; we just check existence).
    briefs_dir = repo_root / "work" / "briefs"
    if briefs_dir.is_dir():
        for path in briefs_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            relpath = str(path.relative_to(repo_root))
            index.briefs[relpath] = path

    return index


# ---------------------------------------------------------------------------
# Cell encoding
# ---------------------------------------------------------------------------


def _cell(s: Hashable, p: Hashable, o: Hashable, v: BilatticeValue = T) -> PredicationCell:
    return PredicationCell(subject=s, predicate=p, object=o, value=v)


def encode_initial_cells(index: WorkTreeIndex) -> list[PredicationCell]:
    """Produce the initial-fact cells the rules will read."""
    cells: list[PredicationCell] = []

    # Tasks.
    for slug, task in index.tasks.items():
        cells.append(_cell(slug, "kind", "task"))
        status = task.get("status", "draft")
        cells.append(_cell(slug, "status", status))
        horizon = task.get("horizon", "someday")
        cells.append(_cell(slug, "horizon", horizon))
        if "goal" in task:
            cells.append(_cell(slug, "in-goal", task["goal"]))
        # Brief precondition.
        if task.get("requires-brief") is True:
            cells.append(_cell(slug, "requires-brief", "yes"))
            brief = task.get("brief")
            if brief:
                cells.append(_cell(slug, "brief-cell", brief))
                # Compute file existence at load time.
                brief_path = index.repo_root / brief
                if brief_path.is_file():
                    cells.append(_cell(brief, "file-exists", "yes"))
        else:
            cells.append(_cell(slug, "requires-brief", "no"))
        # Dependencies.
        for dep in task.get("depends-on") or []:
            if isinstance(dep, str):
                cells.append(_cell(slug, "depends-on", dep))
        # Capability fiber.
        cap_section = normalise_capability_section(task.get("requires-capability"))
        for cap, value in cap_section.items():
            cells.append(_cell(slug, "requires-capability", cap, value))
        # Authority.
        if task.get("requires-authority"):
            cells.append(_cell(slug, "requires-authority", task["requires-authority"]))
        else:
            cells.append(_cell(slug, "requires-authority", "none"))
        # Provenance.
        if "created-at" in task:
            cells.append(_cell(slug, "created-at", str(task["created-at"])))
        priority = task.get("priority", 100)
        cells.append(_cell(slug, "priority", str(priority)))

    # Goals.
    for slug, goal in index.goals.items():
        cells.append(_cell(slug, "kind", "goal"))
        cells.append(_cell(slug, "status", goal.get("status", "active")))
        cells.append(_cell(slug, "horizon", goal.get("horizon", "someday")))
        if "owner-office" in goal:
            cells.append(_cell(slug, "owner-office", goal["owner-office"]))
        for task_slug in goal.get("tasks") or []:
            cells.append(_cell(slug, "lists-task", task_slug))
        if "created-at" in goal:
            cells.append(_cell(slug, "created-at", str(goal["created-at"])))
        priority = goal.get("priority", 100)
        cells.append(_cell(slug, "priority", str(priority)))

    # Offices.
    for slug, office in index.offices.items():
        cells.append(_cell(slug, "kind", "office"))
        skill_section = normalise_capability_section(office.get("provides-skill"))
        for skill, value in skill_section.items():
            cells.append(_cell(slug, "provides-skill", skill, value))
        # Powers held: scrape the deontic-profile dict; powers are keys
        # whose value is "power".
        deontic = office.get("deontic-profile") or {}
        if isinstance(deontic, dict):
            for power, kind in deontic.items():
                if kind == "power":
                    cells.append(_cell(slug, "holds-power", power))
        capacity = office.get("capacity", "unbounded")
        cells.append(_cell(slug, "capacity", str(capacity)))

    # Powers.
    for slug, power in index.powers.items():
        cells.append(_cell(slug, "kind", "power"))
        # active-holder: the office(s) that hold this power.
        holder = power.get("active-holder")
        if isinstance(holder, str):
            cells.append(_cell(slug, "held-by", holder))
        elif isinstance(holder, list):
            for o in holder:
                if isinstance(o, str):
                    cells.append(_cell(slug, "held-by", o))

    # Brief existence (already emitted above on a per-task basis; here
    # we additionally emit "file-exists" for every brief in the dir,
    # so dangling brief-cell references can resolve).
    for relpath, _path in index.briefs.items():
        cells.append(_cell(relpath, "file-exists", "yes"))

    return cells


# ---------------------------------------------------------------------------
# Rule generation
# ---------------------------------------------------------------------------


def make_brief_rule(task_slug: str, task: dict[str, Any]) -> list[StoreRule]:
    """Rules that emit ``(task, brief-discharged, yes) = t`` when the
    brief precondition is satisfied."""
    rules: list[StoreRule] = []
    if not task.get("requires-brief"):
        # Vacuous discharge: requires-brief=no fires the discharge axiom.
        rules.append(
            StoreRule(
                antecedents=(((task_slug, "requires-brief", "no"), T),),
                consequents=(((task_slug, "brief-discharged", "yes"), T),),
            )
        )
    else:
        brief = task.get("brief")
        if brief:
            # Discharged when requires-brief, brief-cell points at a brief, and brief exists.
            rules.append(
                StoreRule(
                    antecedents=(
                        ((task_slug, "requires-brief", "yes"), T),
                        ((task_slug, "brief-cell", brief), T),
                        ((brief, "file-exists", "yes"), T),
                    ),
                    consequents=(((task_slug, "brief-discharged", "yes"), T),),
                )
            )
        # No "blocked" rule — the brief-discharged cell stays ⊥ when the
        # brief is missing, which we read as under-determined.
    return rules


def make_dependency_rule(task_slug: str, task: dict[str, Any]) -> list[StoreRule]:
    """Rules that emit ``(task, deps-discharged, yes) = t`` when every
    dependency has ``status: done``."""
    rules: list[StoreRule] = []
    deps = [d for d in (task.get("depends-on") or []) if isinstance(d, str)]
    if not deps:
        # Vacuous: empty antecedents = always-fires axiom.
        rules.append(
            StoreRule(
                antecedents=(),
                consequents=(((task_slug, "deps-discharged", "yes"), T),),
            )
        )
    else:
        antecedents: tuple[Any, ...] = tuple(
            ((dep, "status", "done"), T) for dep in deps
        )
        rules.append(
            StoreRule(
                antecedents=antecedents,
                consequents=(((task_slug, "deps-discharged", "yes"), T),),
            )
        )
    return rules


def make_capability_rule(
    task_slug: str,
    task: dict[str, Any],
    index: WorkTreeIndex,
) -> list[StoreRule]:
    """Rules that emit ``(task, capability-matched, yes) = t`` when
    every required capability is provided by some office.

    Realises the corpus dispatch morphism's truth-meet over capability
    indices, restricted to the case where ρ_T(c) = t means "c is
    required" and σ_O(c) = t means "office O provides c."
    """
    rules: list[StoreRule] = []
    cap_section = normalise_capability_section(task.get("requires-capability"))
    required_caps = [c for c, v in cap_section.items() if v == T]

    if not required_caps:
        rules.append(
            StoreRule(
                antecedents=(),
                consequents=(((task_slug, "capability-matched", "yes"), T),),
            )
        )
        return rules

    # For each required cap, find offices that provide it. The rule
    # fires when ALL required caps are matched by some office; we
    # construct one rule per office combination that covers the caps.
    # Simplification: we emit a rule per required cap that requires
    # the cell ``(task, cap-provided, cap) = t``, then a final rule
    # that conjoins those.
    for cap in required_caps:
        # Find offices providing cap at t.
        providers = [
            o
            for o, om in index.offices.items()
            if normalise_capability_section(om.get("provides-skill")).get(cap) == T
        ]
        if not providers:
            # No provider; cell stays ⊥ → blocks readiness via the
            # composite rule.
            continue
        # Rule: any provider's provides-skill cell satisfies the cap.
        # We emit one rule per provider; any one firing sets the cell.
        for provider in providers:
            rules.append(
                StoreRule(
                    antecedents=(
                        ((provider, "provides-skill", cap), T),
                    ),
                    consequents=(((task_slug, "cap-provided", cap), T),),
                )
            )

    # Composite: capability-matched fires when every required cap is provided.
    rules.append(
        StoreRule(
            antecedents=tuple(
                ((task_slug, "cap-provided", cap), T) for cap in required_caps
            ),
            consequents=(((task_slug, "capability-matched", "yes"), T),),
        )
    )

    return rules


def make_authority_rule(
    task_slug: str,
    task: dict[str, Any],
    index: WorkTreeIndex,
) -> list[StoreRule]:
    """Rule that emits ``(task, authority-held, yes) = t`` when
    ``requires-authority`` is absent or some office holds the named power."""
    rules: list[StoreRule] = []
    required = task.get("requires-authority")

    if not required:
        rules.append(
            StoreRule(
                antecedents=(((task_slug, "requires-authority", "none"), T),),
                consequents=(((task_slug, "authority-held", "yes"), T),),
            )
        )
        return rules

    # Find offices holding the power.
    holders = [
        o for o, om in index.offices.items()
        if isinstance(om.get("deontic-profile"), dict)
        and om["deontic-profile"].get(required) == "power"
    ]
    for holder in holders:
        rules.append(
            StoreRule(
                antecedents=(
                    ((task_slug, "requires-authority", required), T),
                    ((holder, "holds-power", required), T),
                ),
                consequents=(((task_slug, "authority-held", "yes"), T),),
            )
        )
    # If no holders, no rule fires; cell stays ⊥.
    return rules


def make_goal_active_rule(
    task_slug: str,
    task: dict[str, Any],
    index: WorkTreeIndex,
) -> list[StoreRule]:
    """Rule that emits ``(task, goal-active, yes) = t`` when the parent
    goal exists and its status is non-terminal."""
    rules: list[StoreRule] = []
    goal_slug = task.get("goal")
    if not goal_slug:
        return rules
    goal = index.goals.get(goal_slug)
    if goal is None:
        return rules
    goal_status = goal.get("status")
    if goal_status in TERMINAL_GOAL_STATUSES:
        return rules
    rules.append(
        StoreRule(
            antecedents=(
                ((task_slug, "in-goal", goal_slug), T),
                ((goal_slug, "status", goal_status), T),
            ),
            consequents=(((task_slug, "goal-active", "yes"), T),),
        )
    )
    return rules


def make_status_eligible_rule(task_slug: str, task: dict[str, Any]) -> list[StoreRule]:
    """Rule that emits ``(task, status-eligible, yes) = t`` when the
    task's status is non-terminal."""
    status = task.get("status", "draft")
    if status in TERMINAL_TASK_STATUSES:
        return []
    return [
        StoreRule(
            antecedents=(((task_slug, "status", status), T),),
            consequents=(((task_slug, "status-eligible", "yes"), T),),
        )
    ]


def make_composite_readiness_rule(task_slug: str) -> list[StoreRule]:
    """Rule that emits ``(task, dispatch-readiness, t) = t`` when every
    component cell is t."""
    return [
        StoreRule(
            antecedents=(
                ((task_slug, "status-eligible", "yes"), T),
                ((task_slug, "goal-active", "yes"), T),
                ((task_slug, "brief-discharged", "yes"), T),
                ((task_slug, "deps-discharged", "yes"), T),
                ((task_slug, "capability-matched", "yes"), T),
                ((task_slug, "authority-held", "yes"), T),
            ),
            consequents=(((task_slug, "dispatch-readiness", "t"), T),),
        )
    ]


def build_rule_system(index: WorkTreeIndex) -> StoreClosureRuleSystem:
    """Assemble the readiness rule system over the work tree."""
    rules: list[StoreRule] = []
    for slug, task in index.tasks.items():
        rules.extend(make_status_eligible_rule(slug, task))
        rules.extend(make_brief_rule(slug, task))
        rules.extend(make_dependency_rule(slug, task))
        rules.extend(make_capability_rule(slug, task, index))
        rules.extend(make_authority_rule(slug, task, index))
        rules.extend(make_goal_active_rule(slug, task, index))
        rules.extend(make_composite_readiness_rule(slug))
    return StoreClosureRuleSystem(rules=tuple(rules))


# ---------------------------------------------------------------------------
# Verdict reading
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TaskVerdict:
    slug: str
    readiness: BilatticeValue  # T / F / BOT / TOP
    components: dict[str, BilatticeValue]
    horizon: str
    priority: int
    goal: str | None
    created_at: str | None


def read_verdicts(
    store: PredicationStore, index: WorkTreeIndex
) -> dict[str, TaskVerdict]:
    """Read the readiness verdict per task from the closed store."""
    verdicts: dict[str, TaskVerdict] = {}
    for slug, task in index.tasks.items():
        components = {
            "status-eligible": store.get(slug, "status-eligible", "yes"),
            "goal-active": store.get(slug, "goal-active", "yes"),
            "brief-discharged": store.get(slug, "brief-discharged", "yes"),
            "deps-discharged": store.get(slug, "deps-discharged", "yes"),
            "capability-matched": store.get(slug, "capability-matched", "yes"),
            "authority-held": store.get(slug, "authority-held", "yes"),
        }
        readiness = store.get(slug, "dispatch-readiness", "t")
        # If composite is T, readiness is T. Otherwise read off the components:
        # any F → F, any TOP → TOP, else BOT.
        if readiness == T:
            verdict_value = T
        elif any(v == TOP for v in components.values()):
            verdict_value = TOP
        elif any(v == F for v in components.values()):
            verdict_value = F
        else:
            verdict_value = BOT
        verdicts[slug] = TaskVerdict(
            slug=slug,
            readiness=verdict_value,
            components=components,
            horizon=task.get("horizon", "someday"),
            priority=int(task.get("priority", 100)),
            goal=task.get("goal"),
            created_at=str(task["created-at"]) if "created-at" in task else None,
        )
    return verdicts


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Selection:
    classification: str  # "task-ready" | "goal-needing-task" | "empty"
    task: str | None = None
    goal: str | None = None
    reason: str | None = None
    next_prep_step: str | None = None


def _task_lex_key(verdict: TaskVerdict, index: WorkTreeIndex) -> tuple[Any, ...]:
    goal = index.goals.get(verdict.goal or "")
    goal_horizon = (goal or {}).get("horizon", "someday")
    goal_priority = int((goal or {}).get("priority", 100))
    return (
        HORIZON_RANK.get(goal_horizon, 99),
        goal_priority,
        HORIZON_RANK.get(verdict.horizon, 99),
        verdict.priority,
        verdict.created_at or "",
        verdict.slug,
    )


def _goal_prep_score(
    goal_slug: str,
    index: WorkTreeIndex,
    verdicts: dict[str, TaskVerdict],
) -> tuple[Any, ...]:
    goal = index.goals[goal_slug]
    listed_slugs = [
        t for t in (goal.get("tasks") or []) if isinstance(t, str)
    ]
    goal_tasks = [verdicts[t] for t in listed_slugs if t in verdicts]
    # Missing records — slugs the goal lists with no task record on disk.
    # Count as under-determined: the prep work is filing the record.
    missing_records = sum(1 for s in listed_slugs if s not in verdicts)
    done_count = sum(
        1
        for t in index.tasks.values()
        if t.get("goal") == goal_slug
        and t.get("status") in TERMINAL_TASK_STATUSES
    )
    blocked_count = sum(1 for v in goal_tasks if v.readiness == F)
    under_count = sum(1 for v in goal_tasks if v.readiness == BOT) + missing_records
    contradicted_count = sum(1 for v in goal_tasks if v.readiness == TOP)
    return (
        HORIZON_RANK.get(goal.get("horizon", "someday"), 99),
        int(goal.get("priority", 100)),
        -done_count,
        blocked_count,
        under_count,
        contradicted_count,
        # Older goals come first within ties (longer-in-queue is signal).
        str(goal.get("created-at", "") or ""),
        goal_slug,
    )


def _explain_first_under(
    goal_slug: str,
    index: WorkTreeIndex,
    verdicts: dict[str, TaskVerdict],
) -> str:
    """Name the next prep step for a goal-needing-task fall-through.

    Order of detection (return the first match):
      1. A task slug listed in goal.tasks for which no record exists →
         "spawn the task record."
      2. An under-determined task with a non-terminal status whose
         component check explains the under-determination.
      3. Default: "spawn the next sub-task from goal.tasks."
    """
    goal = index.goals[goal_slug]
    listed = [t for t in (goal.get("tasks") or []) if isinstance(t, str)]
    # 1. Missing records first.
    for task_slug in listed:
        if task_slug not in verdicts:
            return (
                f"spawn task record '{task_slug}' under work/tasks/ "
                f"(listed in goal.tasks, no record exists)"
            )
    # 2. Under-determined non-terminal tasks.
    for task_slug in listed:
        verdict = verdicts.get(task_slug)
        if verdict is None or verdict.readiness != BOT:
            continue
        # Skip tasks whose only ⊥ is status-eligible (= terminal status).
        non_terminal_under = {
            k: v for k, v in verdict.components.items()
            if v != T and k != "status-eligible"
        }
        if not non_terminal_under:
            continue
        comp_name = next(iter(non_terminal_under))
        hint = {
            "brief-discharged": "produce the brief named by the task's brief: cell",
            "deps-discharged": "advance the task's depends-on dependencies",
            "capability-matched": "no office provides the required capability; create or amend the office",
            "authority-held": "no office holds the required authority; check requires-authority cell",
            "goal-active": "parent goal is terminal",
        }.get(comp_name, f"{comp_name} not settled")
        return f"task '{task_slug}': {hint}"
    return f"goal '{goal_slug}': spawn the next sub-task from goal.tasks"


def select(work_dir: Path) -> tuple[Selection, dict[str, TaskVerdict]]:
    """Compute the deterministic next-work selection over the work tree."""
    index = load_work_tree(work_dir)
    initial_cells = encode_initial_cells(index)
    initial_store = PredicationStore.from_cells(initial_cells)
    rule_system = build_rule_system(index)
    closed = rule_system.closure(initial_store)
    verdicts = read_verdicts(closed, index)

    ready = [v for v in verdicts.values() if v.readiness == T]
    if ready:
        ready.sort(key=lambda v: _task_lex_key(v, index))
        head = ready[0]
        return (
            Selection(
                classification="task-ready",
                task=head.slug,
                reason=f"{len(ready)} t-readiness task(s); head selected",
            ),
            verdicts,
        )

    # Fall through: most prep-advanced active goal.
    active_goals = [
        slug
        for slug, goal in index.goals.items()
        if goal.get("status") not in TERMINAL_GOAL_STATUSES
        and goal.get("horizon") != "done"
    ]
    if active_goals:
        active_goals.sort(key=lambda g: _goal_prep_score(g, index, verdicts))
        head_goal = active_goals[0]
        prep = _explain_first_under(head_goal, index, verdicts)
        return (
            Selection(
                classification="goal-needing-task",
                goal=head_goal,
                next_prep_step=prep,
                reason="no t-readiness task; head goal by prep-advancement",
            ),
            verdicts,
        )

    # Empty.
    f_count = sum(1 for v in verdicts.values() if v.readiness == F)
    bot_count = sum(1 for v in verdicts.values() if v.readiness == BOT)
    top_count = sum(1 for v in verdicts.values() if v.readiness == TOP)
    return (
        Selection(
            classification="empty",
            reason=(
                f"no active goals; readiness aggregate: "
                f"f={f_count} bot={bot_count} top={top_count}"
            ),
        ),
        verdicts,
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _format_verdict(v: TaskVerdict) -> str:
    sym = {T: "t", F: "f", BOT: "⊥", TOP: "⊤"}[v.readiness]
    return f"  [{sym}] {v.slug:50s} h={v.horizon:8s} goal={v.goal or '-'}"


def _format_components(v: TaskVerdict) -> str:
    sym = {T: "t", F: "f", BOT: "⊥", TOP: "⊤"}
    parts = [f"{k}={sym[val]}" for k, val in v.components.items()]
    return "    " + " ".join(parts)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=_REPO_ROOT,
        help="Repository root containing work/ and governance/ (default: pypredcalc repo).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Print every task's readiness verdict, not just the head.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show per-component readiness for each task.",
    )
    parser.add_argument(
        "--task",
        type=str,
        default=None,
        help="Print the readiness witness for one specific task.",
    )
    args = parser.parse_args(argv)

    selection, verdicts = select(args.work_dir)

    if args.task:
        v = verdicts.get(args.task)
        if v is None:
            print(f"task not found: {args.task}", file=sys.stderr)
            return 2
        print(_format_verdict(v))
        print(_format_components(v))
        return 0

    if args.all:
        ordered = sorted(verdicts.values(), key=lambda v: (v.readiness.value, v.slug))
        for v in ordered:
            print(_format_verdict(v))
            if args.verbose:
                print(_format_components(v))
        print()

    if selection.classification == "task-ready":
        assert selection.task is not None
        print(f"NEXT: {selection.task}")
        print("  classification: task-ready")
        print(f"  reason: {selection.reason}")
        if args.verbose:
            v = verdicts[selection.task]
            print(_format_components(v))
        return 0
    elif selection.classification == "goal-needing-task":
        print(f"NEXT: (goal-needing-task) {selection.goal}")
        print("  classification: goal-needing-task")
        print(f"  prep step: {selection.next_prep_step}")
        print(f"  reason: {selection.reason}")
        return 0
    else:
        print("NEXT: (empty)")
        print(f"  reason: {selection.reason}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
