"""Audit the pypredcalc ↔ corpus binding in both directions.

Run as::

    python governance/skills/running-corpus-binding-audit/audit.py \\
           [--corpus-root DIR] [--package pypredcalc] [--report-orphans]

The script is the executable side of the
``running-corpus-binding-audit`` and
``auditing-corpus-realization-coverage`` skills, exercised by the
``pypredcalc-corpus-tracker`` office via the ``run-corpus-binding-audit``
power. It needs the pypredcalc source on ``sys.path``, which it arranges
itself by computing the repo root from this file's location and adding
``<repo>/src`` to the path. Pass ``--package`` to target a different
package (rare).

Output sections:

  * **Python → corpus**: every ``@realizes`` decoration in pypredcalc
    must name a slug that resolves to a corpus markdown file.
  * **Coverage**: how many corpus atoms (concepts/objects/morphisms/
    theorems/examples) have a pypredcalc realisation.
  * **Orphans** (with ``--report-orphans``): the unrealised corpus
    atoms — the worklist for what still needs Python.

Exit code is ``0`` iff every ``@realizes`` slug resolves.
"""

from __future__ import annotations

import argparse
import importlib
import inspect
import pkgutil
import sys
from collections import defaultdict
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType


# --- path bootstrap -----------------------------------------------------------

_THIS_FILE = Path(__file__).resolve()
# governance/skills/running-corpus-binding-audit/audit.py → repo root
_REPO_ROOT = _THIS_FILE.parent.parent.parent.parent
_SRC = _REPO_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

DEFAULT_CORPUS_ROOT = Path(
    "/home/emsenn/561/theories/theories/humanities/theories/math/"
    "theories/categories/theories/predication-categories"
)

# Atom directories rolled up in the coverage report. A realisation
# pointing at any of these counts toward that type's coverage.
ATOM_TYPES = ("concepts", "objects", "morphisms", "theorems", "examples")
# Wider set used only for slug-resolution: a ``@realizes`` slug may
# point at a corpus question without contributing to coverage.
RESOLVABLE_TYPES = (*ATOM_TYPES, "questions")


# --- realisation collection ---------------------------------------------------


@dataclass(frozen=True)
class Realization:
    """A single ``@realizes`` decoration found in the target package.

    ``qualified_name`` is the canonical Python location of the decorated
    entity — ``module.QualName`` for a class, ``module.QualName.method``
    for a method. Re-exports through ``__init__.py`` are collapsed onto
    the canonical defining module.
    """

    qualified_name: str
    corpus_slug: str


def _walk_modules(package: str) -> Iterator[ModuleType]:
    """Yield every module under ``package`` (including subpackages)."""
    root = importlib.import_module(package)
    yield root
    pkg_path = getattr(root, "__path__", None)
    if not pkg_path:
        return
    for module_info in pkgutil.walk_packages(pkg_path, prefix=f"{package}."):
        try:
            yield importlib.import_module(module_info.name)
        except ImportError:
            continue


def _canonical_class_name(cls: type) -> str:
    return f"{cls.__module__}.{cls.__qualname__}"


def collect_realizations(package: str) -> list[Realization]:
    """Walk ``package``; return every distinct ``@realizes`` declaration.

    Deduplication: two decorated classes are *the same* iff they have
    the same canonical ``module.qualname`` — so re-exports through
    package-level ``__init__.py`` files don't multiply-count.
    """
    by_canonical: dict[tuple[str, str], None] = {}

    for module in _walk_modules(package):
        if not module.__name__.startswith(package):
            continue
        for name, obj in inspect.getmembers(module):
            if name.startswith("_"):
                continue
            # Class — only count it under its canonical defining module.
            if inspect.isclass(obj):
                if obj.__module__ != module.__name__:
                    continue
                qualified = _canonical_class_name(obj)
                for slug in _direct_realizes(obj):
                    by_canonical[(qualified, slug)] = None
                # Methods on the class.
                for attr_name in dir(obj):
                    if attr_name.startswith("_"):
                        continue
                    method = inspect.getattr_static(obj, attr_name, None)
                    for slug in _direct_realizes(method):
                        method_qn = f"{qualified}.{attr_name}"
                        by_canonical[(method_qn, slug)] = None
            # Function defined in this module.
            elif inspect.isfunction(obj):
                if getattr(obj, "__module__", None) != module.__name__:
                    continue
                qualified = f"{module.__name__}.{obj.__qualname__}"
                for slug in _direct_realizes(obj):
                    by_canonical[(qualified, slug)] = None

    return [
        Realization(qualified, slug) for qualified, slug in by_canonical
    ]


def _direct_realizes(obj: object) -> tuple[str, ...]:
    """Return the entity's own ``__realizes__`` tuple, ignoring inheritance.

    A subclass inherits its parent's ``__realizes__`` attribute through
    Python's normal attribute lookup; we don't want that — only entities
    *directly* decorated should count. Using ``__dict__`` rather than
    ``getattr`` confines us to direct attribution.
    """
    if obj is None:
        return ()
    own = getattr(obj, "__dict__", {}).get("__realizes__")
    if own is None:
        return ()
    return tuple(own)


# --- corpus traversal ---------------------------------------------------------


def _resolve_slug(slug: str, corpus_root: Path) -> Path | None:
    """Return the corpus markdown file ``slug`` points at, or ``None``."""
    if not slug or slug.startswith("/") or ".." in slug.split("/"):
        return None
    candidate = corpus_root / f"{slug}.md"
    return candidate if candidate.is_file() else None


def collect_corpus_atoms(
    corpus_root: Path, types: Iterable[str] = ATOM_TYPES
) -> dict[str, set[str]]:
    """Return ``{type: {slug, ...}}`` for the requested atom types.

    A slug is the relative path under ``corpus_root``, ``"<type>/<stem>"``,
    excluding the per-directory ``_index.md``.
    """
    out: dict[str, set[str]] = {t: set() for t in types}
    for typedir in types:
        dir_path = corpus_root / typedir
        if not dir_path.is_dir():
            continue
        for md in dir_path.glob("*.md"):
            if md.stem == "_index":
                continue
            out[typedir].add(f"{typedir}/{md.stem}")
    return out


# --- audit ---------------------------------------------------------------------


@dataclass(frozen=True)
class AuditResult:
    realizations: list[Realization]
    broken: list[tuple[Realization, str]]
    realized_slugs: set[str]
    atoms_by_type: dict[str, set[str]]


def run_audit(package: str, corpus_root: Path) -> AuditResult:
    realizations = collect_realizations(package)
    broken: list[tuple[Realization, str]] = []
    realized_slugs: set[str] = set()
    for r in realizations:
        path = _resolve_slug(r.corpus_slug, corpus_root)
        if path is None:
            broken.append((r, f"no corpus file at {corpus_root}/{r.corpus_slug}.md"))
        else:
            realized_slugs.add(r.corpus_slug)
    atoms = collect_corpus_atoms(corpus_root)
    return AuditResult(realizations, broken, realized_slugs, atoms)


# --- reporting -----------------------------------------------------------------


def report(result: AuditResult, *, show_orphans: bool) -> int:
    print("theory-comparison audit")
    print("=======================")
    print()
    print(f"  Python → corpus  ({len(result.realizations)} unique decorations)")
    print(f"    resolved:   {len(result.realizations) - len(result.broken)}")
    print(f"    broken:     {len(result.broken)}")
    if result.broken:
        print()
        for r, reason in result.broken:
            print(f"      {r.qualified_name}")
            print(f"        slug: {r.corpus_slug}")
            print(f"        reason: {reason}")

    print()
    print("  Coverage  (corpus atoms with a pypredcalc realisation)")
    overall_total = 0
    overall_realized = 0
    by_type: dict[str, list[str]] = defaultdict(list)
    for r in result.realizations:
        head = r.corpus_slug.split("/", 1)[0]
        by_type[head].append(r.corpus_slug)
    for typedir in ATOM_TYPES:
        total = len(result.atoms_by_type.get(typedir, set()))
        realized = len(set(by_type.get(typedir, [])) & result.atoms_by_type.get(typedir, set()))
        overall_total += total
        overall_realized += realized
        pct = (100 * realized // total) if total else 0
        print(f"    {typedir:<12} {realized:>3} / {total:<3}   {pct:>3}%")
    overall_pct = (100 * overall_realized // overall_total) if overall_total else 0
    print(f"    {'overall':<12} {overall_realized:>3} / {overall_total:<3}   {overall_pct:>3}%")

    if show_orphans:
        print()
        print("  Orphans  (corpus atoms with no pypredcalc realisation)")
        for typedir in ATOM_TYPES:
            atoms = sorted(result.atoms_by_type.get(typedir, set()) - result.realized_slugs)
            if not atoms:
                continue
            print(f"    {typedir} ({len(atoms)}):")
            for slug in atoms:
                print(f"      {slug}")

    return 1 if result.broken else 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Audit the pypredcalc ↔ corpus realisation graph.",
    )
    ap.add_argument("--package", default="pypredcalc")
    ap.add_argument("--corpus-root", type=Path, default=DEFAULT_CORPUS_ROOT)
    ap.add_argument(
        "--report-orphans",
        action="store_true",
        help="List unrealised corpus atoms (the worklist for further "
        "pypredcalc development).",
    )
    args = ap.parse_args()

    if not args.corpus_root.is_dir():
        print(f"error: corpus root {args.corpus_root} is not a directory",
              file=sys.stderr)
        return 2

    result = run_audit(args.package, args.corpus_root)
    return report(result, show_orphans=args.report_orphans)


if __name__ == "__main__":
    sys.exit(main())
