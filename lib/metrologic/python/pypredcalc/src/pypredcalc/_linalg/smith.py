"""Smith Normal Form over Z for integer matrices.

Used to compute Z-coefficient (co)homology with torsion. The algorithm is
the classical reduce-by-elementary-operations approach: at each step pick
a smallest-magnitude nonzero pivot, sweep its row and column with integer
quotients (Euclidean division), and recurse on the trailing submatrix.

For matrices with non-integer rational entries, callers must scale first;
Smith form is a Z-invariant.
"""

from __future__ import annotations

from .matrix import Matrix


def _to_int_matrix(m: Matrix) -> list[list[int]]:
    out: list[list[int]] = []
    for row in m.rows:
        irow: list[int] = []
        for x in row:
            if x.denominator != 1:
                raise ValueError(f"Smith form requires integer entries, got {x}")
            irow.append(x.numerator)
        out.append(irow)
    return out


def _argmin_nonzero(a: list[list[int]], k: int, n_rows: int, n_cols: int) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    best_abs: int | None = None
    for i in range(k, n_rows):
        for j in range(k, n_cols):
            v = a[i][j]
            if v == 0:
                continue
            av = abs(v)
            if best_abs is None or av < best_abs:
                best_abs = av
                best = (i, j)
    return best


def smith_normal_form(m: Matrix) -> tuple[int, ...]:
    """Return the diagonal invariant factors (d_1 | d_2 | ... | d_r) of `m`.

    For an integer matrix with rank r, returns a tuple of r positive integers
    with d_i dividing d_{i+1}. Trailing zeros (rank-deficiency) are omitted.
    """
    if m.n_rows == 0 or m.n_cols == 0:
        return ()
    a = _to_int_matrix(m)
    n_rows, n_cols = m.shape
    invariants: list[int] = []
    for k in range(min(n_rows, n_cols)):
        # Reduce entries (k..,k..) until the (k,k) entry divides everything in
        # its row and column; then sweep the row/column to zero.
        while True:
            pivot = _argmin_nonzero(a, k, n_rows, n_cols)
            if pivot is None:
                return tuple(invariants)
            pi, pj = pivot
            if pi != k:
                a[k], a[pi] = a[pi], a[k]
            if pj != k:
                for i in range(n_rows):
                    a[i][k], a[i][pj] = a[i][pj], a[i][k]
            p = a[k][k]
            if p < 0:
                for j in range(k, n_cols):
                    a[k][j] = -a[k][j]
                p = a[k][k]
            # Sweep column k
            progressed = False
            for i in range(n_rows):
                if i == k or a[i][k] == 0:
                    continue
                q = a[i][k] // p
                if q != 0:
                    for j in range(k, n_cols):
                        a[i][j] -= q * a[k][j]
                    progressed = True
            # Sweep row k
            for j in range(n_cols):
                if j == k or a[k][j] == 0:
                    continue
                q = a[k][j] // p
                if q != 0:
                    for i in range(n_rows):
                        a[i][j] -= q * a[i][k]
                    progressed = True
            # Re-pick smallest pivot if anything new appeared in row/col k.
            if not progressed and all(
                a[i][k] == 0 for i in range(n_rows) if i != k
            ) and all(
                a[k][j] == 0 for j in range(n_cols) if j != k
            ):
                break
        if a[k][k] == 0:
            break
        # Enforce divisibility with later invariants by absorbing into trailing submatrix.
        for i in range(k + 1, n_rows):
            for j in range(k + 1, n_cols):
                if a[i][j] % a[k][k] != 0:
                    # Add row i to row k, then re-sweep.
                    for jj in range(n_cols):
                        a[k][jj] += a[i][jj]
                    # Restart this k.
                    break
            else:
                continue
            break
        else:
            invariants.append(a[k][k])
            continue
        # Re-run inner loop for current k.
        # (Restart by jumping to the while-loop above; achieved by `continue` of outer.)
        # Use a sentinel: if we broke out of nested loops, decrement k and continue.
        # Simpler: re-process this k by recursive call on the remaining tail.
        tail_rows = [a[i][k:] for i in range(k, n_rows)]
        tail = Matrix.from_rows(tail_rows)
        return tuple(invariants) + smith_normal_form(tail)
    return tuple(invariants)


def integer_rank(m: Matrix) -> int:
    """Z-rank (= Q-rank) — number of nonzero invariant factors."""
    return len(smith_normal_form(m))
