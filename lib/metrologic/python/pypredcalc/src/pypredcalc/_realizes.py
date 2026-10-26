"""``@realizes(corpus_slug)`` — attach a corpus-theory pointer to a Python entity.

pypredcalc is the Python realisation of the predication-categories corpus.
Each Python class / function / method that realises a corpus entity carries
a ``@realizes("...")`` decoration naming the corpus slug it realises. The
binding direction is **Python → theory**: pypredcalc is authoritative for
which Python symbol realises which corpus entity, and a separate audit
walks pypredcalc to verify every slug resolves to a real corpus markdown
file.

This is the inverse of the older "theory points into Python via
``python:`` frontmatter" convention. Putting the binding in Python keeps
it next to the code that actually realises the math.

Slug format
-----------

A slug is a relative path inside the predication-categories corpus root,
omitting the ``.md`` extension. Examples::

    @realizes("objects/predicate-category")
    @realizes("morphisms/twist-product-fusion")
    @realizes("concepts/predication-cell")

For methods, the slug names the corpus entity the method realises (often
a morphism whose Python form is a method of a host class, like the
fiber-algebra fusion ``⊙`` realised as :meth:`TwistBilattice.fusion`).

Stacking with ``@dataclass``
----------------------------

Apply ``@realizes`` *outside* ``@dataclass`` so the dataclass is fully
constructed before the corpus pointer is attached::

    @realizes("objects/twist-product")
    @dataclass(frozen=True)
    class TwistBilattice:
        ...

Multiple ``@realizes`` calls accumulate — a single Python entity can
realise several corpus entities (uncommon but supported).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

#: Attribute name used to store the corpus-slug tuple on a decorated entity.
ATTRIBUTE = "__realizes__"


def realizes(corpus_slug: str) -> Callable[[T], T]:
    """Mark a Python entity as realising the corpus entity at ``corpus_slug``.

    The decorator attaches a tuple of slugs to the entity's
    :data:`ATTRIBUTE` (``__realizes__``); successive decorations append.
    """
    if not isinstance(corpus_slug, str):
        raise TypeError(
            f"@realizes argument must be a string slug, got {type(corpus_slug).__name__}"
        )
    if not corpus_slug:
        raise ValueError("@realizes slug must be non-empty")

    def decorator(obj: T) -> T:
        existing = getattr(obj, ATTRIBUTE, ())
        try:
            setattr(obj, ATTRIBUTE, (*existing, corpus_slug))
        except (AttributeError, TypeError) as exc:
            raise TypeError(
                f"@realizes cannot decorate {obj!r}: cannot set "
                f"{ATTRIBUTE} attribute ({exc})"
            ) from exc
        return obj

    return decorator


__all__ = ["ATTRIBUTE", "realizes"]
