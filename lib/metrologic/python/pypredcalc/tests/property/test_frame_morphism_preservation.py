"""Property tests: ``FrameMorphism`` preserves the frame structure.

A frame morphism preserves arbitrary joins (sup) and finite meets,
sends the bottom to the bottom, and the top to the top. The
``FrameMorphism`` dataclass does not enforce these laws (the constructor
takes any callable); it is the caller's contract. These tests exercise
the contract on the canonical morphism shapes used downstream:

- ``restrict_with`` (intersection-with-clopen) — by construction a frame
  homomorphism on powerset frames.
- ``identity`` — trivial frame morphism.

Plus the right-adjoint property ``f^*(y) = ⋁{x : f(x) ≤ y}`` is verified
on small powerset frames.
"""
from __future__ import annotations

from collections.abc import Hashable

from hypothesis import given
from hypothesis import strategies as st

from pypredcalc.lattice import FrameMorphism, PowersetFrame, restrict_with


def _powerset_frame_of(size: int) -> PowersetFrame:
    base = frozenset(range(size))
    return PowersetFrame(base=base)


@st.composite
def powerset_frames(draw: st.DrawFn, max_size: int = 4) -> PowersetFrame:
    size = draw(st.integers(min_value=0, max_value=max_size))
    return _powerset_frame_of(size)


@st.composite
def subset_of(draw: st.DrawFn, frame: PowersetFrame) -> frozenset[Hashable]:
    items = sorted(frame.base, key=str)
    chosen = draw(st.lists(st.sampled_from(items), unique=True)) if items else []
    return frozenset(chosen)


# ---------------- restrict_with is a frame morphism ----------------


@given(data=st.data())
def test_restrict_with_preserves_finite_meet(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    x = data.draw(subset_of(F))
    y = data.draw(subset_of(F))
    assert f(F.meet(x, y)) == F.meet(f(x), f(y))


@given(data=st.data())
def test_restrict_with_preserves_join(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    x = data.draw(subset_of(F))
    y = data.draw(subset_of(F))
    assert f(F.join(x, y)) == F.join(f(x), f(y))


@given(data=st.data())
def test_restrict_with_preserves_top(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    # restrict_with sends top to clopen (which is f(top) by construction).
    assert f(F.top) == clopen


@given(data=st.data())
def test_restrict_with_preserves_bottom(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    assert f(F.bottom) == F.bottom


@given(data=st.data())
def test_restrict_with_monotone(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    x = data.draw(subset_of(F))
    y = data.draw(subset_of(F))
    if F.leq(x, y):
        assert F.leq(f(x), f(y))


# ---------------- right adjoint contract ----------------


@given(data=st.data())
def test_right_adjoint_galois_connection(data: st.DataObject) -> None:
    """``f(x) ≤ y`` iff ``x ≤ f^*(y)`` for every (x, y)."""
    F = data.draw(powerset_frames(max_size=3))  # smaller: |2^F|^2
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    f_star = f.right_adjoint()
    x = data.draw(subset_of(F))
    y = data.draw(subset_of(F))
    lhs = F.leq(f(x), y)
    rhs = F.leq(x, f_star(y))
    assert lhs == rhs


@given(data=st.data())
def test_right_adjoint_unit(data: st.DataObject) -> None:
    """Unit of the adjunction: ``x ≤ f^*(f(x))``."""
    F = data.draw(powerset_frames(max_size=3))
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    f_star = f.right_adjoint()
    x = data.draw(subset_of(F))
    assert F.leq(x, f_star(f(x)))


@given(data=st.data())
def test_right_adjoint_counit(data: st.DataObject) -> None:
    """Counit of the adjunction: ``f(f^*(y)) ≤ y``."""
    F = data.draw(powerset_frames(max_size=3))
    clopen = data.draw(subset_of(F))
    f = restrict_with(F, F, clopen)
    f_star = f.right_adjoint()
    y = data.draw(subset_of(F))
    assert F.leq(f(f_star(y)), y)


# ---------------- identity morphism ----------------


@given(data=st.data())
def test_identity_morphism_preserves_everything(data: st.DataObject) -> None:
    F = data.draw(powerset_frames())
    identity = FrameMorphism(source=F, target=F, mapping=lambda x: x)
    x = data.draw(subset_of(F))
    y = data.draw(subset_of(F))
    assert identity(x) == x
    assert identity(F.meet(x, y)) == F.meet(identity(x), identity(y))
    assert identity(F.join(x, y)) == F.join(identity(x), identity(y))
    assert identity(F.top) == F.top
    assert identity(F.bottom) == F.bottom
