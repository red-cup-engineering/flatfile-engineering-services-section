# Exact-number family received at its primitive owner

`services/number-services-section/services/exact-number-data-service` owns the
exact-number, rational-matrix, deterministic-math, quadratic, decimal-string,
graded and host-conversion family. The section root retains all seven existing
public subpaths as forwarding exports and declares the owner as a runtime
dependency. The provider uses only its own local primitive modules.

The first four implementations and host conversion are byte-identical to the
current provider. Graded differs only by a trailing blank line; the provider's
decimal-string module preserves all existing implementation and adds
`expandDecimalNotation`. All original root bytes from the current receiving
base are preserved under this directory; their Git blobs are recorded below.
These preserved carriers are evidence, not runtime sources.

- `exact-number.mjs`: `51a95366c174c70d56cea3ab9cc6b3dbda84e7a3`
- `rational-matrix.mjs`: `8e35cd131c4f602274b4a009ebdf0ff1ef2ec1bd`
- `deterministic-math.mjs`: `c6ce9a9e6bbe3481277453a139dd3c007019f600`
- `quadratic.mjs`: `cd055065832d61b894d382f5a7cfe0c42c475194`
- `decimal-string.mjs`: `6c5ebe71ede2d43c491f3eeadc2c9fb3db96e289`
- `graded.mjs`: `c68ea2d32bd848ef17ce5d4ec322aa973aabc131`
- `exact-number-host.mjs`: `c8119a45c682abbae89eced9b8784232a476eb52`
