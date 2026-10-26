"""Tests for predication cells and stores."""

import pytest

from pypredcalc import BilatticeValue, PredicationCell, PredicationStore

T = BilatticeValue.T
F = BilatticeValue.F
BOT = BilatticeValue.BOT
TOP = BilatticeValue.TOP


class TestPredicationCell:
    def test_key_excludes_value(self) -> None:
        cell = PredicationCell("alice", "trusts", "bob", T)
        assert cell.key == ("alice", "trusts", "bob")

    def test_default_value_is_t(self) -> None:
        cell = PredicationCell("a", "b", "c")
        assert cell.value is T

    def test_frozen(self) -> None:
        cell = PredicationCell("a", "b", "c", F)
        with pytest.raises((AttributeError, TypeError)):
            cell.value = T  # type: ignore[misc]

    def test_equality(self) -> None:
        c1 = PredicationCell("a", "b", "c", T)
        c2 = PredicationCell("a", "b", "c", T)
        assert c1 == c2

    def test_inequality_on_value(self) -> None:
        assert PredicationCell("a", "b", "c", T) != PredicationCell("a", "b", "c", F)

    def test_hashable(self) -> None:
        cell = PredicationCell("a", "b", "c", T)
        assert cell in {cell}


class TestPredicationStore:
    def test_empty_store(self) -> None:
        assert list(PredicationStore.empty().cells()) == []

    def test_insert_and_get(self) -> None:
        store = PredicationStore.empty().insert(PredicationCell("alice", "trusts", "bob", T))
        assert store.get("alice", "trusts", "bob") is T

    def test_get_default(self) -> None:
        store = PredicationStore.empty()
        assert store.get("x", "y", "z") is BOT
        assert store.get("x", "y", "z", default=F) is F

    def test_merge_same_key_knowledge_join(self) -> None:
        store = PredicationStore.from_cells([
            PredicationCell("a", "b", "c", T),
            PredicationCell("a", "b", "c", F),
        ])
        assert store.get("a", "b", "c") is TOP

    def test_merge_same_key_idempotent(self) -> None:
        cell = PredicationCell("a", "b", "c", T)
        store = PredicationStore.from_cells([cell, cell])
        assert store.get("a", "b", "c") is T

    def test_from_cells_multiple_keys(self) -> None:
        store = PredicationStore.from_cells([
            PredicationCell("alice", "trusts", "bob", T),
            PredicationCell("bob", "trusts", "carol", F),
        ])
        assert store.get("alice", "trusts", "bob") is T
        assert store.get("bob", "trusts", "carol") is F

    def test_cells_yields_all(self) -> None:
        store = PredicationStore.from_cells([
            PredicationCell("alice", "trusts", "bob", T),
            PredicationCell("bob", "trusts", "carol", F),
        ])
        keys = {c.key for c in store.cells()}
        assert ("alice", "trusts", "bob") in keys
        assert ("bob", "trusts", "carol") in keys

    def test_cells_deterministic_order(self) -> None:
        store = PredicationStore.from_cells([
            PredicationCell("z", "a", "a", T),
            PredicationCell("a", "z", "a", F),
            PredicationCell("a", "a", "z", BOT),
        ])
        keys = [c.key for c in store.cells()]
        assert keys == sorted(keys, key=lambda k: tuple(map(str, k)))

    def test_merge_two_stores(self) -> None:
        s1 = PredicationStore.from_cells([PredicationCell("a", "b", "c", T)])
        s2 = PredicationStore.from_cells([PredicationCell("x", "y", "z", F)])
        merged = s1.merge(s2)
        assert merged.get("a", "b", "c") is T
        assert merged.get("x", "y", "z") is F

    def test_merge_conflict_uses_knowledge_join(self) -> None:
        s1 = PredicationStore.from_cells([PredicationCell("a", "b", "c", T)])
        s2 = PredicationStore.from_cells([PredicationCell("a", "b", "c", F)])
        assert s1.merge(s2).get("a", "b", "c") is TOP

    def test_immutability_on_insert(self) -> None:
        store = PredicationStore.empty()
        store2 = store.insert(PredicationCell("a", "b", "c", T))
        assert store.get("a", "b", "c") is BOT
        assert store2.get("a", "b", "c") is T

    def test_top_absorbs_in_knowledge_merge(self) -> None:
        store = PredicationStore.from_cells([
            PredicationCell("a", "b", "c", TOP),
            PredicationCell("a", "b", "c", T),
        ])
        assert store.get("a", "b", "c") is TOP
