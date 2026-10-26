"""Tests for extra Matrix predicates and Kronecker product."""

from pypredcalc._linalg import Matrix


class TestPredicates:
    def test_is_nonnegative(self) -> None:
        assert Matrix.from_rows([[0, 1], [2, 3]]).is_nonnegative()
        assert not Matrix.from_rows([[0, -1], [2, 3]]).is_nonnegative()

    def test_is_positive(self) -> None:
        assert Matrix.from_rows([[1, 2], [3, 4]]).is_positive()
        assert not Matrix.from_rows([[0, 1], [2, 3]]).is_positive()


class TestKronecker:
    def test_shape(self) -> None:
        a = Matrix.from_rows([[1, 2], [3, 4]])
        b = Matrix.from_rows([[5, 6], [7, 8]])
        k = a.kronecker(b)
        assert k.shape == (4, 4)

    def test_identity_kronecker_is_block_identity(self) -> None:
        i2 = Matrix.identity(2)
        b = Matrix.from_rows([[5, 6], [7, 8]])
        k = i2.kronecker(b)
        # Block-diagonal: b in the 2×2 diagonal blocks, zeros off-diagonal.
        assert k.get(0, 0) == 5 and k.get(1, 1) == 8
        assert k.get(2, 2) == 5 and k.get(3, 3) == 8
        assert k.get(0, 2) == 0 and k.get(2, 0) == 0

    def test_known_value(self) -> None:
        a = Matrix.from_rows([[1, 2]])
        b = Matrix.from_rows([[3, 4]])
        k = a.kronecker(b)
        # [1*3, 1*4, 2*3, 2*4] = [3, 4, 6, 8]
        assert k.shape == (1, 4)
        assert [k.get(0, j) for j in range(4)] == [3, 4, 6, 8]
