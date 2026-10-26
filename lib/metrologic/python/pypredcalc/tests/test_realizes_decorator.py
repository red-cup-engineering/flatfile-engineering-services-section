"""Tests for the ``@realizes`` decorator."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from pypredcalc._realizes import ATTRIBUTE, realizes


def test_realizes_attaches_slug_to_function() -> None:
    @realizes("objects/foo")
    def f(x: int) -> int:
        return x + 1

    assert f.__realizes__ == ("objects/foo",)
    assert f(1) == 2  # decorator preserves behaviour


def test_realizes_attaches_slug_to_class() -> None:
    @realizes("objects/widget")
    class Widget:
        pass

    assert Widget.__realizes__ == ("objects/widget",)


def test_realizes_stacks_with_dataclass() -> None:
    @realizes("objects/point")
    @dataclass(frozen=True)
    class Point:
        x: int
        y: int

    assert Point.__realizes__ == ("objects/point",)
    p = Point(1, 2)
    assert p.x == 1


def test_multiple_realizes_accumulate() -> None:
    @realizes("objects/foo")
    @realizes("morphisms/bar")
    def f() -> None:
        pass

    # Decorators apply bottom-up, so morphisms/bar is attached first.
    assert f.__realizes__ == ("morphisms/bar", "objects/foo")


def test_realizes_attaches_to_method() -> None:
    class Host:
        @realizes("morphisms/op")
        def op(self) -> int:
            return 7

    assert Host.op.__realizes__ == ("morphisms/op",)
    assert Host().op() == 7


def test_realizes_rejects_non_string() -> None:
    with pytest.raises(TypeError, match="must be a string slug"):
        realizes(42)  # type: ignore[arg-type]


def test_realizes_rejects_empty_string() -> None:
    with pytest.raises(ValueError, match="non-empty"):
        realizes("")


def test_attribute_constant_matches_dunder() -> None:
    assert ATTRIBUTE == "__realizes__"
