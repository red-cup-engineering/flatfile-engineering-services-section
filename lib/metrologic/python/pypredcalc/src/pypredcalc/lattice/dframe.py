"""DFrame primitive: 4-tuple `(L⁺, L⁻, con, tot)`.

Realizes corpus objects: `d-frame`, `bitopological-settling-site`.

For the bitopological-settling-site setting at a clopen U:
- L⁺ = P(U ∩ Δ⁺) (truth-positive cells in U)
- L⁻ = P(U ∩ Δ⁻) (falsity-positive cells in U)
- con: pairs (a, b) with a ∩ b = ∅ (no co-witness inconsistency)
- tot: pairs (a, b) with a ∪ b ⊇ (U ∩ Δ⁺) ∪ (U ∩ Δ⁻) (cover all settled cells)

Construction validates downward-closure of `con` and upward-closure of `tot`.
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass

from .._realizes import realizes
from .frame import PowersetFrame


@realizes("objects/d-frame")
@dataclass(frozen=True)
class DFrame:
    """A d-frame: pair of frames with `con` and `tot` relations as explicit pair sets."""

    L_plus: PowersetFrame
    L_minus: PowersetFrame
    con: frozenset[tuple[frozenset[Hashable], frozenset[Hashable]]]
    tot: frozenset[tuple[frozenset[Hashable], frozenset[Hashable]]]

    def __post_init__(self) -> None:
        for a, b in self.con:
            for a_prime in self.L_plus.elements():
                if not self.L_plus.leq(a_prime, a):
                    continue
                for b_prime in self.L_minus.elements():
                    if not self.L_minus.leq(b_prime, b):
                        continue
                    if (a_prime, b_prime) not in self.con:
                        raise ValueError(
                            f"con not downward-closed: ({a}, {b}) ∈ con but "
                            f"({a_prime}, {b_prime}) ∉ con (sub-pair)"
                        )
        for a, b in self.tot:
            for a_prime in self.L_plus.elements():
                if not self.L_plus.leq(a, a_prime):
                    continue
                for b_prime in self.L_minus.elements():
                    if not self.L_minus.leq(b, b_prime):
                        continue
                    if (a_prime, b_prime) not in self.tot:
                        raise ValueError(
                            f"tot not upward-closed: ({a}, {b}) ∈ tot but "
                            f"({a_prime}, {b_prime}) ∉ tot (super-pair)"
                        )

    def check_con(self, a: frozenset[Hashable], b: frozenset[Hashable]) -> bool:
        return (a, b) in self.con

    def check_tot(self, a: frozenset[Hashable], b: frozenset[Hashable]) -> bool:
        return (a, b) in self.tot

    def __repr__(self) -> str:
        return (
            f"DFrame(L_plus={self.L_plus}, L_minus={self.L_minus}, "
            f"|con|={len(self.con)}, |tot|={len(self.tot)})"
        )


def settling_dframe_at_clopen(
    clopen: frozenset[Hashable],
    delta_plus: frozenset[Hashable],
    delta_minus: frozenset[Hashable],
) -> DFrame:
    """Build the canonical settling d-frame at a clopen U for given Δ⁺, Δ⁻."""
    L_plus = PowersetFrame(base=clopen & delta_plus)
    L_minus = PowersetFrame(base=clopen & delta_minus)
    settled = (clopen & delta_plus) | (clopen & delta_minus)

    con = frozenset(
        (a, b)
        for a in L_plus.elements()
        for b in L_minus.elements()
        if (a & b) == frozenset()
    )
    tot = frozenset(
        (a, b)
        for a in L_plus.elements()
        for b in L_minus.elements()
        if settled.issubset(a | b)
    )

    return DFrame(L_plus=L_plus, L_minus=L_minus, con=con, tot=tot)
