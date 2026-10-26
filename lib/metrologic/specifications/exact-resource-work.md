# Exact resource mathematics at its shared owner

## Requirement and original source

The existing mathematical resource product needs one exact optimizer and one
independent checker. SignCraft must compose source-bearing mathematical work
from its upstream supplier. Importing Math Engineering into SignCraft would
reverse that dependency. The pure calculation therefore belongs here, while
Math Engineering retains its service/CLI boundary and SignCraft retains
semiotic source admission, evidence and settlement.

These operations preserve the original work in
`red-cup-engineering/math-engineering-services-section` at
`d0151494e41f6f79f9fc266368aeb61f9db89c5e`, branch
`receive/unified-resource-mathematics-work-20261024`. This is the same
mathematical supplier developed in Math Engineering PR2 and selected by
Causeway Public Market PR9. It is not another optimizer for a new product.

| Original module | Original Git blob | Metrologic owner |
| --- | --- | --- |
| `src/exact-resource-flow.mjs` | `3b5d3935e7819acac91caf49d4871e49a797aa7f` | `src/obstruction/exact-resource-flow.mjs` |
| `src/resource-flow-verifier.mjs` | `e2dea50e9cf28c36f8cf3fa549616037d9442758` | `src/obstruction/resource-flow-verifier.mjs` |
| `src/exact-resource-work.mjs` | `dd838c2dea7b73d1195674bf82548e09bd70e657` | `src/obstruction/exact-resource-work.mjs` |
| `src/exact-resource-envelope.mjs` | `be1dba39eba541f6f42f2f5f602017d231562c35` | `src/obstruction/exact-resource-envelope.mjs` |

The source algorithm and independent residual checker retain their respective
control flow. Their former local `Fraction` operations now use the existing
`@red-cup-engineering/exact-number-data-service/exact-number` supplier. The
small `resource-flow-wire.mjs` formatter preserves the original integer or
`p/q` wire spelling. No second rational implementation is shipped. Math's
corresponding service modules must become imports/reexports of these entries
when this upstream edition is received; the old algorithms must not remain an
active fallback.

## Mathematical contract

The caller supplies a finite directed graph with constant nonnegative rational
capacities and costs, source capacities, demand quantities and an optional
resource budget. All units must be coherent under the caller's model. A cost
is an abstract resource consumed per delivered unit; no currency is implied.

The objective first maximizes delivered volume subject to the network and
budget, then minimizes resource cost at that volume. Flow is continuous and
rational. This differs from the existing `allocateFairSharedSources` weighted
fair allocation on fixed routes, and from integer `solveConservedCapacityFlow`
without costs. Neither of those operations substitutes for this objective.

The original successive shortest augmentations retain reverse residual arcs,
so an earlier assignment can be rerouted. The independent verifier does not
call that optimizer. It checks every source, link and demand identity and
quantity, conservation, capacity, total cost, budget and residual dual
potentials. Nonnegative reduced costs on the residual arcs rule out a negative
cost cycle. A separate residual shortest-path calculation checks whether an
additional positive amount can be afforded. These are conditional statements
about the supplied linear model. They do not establish measured capacity,
physical flow, hydraulic pressure, fairness, rights or payment.

Both the funded result and the full unbudgeted reference carry primal and dual
witnesses. Their numerical summaries, feasibility/limitation flags and next
marginal costs are checked against those witnesses. Unknown result, witness
and row fields are refused. Source-reported augmentation counts and marginal
frontier traces have bounded shapes but are not independently established by
the endpoint certificate checker.

## Entry points and source bounds

`@red-cup-engineering/metrologic/obstruction/exact-resource-work` exposes:

- `admitExactResourceFlowWork` and `computeExactResourceFlowWork` for one budget.
- `admitExactResourceFrontierWork` and `computeExactResourceFrontierWork` for one
  budgetless network and one to 32 budget scenarios.
- `admitExactResourceMathWork` and `computeExactResourceMathWork` for the
  original unified product request.
- `verifyExactResourceMathWork(input, work)` for receiving its pure output
  without running the optimizer.

The direct solver, independent certificate verifier and interval-cost reader
remain available under `./obstruction/exact-resource-flow`,
`./obstruction/resource-flow-verifier` and
`./obstruction/exact-resource-envelope` respectively.

Admission accepts at most 48 nodes, 128 links, 48 sources and 48 demands.
Names retain the original bounded identifier grammar. Exact coefficients are
nonnegative integer strings or `p/q` strings with at most 14 digits per
component, or safe integer numbers from zero through `99999999999999`.
Decimals are not silently interpreted as exact. The numeric upper bound now
matches the solver's original string bound: the former admission accepted a
15-digit number that the solver then refused.

The optimizer retains its 4096-augmentation refusal. Computed certificate
numerators and denominators admit up to 4096 digits, distinct from the input
coefficient bound. An admitted 48-node chain produces a 624-digit denominator;
the earlier 512-digit checker incorrectly rejected that genuine result. The
native receiving case retains that counterexample. This change does not prove
that every pathological admitted network fits the output bound. A computation
or oversized-certificate refusal is failed work, never a proof of the opposite
mathematical claim or a receipt for a fulfilled paid request.

## Frontier receiving and its limits

The original full optimization supplies a convex marginal resource envelope.
The frontier operation projects the requested budgets through that envelope.
It now includes the full independently checkable endpoint witness at
`originalOptimum.witness`, retaining the actual primal flows and dual
potentials instead of only endpoint scalars.

`verifyExactResourceMathWork` independently checks that endpoint and reproduces
the envelope closure and budget arithmetic through the same pure projection
used by production. It compares the resulting complete work envelope and
quotes. This reproduction is separate from an independent primal certificate
for every intermediate budget allocation. The output explicitly reports
`intermediatePrimalCertificates:false` and
`sourceTraceIndependentlyVerified:false`, naming `augmentations` and
`marginalCostFrontier` as source trace fields. A valid endpoint does not certify
the optimizer's complete execution history.

The receiver accepts the original pure work object. A downstream evidence
wrapper must select that object before receiving it; additional assertions are
not silently promoted into mathematical claims. Verification failure reports
`mathematicalNegationEstablished:false`. Independent payment, acceptance and
physical observations belong to their actual downstream sources.

## Native receiving and publication

The original nine cases in Math's `test/resource-flow.test.mjs` are retained as
`test/exact-resource-flow.test.mjs` with only their import paths relocated.
They cover exact costs, residual rerouting, free flow, budget/network limits,
certificate tampering, malformed inputs, empty demand and interval bounds.
The additional public-entry suite checks frozen source input, preflight bounds,
full-output replay, negative controls, frontier witness/quotes and the long
denominator counterexample. Both files and their JSON fixture are part of the
package's original `files`/`receivingTests` mechanism.

The owning manifest keeps its selected dependencies and release policy. Source
integration, immutable publication, actual downstream version selection and
consumer receiving are separate facts. This source addition does not establish
a released package, activated seller, payable tariff or external sale.
