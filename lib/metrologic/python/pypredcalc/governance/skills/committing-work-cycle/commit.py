"""Draft a commit message for the close of a work cycle.

Run as::

    python governance/skills/committing-work-cycle/commit.py \\
           <task-slug> [<task-slug> ...] \\
           [--domain <prefix>] [--advance <slug> ...] [--verify]

The script reads each named task record under ``work/tasks/``,
verifies that its ``status:`` cell is in a terminal state and that
the acceptance section's bullets are checked, and emits a draft
commit message conformant to
``governance/specifications/commit-message-format.md``.

Output goes to stdout; the office holder edits the draft and runs
``git commit`` themselves. The script does NOT invoke git directly —
path selection and the commit act stay explicit.

Realises the executable side of the
``committing-work-cycle`` skill, exercised by holders of
``commit-changes`` (developer, records-officer, release-officer).
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml  # type: ignore[import-untyped]

# governance/skills/committing-work-cycle/commit.py → repo root
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
WORK_DIR = REPO_ROOT / "work"

TERMINAL_STATUSES = frozenset({"done", "partial", "stalled", "abandoned"})


@dataclass(frozen=True)
class TaskRecord:
    slug: str
    path: Path
    title: str
    status: str
    acceptance_total: int
    acceptance_checked: int

    @property
    def acceptance_complete(self) -> bool:
        return (
            self.acceptance_total > 0
            and self.acceptance_checked == self.acceptance_total
        )


def find_task(slug: str) -> Path:
    """Locate a task record by slug under ``work/tasks/``."""
    for path in WORK_DIR.glob("**/*.md"):
        if path.name == "_index.md":
            continue
        if path.stem == slug:
            return path
    raise FileNotFoundError(
        f"no task record matching slug {slug!r} under {WORK_DIR}"
    )


def split_frontmatter(text: str) -> tuple[dict, str]:
    """Return (frontmatter dict, body text). Empty fm if missing."""
    if not text.startswith("---\n"):
        return ({}, text)
    end = text.find("\n---\n", 4)
    if end == -1:
        return ({}, text)
    fm_text = text[4:end]
    body = text[end + 5 :]
    fm = yaml.safe_load(fm_text) or {}
    return (fm, body)


def count_acceptance(body: str) -> tuple[int, int]:
    """Return (total, checked) acceptance bullets in the body.

    Looks for the first ``## Acceptance`` heading and counts the
    GFM task-list items beneath it until the next ``##`` heading.
    """
    lines = body.splitlines()
    in_section = False
    total = 0
    checked = 0
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("## "):
            heading = stripped[3:].strip().lower()
            if in_section:
                break
            if heading == "acceptance":
                in_section = True
                continue
        if not in_section:
            continue
        m = re.match(r"^\s*-\s*\[( |x|X)\]\s+", line)
        if m:
            total += 1
            if m.group(1).lower() == "x":
                checked += 1
    return (total, checked)


def first_paragraph(body: str) -> str:
    """Return the first paragraph of body content (skipping the H1).

    Used for an at-most-one-line summary in the commit body.
    """
    lines = body.splitlines()
    paragraph: list[str] = []
    started = False
    for line in lines:
        if line.startswith("# "):
            continue
        if line.startswith("## "):
            if started:
                break
            continue
        stripped = line.strip()
        if not stripped:
            if started:
                break
            continue
        started = True
        paragraph.append(stripped)
    return " ".join(paragraph)


def load_task(slug: str) -> TaskRecord:
    path = find_task(slug)
    text = path.read_text()
    fm, body = split_frontmatter(text)
    title = fm.get("title", slug)
    status = fm.get("status", "")
    total, checked = count_acceptance(body)
    return TaskRecord(
        slug=slug,
        path=path,
        title=title,
        status=status,
        acceptance_total=total,
        acceptance_checked=checked,
    )


def derive_domain(closing: list[TaskRecord]) -> str:
    """Best-effort domain prefix from the closing tasks' file paths."""
    candidates: set[str] = set()
    for task in closing:
        rel = task.path.relative_to(REPO_ROOT)
        parts = rel.parts
        if parts[0] == "work":
            if "engineering" in parts:
                # work/tasks/engineering/<slug>.md
                # use the slug's domain hint heuristically — fall back to "work".
                candidates.add("work")
            elif "governance" in parts:
                candidates.add("governance")
            else:
                candidates.add("work")
    if not candidates:
        return "work"
    return "+".join(sorted(candidates))


def imperative_summary(task: TaskRecord) -> str:
    """One-line imperative summary derived from the task's title."""
    title = task.title
    title = re.sub(r"^Realize\b", "realize", title, count=1)
    title = re.sub(r"^Add\b", "add", title, count=1)
    title = re.sub(r"^Fix\b", "fix", title, count=1)
    title = re.sub(r"^Update\b", "update", title, count=1)
    title = re.sub(r"^Remove\b", "remove", title, count=1)
    return title


def draft_message(
    closing: list[TaskRecord],
    advancing: list[TaskRecord],
    domain: str | None,
) -> str:
    if not closing and not advancing:
        raise ValueError("must name at least one closing or advancing task")

    if domain is None:
        domain = derive_domain(closing or advancing)

    if closing:
        if len(closing) == 1:
            subject_summary = imperative_summary(closing[0])
        else:
            heads = ", ".join(imperative_summary(t).split(":")[0] for t in closing[:2])
            subject_summary = heads
            if len(closing) > 2:
                subject_summary += f" (+{len(closing) - 2} more)"
    else:
        subject_summary = "advance " + imperative_summary(advancing[0])

    subject = f"{domain}: {subject_summary}"
    if len(subject) > 72:
        subject = subject[:69] + "..."

    body_lines: list[str] = []
    for task in closing:
        body_lines.append(
            f"Closes {task.slug}: {imperative_summary(task)}."
        )
    for task in advancing:
        body_lines.append(
            f"Advances {task.slug}: {imperative_summary(task)}."
        )

    return f"{subject}\n\n" + "\n".join(body_lines) + "\n"


def verify(closing: list[TaskRecord]) -> list[str]:
    """Check duty preconditions; return a list of human-readable issues."""
    issues: list[str] = []
    for task in closing:
        if task.status not in TERMINAL_STATUSES:
            issues.append(
                f"task {task.slug!r}: status is {task.status!r}, "
                f"not in {sorted(TERMINAL_STATUSES)} — "
                f"closing-commit duty requires terminal status before commit"
            )
        if task.status == "done" and not task.acceptance_complete:
            issues.append(
                f"task {task.slug!r}: status is 'done' but "
                f"{task.acceptance_total - task.acceptance_checked} "
                f"of {task.acceptance_total} acceptance bullets unchecked"
            )
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "closing",
        nargs="*",
        help="task slug(s) the commit closes (terminal status required)",
    )
    parser.add_argument(
        "--advance",
        nargs="*",
        default=[],
        help="task slug(s) the commit advances but does not close",
    )
    parser.add_argument(
        "--domain",
        default=None,
        help="commit-message domain prefix (heuristic if omitted)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="verify duty preconditions; exit 1 if any are violated",
    )
    args = parser.parse_args()

    if not args.closing and not args.advance:
        parser.error("must name at least one closing or --advance task slug")

    try:
        closing = [load_task(s) for s in args.closing]
        advancing = [load_task(s) for s in args.advance]
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.verify:
        issues = verify(closing)
        if issues:
            print("verify FAILED:", file=sys.stderr)
            for issue in issues:
                print(f"  - {issue}", file=sys.stderr)
            return 1
        print("verify OK", file=sys.stderr)

    print(draft_message(closing, advancing, args.domain))
    return 0


if __name__ == "__main__":
    sys.exit(main())
