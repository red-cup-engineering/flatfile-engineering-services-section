# Retired: copies of exact-number-data-service in the section root

These four modules were byte-identical copies of `@red-cup-engineering/exact-number-data-service`
(`services/number-services-section/services/exact-number-data-service`). That service is their owner by
domain and by history: it was added in 428bbe9 (2026-10-06, "Recover shared exact arithmetic into data
engineering source"). The section root carried copies from 97707f7 (2026-10-09) so its own
`./number/*` exports would resolve. They are kept here byte for byte. Under `legacy/`, the release
tooling reads no runtime file from them.

| Copy (was `src/number/…`) | Git blob | Owner's export now |
|---|---|---|
| `exact-number.mjs` | 51a95366 | `@red-cup-engineering/exact-number-data-service/exact-number` |
| `rational-matrix.mjs` | 8e35cd13 | `@red-cup-engineering/exact-number-data-service/rational-matrix` |
| `deterministic-math.mjs` | c6ce9a9e | `@red-cup-engineering/exact-number-data-service/deterministic-math` |
| `quadratic.mjs` | cd055065 | `@red-cup-engineering/exact-number-data-service/quadratic` |

The root's exports `./number/exact-number`, `./number/rational-matrix`, `./number/deterministic-math` and
`./number/quadratic` are retired with them; import the owner's exports above. The root's own
`decimal-string`, `graded` and `exact-number-host` (not copies) now import `exact-number` from the owner.
The root's two tests of these modules read the owner's exports.
