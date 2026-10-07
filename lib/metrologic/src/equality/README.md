# @lenticule-science/metrologic/equality

**Equality, DERIVED rather than postulated — Lawvere's diagonal-Σ construction, run over the existing hyperdoctrine adjoints.**

**Opt-in, of an opt-in.** This consumes [`@lenticule-science/metrologic/hyperdoctrine`](../hyperdoctrine)'s `existsAlong`/`orderOps`, which nothing in [`bilattice`](../bilattice) depends on; nothing in `hyperdoctrine` depends on this in turn.

## The derivation

Ported from `Obsmetrologia/Language/Predicating/Equality.lean` (obsmetrologia, Lean 4). A predication hyperdoctrine carries two parallel adjoint systems — `∃^k ⊣ f* ⊣ ∀^k` in the knowledge order and `∃^t ⊣ f* ⊣ ∀^t` in the truth order. Equality is `∃` along the Lawvere diagonal `g : E → E×E, e ↦ (e, e)`, applied to the diagonal terminal `1` (the fiber over `E` constant at the order's designated/top charge) — once per order:

- **Classical equality** `=_E := ∃^t_g(1^t)` (truth order) — `t` where `s = o`, `f` otherwise.
- **Paraconsistent equality** `Δ^k_E := ∃^k_g(1^k)` (knowledge order) — `⊤` where `s = o`, `⊥` otherwise.

The bilattice first-order logics in the literature (BD∆, Kamide–Zohar, Běhounek–Daňková–Dvořák) *postulate* classical equality as a primitive. Here it falls out of `existsAlong`'s general law: `g`'s preimage of `(s, o)` is the singleton `{s}` when `s = o` and empty otherwise, so `existsAlong` reads off the order's `top` on the diagonal and its `bottom` off it — automatically, with no equality-specific case analysis in this package. `s = o` is ordinary JS `===`, used only to *build* the diagonal morphism (which entity maps to which pair); the t/f resp. ⊤/⊥ verdict is read out of the join, not written down at the call site.

The two equalities agree on *where* they hold (the diagonal) and disagree on *what charge* lands there — classical at the truth poles `t`/`f`, paraconsistent at the knowledge poles `⊤`/`⊥`.

## API

```js
import { classicalEquality, paraconsistentEquality, equalityAt, diagonalMorphism } from "@lenticule-science/metrologic/equality";

const entities = ["alice", "bob", "carol"];
const eq = classicalEquality(entities);          // Fiber over E×E pair-keys
equalityAt(eq, "alice", "alice");                // truth-order top ("t")
equalityAt(eq, "alice", "bob");                  // truth-order bottom ("f")

const para = paraconsistentEquality(entities);   // knowledge-order top/bottom (⊤/⊥) instead
```

- `classicalEquality(entities)` / `paraconsistentEquality(entities)` — the two derived equalities, each a `Fiber` (`Map<string, Charge>`) over `pairKeys(entities)`.
- `equalityAlongDiagonal(entities, order)` — the shared construction both instantiate (`order = TRUTH` gives classical, `order = KNOWLEDGE` gives paraconsistent).
- `diagonalMorphism(entities)` — the Lawvere diagonal `g`, exposed as a real `IndexMorphism` (see `@lenticule-science/metrologic/hyperdoctrine`) so the derivation can be inspected or reused directly.
- `pairKey(s, o)` / `pairKeys(entities)` — the `E×E` index-key encoding (`JSON.stringify([s, o])`, collision-free regardless of what characters `s`/`o` contain).
- `equalityAt(fiber, s, o)` — reads a derived-equality fiber at `(s, o)` without the caller having to know the pair-key encoding.

## Install & run

Zero dependencies, ESM only, Node ≥ 20.

```sh
node --test
```

## Provenance

Ported from `Obsmetrologia/Language/Predicating/Equality.lean`, which builds the truth-order adjoint system `∃^t ⊣ f* ⊣ ∀^t` (its knowledge-order counterpart `∃^k ⊣ f* ⊣ ∀^k` is `hyperdoctrine`'s `existsAlong`/`forallAlong`) and then derives `classicalEq`/`paraconsistentEq` from the diagonal fiber over both. The list-fold `joinTList`/`joinList` machinery `Equality.lean` builds to state and prove `∃^t`/`∃^k` is exactly what `@lenticule-science/metrologic/hyperdoctrine/adjoints`'s `existsAlong` already generalizes (fiber join over a `FiniteFibration`/`IndexMorphism`) — this package adds no new quantifier machinery, only the diagonal morphism and the two order instantiations.

## License

Follows the repository.
