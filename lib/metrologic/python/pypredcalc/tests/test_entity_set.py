"""Tests for EntitySet."""

import pytest

from pypredcalc.predication import EntitySet


class TestEntitySet:
    def test_construct_from_tuple(self) -> None:
        es = EntitySet(("a", "b", "c"))
        assert len(es) == 3
        assert es.index("b") == 1

    def test_of_dedupes_preserving_order(self) -> None:
        es = EntitySet.of(["c", "a", "b", "a", "c"])
        assert es.entities == ("c", "a", "b")

    def test_duplicate_entities_raise(self) -> None:
        with pytest.raises(ValueError, match="unique"):
            EntitySet(("a", "b", "a"))

    def test_index_missing_raises(self) -> None:
        es = EntitySet.of(["x", "y"])
        with pytest.raises(KeyError):
            es.index("z")

    def test_union_preserves_lhs_order(self) -> None:
        a = EntitySet.of(["x", "y"])
        b = EntitySet.of(["y", "z"])
        assert a.union(b).entities == ("x", "y", "z")

    def test_intersection_preserves_lhs_order(self) -> None:
        a = EntitySet.of(["x", "y", "z"])
        b = EntitySet.of(["z", "x"])
        assert a.intersection(b).entities == ("x", "z")

    def test_iteration(self) -> None:
        es = EntitySet.of(["a", "b"])
        assert list(es) == ["a", "b"]
