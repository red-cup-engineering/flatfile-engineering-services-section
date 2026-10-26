---
name: "Building named substitution instance"
description: "Encodes a corpus example (Fibonacci, Padovan, Penrose, etc.) as a SubstitutionMatrix plus a default valuation. Use when adding a corpus example to dynamics."
---

# Building named substitution instance

## Requirements

- Dynamics-specialist office.
- A corpus example markdown describing the substitution (e.g.,
  `examples/fibonacci-substitution-settling.md`).

## Steps

1. Read the corpus example. Identify:
   - Tile alphabet (the indices of the substitution matrix).
   - Substitution rule (which tile expands to which sequence on each step).
   - Default valuation (initial cell values, often a single seed).
2. Build the matrix `M`: rows are tile indices, columns are tile indices, `M[i][j]` = number of
   `j`-tiles in the substitution of `i`.
3. Build the default valuation: typically a `FiberValuation` placing one tile-presence
   cell at `T_VAL`, others at `BOT`.
4. Verify Perron-Frobenius via [`verifying-perron-frobenius`](verifying-perron-frobenius.md).
5. Export as a module-level constant: `FIBONACCI = SubstitutionMatrix(...)`,
   `FIBONACCI_DEFAULT_VALUATION = FiberValuation(...)` (etc.).
6. Add to `pypredcalc.dynamics.__init__.py` `__all__`.
7. Apply `@realizes("examples/<slug>-substitution-settling")` and write the realization-
   claim test.

## Outcomes

A new named substitution instance available as a top-level pypredcalc export. The
existing `FIBONACCI`, `PADOVAN`, `TETRANACCI`, `THUE_MORSE`, `TRIBONACCI` are exemplars;
new instances follow the same pattern.
