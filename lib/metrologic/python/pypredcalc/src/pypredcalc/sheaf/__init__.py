"""Sheaf-theoretic primitives.

Realized:
- `cohomology` — Z-coefficient cellular cohomology on simplicial complexes.
- `cellular` — `CellularSheaf`, `ConstantSheaf` over Z stalks.
- `frame_valued` — `FrameValuedSheaf` with PowersetFrame stalks (Čech parallel-pair
  convention; H⁰ via global sections, H₀ of the cosheaf via union-find).
- `q_enriched` — `QEnrichedSheaf` and operations: the poset-indexed Q-enriched
  cellular sheaf (Ghrist-Lopez-North-Riess 2025 graph case generalised to a finite
  poset), plus tensor product, internal hom, and Q-valued Čech cohomology.
"""

from .cellular import CellularSheaf, ConstantSheaf
from .cohomology import coboundary_matrix, cohomology_rank
from .frame_valued import FrameValuedSheaf
from .q_enriched import (
    CohomologyWitness,
    QEnrichedSheaf,
    SheafConditionCheck,
    SheafConditionError,
    SheafConditionWitness,
    check_sheaf_condition,
    cohomology,
    internal_hom,
    tensor,
)

__all__ = [
    "CellularSheaf",
    "CohomologyWitness",
    "ConstantSheaf",
    "FrameValuedSheaf",
    "QEnrichedSheaf",
    "SheafConditionCheck",
    "SheafConditionError",
    "SheafConditionWitness",
    "check_sheaf_condition",
    "coboundary_matrix",
    "cohomology",
    "cohomology_rank",
    "internal_hom",
    "tensor",
]
