# Finite FOUR knowledge relations — source law, allocation, and implementation

Status: **source-fabricated and exercised**, not a new Lean theorem, immutable
registry publication, installed Group service, or customer acceptance.

Owners: Lenticule Science (source propositions); Computer Data/Metrologic
(finite relations); SignCraft (inference adaptation, synthesis and learning);
Code/Networking/Systems/Operations (effectful consumers and deployment).

## Mathematical conformance

Obsmetrologia `Calculus/Logic/LinearLogicChu.lean` supplies the Chu matrix
over *both independently told evidence coordinates*, and Computer Data
`four.mjs` supplies FOUR's two orders. Metrologic here lifts the
**knowledge** order's meet, join and implication to finite relations:

- `(A·W)(r,c) = ⋁ₖ_j (A(r,j) ∧ₖ W(j,c))`.
- `(A\B)(j,c) = ⋀ₖ_r (A(r,j) ⇒ₖ B(r,c))`.
- `(B/W)(r,j) = ⋀ₖ_c (W(j,c) ⇒ₖ B(r,c))`.
- Consequently `A·W ≤ₖ B ↔ W ≤ₖ A\B ↔ A ≤ₖ B/W` on
  **explicitly matched original carriers**.

Empty join is knowledge bottom; empty meet knowledge top (*both* evidence
lanes), not positive-only testimony. The separate Lean twist-product
truth-order fusion/residual, source observation, witnessed SignChain license,
semantic Mark identity, `Quot.sound`, a transfinite fixed point, and a
provider/tool execution are **not** inferred from this relation calculation.

## Architecture and implementation

There is exactly **one mathematical kernel**:

`@red-cup-engineering/metrologic/chu/indexed-knowledge-relations` —
immutable finite relations over positions and two independent positive/
negative incidence lists, with explicitly supplied positional bijections,
composition, left/right residual, meet, and order. The kernel does not
parse strings, authorize effects or hash an identifier. The indexed carrier
can round-trip over JSON without treating source-description coincidence
as a witnessed equivalence; rehydrated values are normalized and refused
on illegal, duplicate, or uncanonical incidences.

`@red-cup-engineering/metrologic/chu/knowledge-relations` is a **view**:
it reads the existing original `chuSpace` carrier as positioned evidence,
calls the indexed kernel, and rebuilds a Chu matrix preserving its original
point/state comparisons. It is *not* a second algebra.

SignCraft `./inference/algebra` is an application adapter from its historic
lossless JSON-string pair keys to those positions. It preserves the exported
legacy functions and their finite FOUR/witness semantics; its
`trainLayer`, bounded constructive nucleus, `attend`, and explicit
textual coordinates remain in SignCraft. SignCraft's
`./inference/network` operates those original APIs to fabricate
trained 2-layer relation systems, not another mathematical foundation.

AOE, inference dispatch, provider/market contracting, FeltOS and MetroPlat
are downstream *effectful* recipients, not permitted imports into Metrologic.

## Fabricated and exercised

Source-level executed examples:

- Exhaustive 64 combinations of the FOUR alphabet for both residuation
  adjunctions, plus opposed evidence, empty relations, permuted coordinates,
  signed source positions, and mismatch refusals.
- Sparse 200×200 `compose; leftResidual; compose`: approximately 52–61 ms
  in bounded source-level V8 runs; kernel timings are **not** installed
  benchmark or market superiority measurements.
- Original sparse SignCraft 0.5.4 same workload: ~68 ms median over three
  source-level runs. Dense Chu replacement was **worse**, ~2,666 ms, then
  replaced by the sparse source. SignCraft 0.5.6 projected sparse adapter:
  ~121 ms median, still slower than the original due to legacy text encoding.
  Do not claim a net throughput beat at that external interface.
- Original SignCraft algebra cases 13/13 passed in a source-composed
  interpreter. The original two-layer inference consumer converged in four
  rounds and reproduced the target three-generation relation.
- Invalid external presentation cannot coerce unrelated source positions,
  even when their displayed names are equal.

## First unreceived economic/operational boundary

Metrologic candidate **0.14.2** and SignCraft candidate **0.5.6** are
source versions, not presumed registry artifacts. The original
`npm-workspace-publication-service` owns immutable package assembly,
publisher-selected registry, SHA-512 readback, native consumer lock and
installed receiving. GitHub Actions runners and Cold Red Gate did not
provide an independently qualifying install in these work sessions.

The next execution must publish/receive the exact Metrologic release,
prepare SignCraft against it with an actual selected lock, run the native
suite, then install the concrete downstream consumer. Never use a source
link, manually fabricated lock, or unreceived dependency as a substitute.
Measure accepted inference workload and costs at the installed recipient.
