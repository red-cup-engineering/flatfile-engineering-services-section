---
title: "Skills"
type: index
status: open
---

# Skills

Skill records define executable procedures that power exercises enable. Each skill is
named as a gerund verb phrase ("auditing-corpus-realization-coverage",
"writing-task-records") and carries a two-part description: what changes when the skill
runs, and when to use it.

Skills are the operational complement of powers. Powers grant standing to act; skills
define *how* to act. An office's `provides-skill:` list names the skills its incumbent
can execute.

## Steward

| Slug | What runs |
|---|---|
| [`presiding-over-novation`](presiding-over-novation.md) | Produces a novation witness on a hard-core amendment. |
| [`reading-enterprise-state`](reading-enterprise-state.md) | Produces a snapshot of current C / Γ / O state for steward intake. |

## Executive Officer

| Slug | What runs |
|---|---|
| [`selecting-next-work`](selecting-next-work.md) | Composes computing-dispatch-readiness over candidates and returns either a single $\mathbf{t}$-readiness task, a most-prep-advanced goal-needing-task, or an explicit empty result with the readiness aggregate as the reason. |
| [`computing-dispatch-readiness`](computing-dispatch-readiness.md) | Derives the four-valued dispatch-readiness witness for one task: per-precondition checks (brief, dependency, capability, authority, status, goal, capacity) drive a $\mathbf{t} / \mathbf{f} / \bot / \top$ verdict. |
| [`routing-inbox-inquiry`](routing-inbox-inquiry.md) | Classifies an inbox inquiry and dispatches it to an office. |
| [`dispatching-realization-task`](dispatching-realization-task.md) | Picks a ready realization-gap task and assigns it to the developer. |
| [`closing-execution-loop`](closing-execution-loop.md) | Records completion or stall on a dispatched task. |
| [`interpreting-incoming-message`](interpreting-incoming-message.md) | Classifies an incoming message as task / question / FYI / intent / noise. |

## Corpus Tracker

| Slug | What runs |
|---|---|
| [`auditing-corpus-realization-coverage`](auditing-corpus-realization-coverage.md) | Produces a list of corpus atoms without `@realizes`-bound Python entities. |
| [`identifying-realization-gap`](identifying-realization-gap.md) | Picks one gap and produces a task record. |
| [`running-corpus-binding-audit`](running-corpus-binding-audit.md) | Executes the audit tool and produces a coverage report. |

## Corpus Reader

| Slug | What runs |
|---|---|
| [`reading-corpus-deeply`](reading-corpus-deeply.md) | Reads a corpus atom and its dependency chain end-to-end. |
| [`producing-realization-brief`](producing-realization-brief.md) | Writes a brief at `work/briefs/<slug>.md` describing the atom and recommended Python shape. |
| [`identifying-load-bearing-dependencies`](identifying-load-bearing-dependencies.md) | Surfaces which corpus atoms a realization MUST preserve. |

## Developer

| Slug | What runs |
|---|---|
| [`realizing-corpus-atom-as-python`](realizing-corpus-atom-as-python.md) | Given a corpus slug, writes the Python entity, tests, and `@realizes` decoration. |
| [`writing-task-records`](writing-task-records.md) | Creates a task record for a single-sitting unit. |
| [`running-test-suite`](running-test-suite.md) | Runs `pytest` and reports pass/fail. |

## Test Author

| Slug | What runs |
|---|---|
| [`writing-unit-test`](writing-unit-test.md) | Writes a single pytest function exercising one contract or edge case. |
| [`writing-property-test`](writing-property-test.md) | Writes a hypothesis-driven property test under `tests/property/`. |
| [`designing-test-fixture`](designing-test-fixture.md) | Creates a reusable test input shared across tests. |
| [`writing-realization-claim-test`](writing-realization-claim-test.md) | Writes a test that exercises the corpus atom's defining property. |

## Quality Officer

| Slug | What runs |
|---|---|
| [`running-mypy-strict`](running-mypy-strict.md) | Invokes `mypy --strict` against `src/pypredcalc`. |
| [`running-ruff`](running-ruff.md) | Invokes `ruff check` against `src/` and `tests/`. |
| [`doing-code-review`](doing-code-review.md) | Reads a diff and produces a review verdict. |
| [`gating-merge`](gating-merge.md) | Composes type-check, lint, test, audit, and review gates into a merge-eligibility verdict. |

## Release Officer

| Slug | What runs |
|---|---|
| [`cutting-release`](cutting-release.md) | Composes version bump, CHANGELOG entry, build-config update, tag-and-publish. |
| [`writing-changelog-narrative`](writing-changelog-narrative.md) | Authors the leap-narrative paragraph at the top of a CHANGELOG release entry. |
| [`managing-deprecation-window`](managing-deprecation-window.md) | Tracks deprecated names across release cycles. |
| [`updating-build-config`](updating-build-config.md) | Edits `pyproject.toml`. |
| [`updating-nix-flake`](updating-nix-flake.md) | Edits `flake.nix` and `flake.lock`. |

## Docs Officer

| Slug | What runs |
|---|---|
| [`writing-prose-document`](writing-prose-document.md) | Authors a prose document under `docs/` or `prose/`. |
| [`rendering-mkdocs`](rendering-mkdocs.md) | Invokes `mkdocs build --strict`. |
| [`updating-readme`](updating-readme.md) | Edits `README.md`. |
| [`explaining-realization-in-math-reader-terms`](explaining-realization-in-math-reader-terms.md) | Translates a Python realization into prose accessible to a math reader. |

## Records Officer

| Slug | What runs |
|---|---|
| [`consulting-predication-categories-corpus`](consulting-predication-categories-corpus.md) | Reads the corpus to ground a record's structuration. |
| [`writing-decision-records`](writing-decision-records.md) | Produces an ADR. |
| [`writing-specification-records`](writing-specification-records.md) | Produces a specification. |

## Algebra Specialist

| Slug | What runs |
|---|---|
| [`verifying-bilattice-axioms`](verifying-bilattice-axioms.md) | Checks the four interlacing laws on a candidate bilattice. |
| [`verifying-residuation-laws`](verifying-residuation-laws.md) | Checks the fusion-residual adjunction on a candidate residuated lattice. |
| [`working-with-twist-product`](working-with-twist-product.md) | Builds twist-product structures over a base residuated lattice. |

## Predication Specialist

| Slug | What runs |
|---|---|
| [`verifying-naturality`](verifying-naturality.md) | Produces a `NaturalityWitness` over a sample of cross-fiber valuations. |
| [`verifying-quantifier-adjoints`](verifying-quantifier-adjoints.md) | Checks `∃_f ⊣ f^* ⊣ ∀_f` on each generator class for both `≤_k` and `≤_t`. |
| [`working-with-fiber-valuations`](working-with-fiber-valuations.md) | Builds, modifies, and composes `FiberValuation` instances. |
| [`working-with-closure-rules`](working-with-closure-rules.md) | Designs rule systems and builds closures. |

## Combinatorics Specialist

| Slug | What runs |
|---|---|
| [`verifying-poset-laws`](verifying-poset-laws.md) | Checks reflexivity, antisymmetry, transitivity. |
| [`verifying-simplicial-shape`](verifying-simplicial-shape.md) | Checks closure-under-faces. |
| [`working-with-propositional-closure-rules`](working-with-propositional-closure-rules.md) | Designs `combinatorics.ClosureRuleSystem` instances. |

## Topology Specialist

| Slug | What runs |
|---|---|
| [`verifying-priestley-correspondence`](verifying-priestley-correspondence.md) | Exhibits the duality between bounded distributive lattices and Priestley spaces. |
| [`building-alexandrov-topology`](building-alexandrov-topology.md) | Constructs the Alexandrov open-set lattice from a finite poset. |
| [`working-with-transfinite-cell-complex`](working-with-transfinite-cell-complex.md) | Scaffold for transfinite cell-complex realization (currently stub). |

## Lattice Specialist

| Slug | What runs |
|---|---|
| [`verifying-frame-laws`](verifying-frame-laws.md) | Checks frame axioms — arbitrary joins, finite-meet distribution, Heyting implication. |
| [`computing-d-frame-restriction`](computing-d-frame-restriction.md) | Given a d-frame and a clopen, produces the restriction d-frame. |
| [`working-with-frame-morphisms`](working-with-frame-morphisms.md) | Builds morphisms preserving `⊓` and `⨆`. |

## Sheaf Specialist

| Slug | What runs |
|---|---|
| [`verifying-cohomology-functoriality`](verifying-cohomology-functoriality.md) | Exhibits cohomology functoriality under base-change. |
| [`computing-cech-cohomology`](computing-cech-cohomology.md) | Computes Čech cohomology by direct chain-complex evaluation. |
| [`working-with-frame-valued-sheaves`](working-with-frame-valued-sheaves.md) | Builds frame-valued sheaves over a cellular basis. |
| [`working-with-q-enriched-sheaves`](working-with-q-enriched-sheaves.md) | Builds q-enriched sheaves (currently stub). |

## Dynamics Specialist

| Slug | What runs |
|---|---|
| [`verifying-perron-frobenius`](verifying-perron-frobenius.md) | Checks Perron-Frobenius primitivity on a candidate substitution matrix. |
| [`computing-step-shift`](computing-step-shift.md) | Given a substitution and a step parameter, computes the step-shift. |
| [`building-named-substitution-instance`](building-named-substitution-instance.md) | Encodes a corpus example as a `SubstitutionMatrix` plus default valuation. |
