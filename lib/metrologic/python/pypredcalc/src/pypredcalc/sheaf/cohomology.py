"""Z-coefficient cellular cohomology of a simplicial complex.

Extracted from the simplicial_complex carrier — cohomology is a derived
construction, not part of the carrier. Computed over Q (free part of H^n
with Z coefficients); torsion analysis lives in `pypredcalc._linalg.smith`.

Realizes corpus object: `cellular-cohomology`.
"""

from __future__ import annotations

from .._linalg import Matrix, rank
from ..combinatorics.simplicial_complex import SimplicialComplex


def coboundary_matrix(complex: SimplicialComplex, n: int) -> Matrix | None:
    """The n-th coboundary δⁿ: Cⁿ → Cⁿ⁺¹ as a Matrix.

    Rows index (n+1)-cells, columns index n-cells. Returns `None` if n < 0
    or there are no (n+1)-cells.
    """
    if n < 0:
        return None
    n_cells = complex.cells(n)
    n1_cells = complex.cells(n + 1)
    if not n1_cells:
        return None
    n_index = {c: i for i, c in enumerate(n_cells)}
    rows: list[list[int]] = []
    for tau in n1_cells:
        row = [0] * len(n_cells)
        for i, sigma in enumerate(tau.faces()):
            if sigma in n_index:
                row[n_index[sigma]] += (-1) ** i
        rows.append(row)
    return Matrix.from_rows(rows)


def cohomology_rank(complex: SimplicialComplex, n: int) -> int:
    """Rank of Hⁿ with Q coefficients (= rank of the free part of Hⁿ over Z).

    Hⁿ = ker(δⁿ) / im(δⁿ⁻¹); rank Hⁿ = dim ker(δⁿ) − rank im(δⁿ⁻¹).
    """
    n_cells_count = len(complex.cells(n))
    prev = coboundary_matrix(complex, n - 1) if n > 0 else None
    rank_prev = rank(prev) if prev is not None else 0
    curr = coboundary_matrix(complex, n)
    rank_curr = rank(curr) if curr is not None else 0
    dim_ker = n_cells_count - rank_curr
    return dim_ker - rank_prev
