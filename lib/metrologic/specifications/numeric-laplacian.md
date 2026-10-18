# Finite numerical conductance

## Ownership and mathematical carrier

`analysis/numeric-laplacian` owns pure binary64 mathematics on finite integer
indices, symmetric nonnegative weights, and finite scalar values. The existing
`analysis/laplacian` continues to own exact integer and rational operations.
Named attributes, content addresses, evidence, settlement policy, and agent
actions belong to consumers; they are not arguments or results of this module.

This distinction follows the existing numerical `number/finite-law` boundary.
The order closure operator in
`Obsmetrologia.Dynamics.Flow.LawvereLaplacianSpectralGap` is not the numerical
eigenvalue algorithm specified here. No exact proof receipt is produced.

For a finite symmetric adjacency matrix W with zero diagonal, define

* L = diag(W 1) − W;
* E(W, x) = sum over i < j of W[i,j] (x[i] − x[j])²;
* λ+ as the least strictly positive eigenvalue of L, when an edge exists.

The kernel consists of values constant on each positive-edge connected
component. Consequently the squared Euclidean distance from x to that kernel
is at most E/λ+. The numerical square root of that quotient is a spectral
bound; it is not generally the distance itself. It is exact for a two-vertex
single-edge graph, up to floating arithmetic.

The original [closure-cones note, §§9.5 and 10.5, Theorem 10.14](https://github.com/lenticule-science/proof-services-section/blob/f6bc059c791ba544ed5b4bead85c409c2f2ae6c0/content/documents/articles/notes/2026/07/31/2026-07-31-note-on-closure-cones-and-proof-path-forests.md#105-the-measured-criterion)
supplies this real-arithmetic inequality for a finite inner-product space and
a linear coboundary δ, with L = δᵀδ and orthogonal projection onto ker L.
Here each positive edge supplies the row √W[i,j] (e_j − e_i)ᵀ of δ.
This is its scalar weighted-graph specialization; it does not compute general
sheaf restriction maps, a Čech obstruction, or an amalgamated witness structure.
The theorem's inequality does not turn a large bound into a lower bound on
actual disagreement, nor prove an interval enclosure for binary64 results.

## Component contracts

| Requirement | Operation and resulting behavior |
| --- | --- |
| NLC-1 | `copyConductanceMatrix(W)` admits a complete square Array of Array or numerical typed-array rows, snapshots it as Float64Array rows, and refuses nonfinite, negative, asymmetric, or nonzero diagonal entries. Inputs are never mutated. Empty matrices are admitted. |
| NLC-2 | `numericLaplacian(W)` returns Float64Array rows for L. An unrepresentable degree raises RangeError. |
| NLC-3 | `numericDirichletEnergy(W,x)` admits exactly one finite value per vertex and sums nonnegative edge contributions, avoiding cancellation through xᵀLx. Exact edge agreement returns zero. An unrepresentable positive contribution or sum raises RangeError. |
| NLC-4 | `symmetricEigenvalues(A,{maxSweeps=64})` accepts a complete finite symmetric matrix, works at a normalized scale, and returns ascending numerical eigenvalues. A sweep budget must be a nonnegative safe integer. An unconverged solve or unrepresentable result raises RangeError. |
| NLC-5 | `numericSpectralGap(W,options)` derives nullity from positive-edge connectivity, never a floating zero threshold. It returns zero only for an edgeless graph. A positive eigenvalue must exceed the solver's resolution estimate; otherwise it raises `NUMERIC_SPECTRAL_GAP_UNRESOLVED`. |
| NLC-6 | `numericRefusalBound(W,x,options)` returns zero only when every positive edge joins equal readings. Otherwise it estimates sqrt(E/λ+) on normalized weight and difference scales. It refuses unresolved gaps and unrepresentable results rather than returning fabricated zero or infinity. |

## Numerical method and limits

The symmetric solver normalizes by the maximum absolute entry and applies
cyclic Jacobi rotations. Its convergence criterion scales with the matrix
norm, dimension, and machine epsilon. An exhausted sweep budget is a failure,
not permission to publish the diagonal of an unfinished solve. The residual
against the original normalized matrix, orthogonality defect, and a dimension
dependent rounding allowance form a conservative numerical resolution
estimate. This is a numerical admission rule, not a formally checked interval
enclosure or theorem about binary64 arithmetic.

The graph nullity comes from the original positive weights. A very weak edge
therefore cannot disappear merely because its eigenvalue is below resolution.
A connected graph with an unresolved weak bridge is refused. Normalization
also refuses loss of a nonzero matrix entry to underflow. These limits may
reject extreme relative dynamic ranges even when exact arithmetic would
resolve them.

Uniform scaling W by a positive finite factor preserves the refusal bound
when the scaled input and normalized calculation remain representable. In
particular the two-vertex weights 1e-200 through 1e200 with readings [0,1]
all produce 1/sqrt(2). The quotient does not first materialize potentially
overflowing or underflowing E and λ+ in their original units.

## Consumer allocation and acceptance

SignCraft's conductance complex retains its public `{M,index,D}` carrier,
label projection, immutable edge updates, and named operations. Its Laplacian,
energy, eigenvalues, gap, and refusal delegate to this module. Inference and
constructive nucleus settlement consume that same adapter. Agent orchestration
and evidence authority do not enter the numerical package.

Acceptance examples cover analytic two-vertex/path/triangle spectra, structural
nullity with isolated and disconnected components, uniform scale changes,
unresolved weak bridges, nonnegative energy, coherent component readings,
finite extremes, malformed and mutated carriers, input nonmutation, and forced
nonconvergence. Original SignCraft admission and energy examples remain valid.
