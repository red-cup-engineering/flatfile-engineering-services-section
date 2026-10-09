# Fixed-residue certificate parameter boundary

## Requirement and owner

The existing `Obsmetrologia.residue_germ_ahead` catalog entry must describe one
fixed nonzero natural residue for its entire lifetime. Both `germCertificate`
and `certificateOf` must use one owned canonical immutable residue value for
their stored parameters, exposed residue, step, orbit, domination bounds and
any carrier returned by `closeByCertificate`.

This is a correction within Metrologic's existing constructor and catalog in
`red-cup-engineering/computer-data-services-section`. It does not add a second
certificate engine or rename any theorem. The earlier natural-domain rejection
in [PR40](https://github.com/red-cup-engineering/computer-data-services-section/pull/40)
remains correct: an initially negative residue is still rejected. This change
closes the distinct lifetime and getter check/use gap after that repair.

## Mathematical source and interpretation

The original source is preserved at machine snapshot
`emsenn/bare-cedar-fog@037562d8cb0c18c20e09e34d9116d3917f351b5f`:

- [Record](https://github.com/emsenn/bare-cedar-fog/blob/037562d8cb0c18c20e09e34d9116d3917f351b5f/lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/Language/Positing/Record.lean#L67-L72)
  has two `Nat` coordinates. Its `DomBy` relation (lines 854–855) requires one
  record bound covering every sequence index.
- [RegimeCycle](https://github.com/emsenn/bare-cedar-fog/blob/037562d8cb0c18c20e09e34d9116d3917f351b5f/lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/Closure/RegimeCycle.lean#L339-L345)
  defines `residue_germ_ahead` from one `c`, its nonzero proof and a total
  `Nat → Record` seed. `residue_dichotomy` (lines 157–180) supplies mutual
  domination using `scale c k` and `kBot`; the stage-dependent bound is uniform
  over the sequence index. `iterSeq_residueBump` gives the closed form
  `s(n) + k*c`.

The runtime interpretation maps each accepted nonnegative safe-integer pair
to those natural coordinates, and each permitted pure total seed to a record
sequence. Mutating `c` changes the dynamic and does not instantiate the same
fixed-parameter construction. The original source is provenance, not a new
corporate destination or evidence of current split-provider elaboration.

## Design and observable contract

1. Resolve the existing catalog entry and check its requested shape before
   inspecting parameters. Preserve the current unknown-declaration and
   shape-mismatch obstructions.
2. The residue entry's `capture` hook reads the caller's residue and seed once,
   and copies each consumed residue coordinate once into ordinary scalar data.
   Unrelated metadata is neither enumerated nor read at this point. Inherited
   or nonenumerable consumed parameters still participate through ordinary
   property lookup.
3. Validate this captured pair using the existing safe-integer, nonnegative and
   nonzero guards, and validate that same seed reference as a function. Missing
   coordinates remain `undefined` and fail before any `record()` default can
   supply zero. The existing hypothesis labels and ordering remain unchanged.
4. Only after admission, the entry's `canonicalize` hook builds `record(pos, neg)`
   from those validated data coordinates. Copy unrelated own enumerable
   string/symbol metadata only now, skipping consumed keys without rereading
   their getters. Define own data properties so an own `__proto__` key cannot
   change the wrapper's prototype. Freeze the owned parameter wrapper, store
   it, and pass that exact wrapper to the existing realizer. Every certificate/
   carrier residue reference is that one frozen own-data record. Metadata
   getters cannot replace or mutate the already captured validated residue or
   seed reference, even if they change the caller's inputs while copying.

Independent review of the first local candidate found that copying metadata
inside `capture` could throw before returning an otherwise valid hypothesis
obstruction. Preserve that review history: the revised design delays all such
metadata work until admission. Invalid consumed values must return their
original hypothesis labels without touching unrelated metadata getters or
enumeration traps.

The caller object is never frozen, modified or retained as the consumed residue.
Successful construction intentionally ceases to promise caller object identity,
including for already-frozen inputs: accepted values and callable behavior are
preserved, while `certificate.residue !== input.residue` and
`certificate.residue === certificate.parameters.residue`. A frozen caller object
can contain changing accessor values, so its frozen status alone is insufficient.
The existing identity assertion is corrected to this value-boundary contract,
not removed to hide a behavioral failure.

Unrelated metadata remains shallow; its objects need not be deeply frozen. It
does not influence this realizer. The seed is the captured function reference;
this change cannot freeze its closure or prove its purity. Exceptions from
consumed getters, or metadata getters reached after admission, remain ordinary
exceptions, not a new admission protocol.
The ahead family retains its existing completion and behavior. The separate
`residueReading` helper is unchanged.

## Focused acceptance

Use the existing Node test runner, one worker and a bounded heap, without a
dependency install. `certificate-fixed-residue.test.mjs` checks both constructors:

- Caller mutation to zero, negative and another positive pair cannot alter
  saved/future steps, old/new orbit values, either domination bound, or a
  previously closed carrier; the caller remains writable
- Exposed residue aliases are identical frozen own-data values and cannot mutate
  the certificate; saved bounds stay frozen
- Consumed parameter and coordinate getters are read once, and those exact
  captured values reach stored parameters and executable behavior
- Invalid first reads and missing fields cannot become valid later reads or
  `record()` defaults; frozen/inherited accessors become scalar snapshots
- Unrelated enumerable metadata stays shallow; unknown/shape guards run before
  parameter getters; the ahead construction remains unaffected
- Invalid captured inputs are rejected before unrelated metadata getters or
  enumeration traps; admitted metadata getters cannot change the fixed dynamic
  by changing caller inputs, and own `__proto__`/symbol data remain safe

Retain the original PR40 negative, malformed, unsafe, zero, seed, canonical input
and ahead controls, with the one explained caller-identity contract correction.
The focused regression also demonstrates that a seed agreeing on a finite prefix
can fail outside it: a passing spot check is not all-index seed conformance.

## Evidence and limits

Prepared against owner revision `a140b5b52a9c034a7e84fb25c7f3e3be93327167`, with
certificate baseline blob `86e4ab32c269dc5f1761c22963930f2e9f16d12c` and
`four.mjs` blob `249f465dfcb4f5cfb26ae45d0d71c1621b71daee`. The two retained original
Lean blobs are `eefbe878f3dfb0d036ff00828df30c168435a758` and
`e8b5da7175b530225be0aad8233b498f7fe1e60a`, respectively RegimeCycle and Record.

The revised bounded local baseline failed 16 new regressions and passed 51
tests; the candidate passed all 67 selected tests. All unchanged original
controls and the eight independent rejection-order fixtures passed on the
baseline. The first local candidate's 53-test result did not cover those eight
fixtures and is preserved as superseded evidence. These finite
source-conformance results do not claim a full
suite pass, Lean elaboration, proof-provider binding, deployment or independent
receiving. Natural-safe input guards do not establish safe unbounded arithmetic,
and this change proves neither seed totality/purity nor arbitrary process
correspondence. No native authentication or physical-source-reader change is
part of this repair.
