# Formal contexts and supported implication compilation

`closure/formal-context` owns finite indexed incidence, its Galois prime
operators, the exact Duquenne–Guigues basis, and the supported sub-basis.
Consumers supply object and attribute names and decide how their observations
populate the incidence relation. Agent policy and evidence acquisition remain
outside these operators.

## Declared signed attributes

The public context is `{G,M,A,attrIndex,I}`. `G` contains object names, `M`
contains base attribute names, and `A` is the alphabet on which the prime
operators act. Incidence keys preserve ordered string coordinates. The existing
reserved `¬` prefix gives the negative injection; base names beginning with it
are rejected by `makeContext` to keep the two injections disjoint.

`makeContext` retains its existing default: with no denial rows, `A=M`; with
denial rows, `A=M ⊔ ¬M`. The explicit `withSignedAttributes(ctx)` operation
extends an admitted context to `M ⊔ ¬M`, with a corresponding `attrIndex`,
while sharing `G`, `M`, and `I` unchanged. It is idempotent and does not mutate
its input. Declaring `¬m` creates no object bearing it.

An incoming negative reading of a known base attribute can therefore be a
valid but unrealized attribute set. Its extent is empty when no object in the
context realizes it. A name outside the declared signed alphabet still raises
the existing prime-operator admission error. Consumers must not delete a valid
negative reading or fabricate an incidence merely to make it fit a context.

`extent`, `intent`, and `closeAttrs` continue to use the full declared alphabet.
In particular, the intent of an empty extent is all of `A`, as required by
the Galois definition. Supported implication closure is the separate operation
used when this classical consequence would erase a local contradiction.

## Supported basis preservation under removal of unobserved columns

Let K=(G,A,I), let U contain exactly the attributes incident to at least one
object, and let Z=A\U. Let K_U be the same context restricted to columns U.

If a premise P is supported, then some object realizes it and P is a subset
of U. Every Q contained in P is also supported. Since its extent is nonempty,
its full double-prime closure contains only observed attributes, and

`closeAttrs(K,Q) = closeAttrs(K_U,Q)`.

The pseudo-intent criterion for P depends only on its own closure and the
closures of proper pseudo-intents contained in P. Induction on the size of P
therefore shows that P is a supported pseudo-intent of K exactly when it is
one of K_U, with the same consequent `P'' \ P`. Consequently:

`filterSupported(dgBasis(K)) = filterSupported(dgBasis(K_U))`

as implication families. The implementation retains the relative column order
of A when constructing U. Unsupported implications are still removed after
exact canonical enumeration.

Because the retained rule families are identical, the preservation applies to
every seed X contained in A, including unrealized or contradictory seeds:

`impClosure(lawfulBasis(K),X)`

`= (X ∩ Z) ∪ impClosure(lawfulBasis(K_U),X ∩ U)`.

Unused attributes can persist as explicit seed members but cannot appear in a
retained premise or conclusion. This also covers empty G: no premise is
supported, so the supported basis is empty.

Only `lawfulBasis` compiles on U. `dgBasis` still enumerates the full declared
alphabet and retains its exact 20-coordinate admission bound. The same bound
applies to the actual observed compilation carrier inside `lawfulBasis`;
unused columns do not consume its exponential enumeration budget. No method
returns a truncated implication basis.

## Acceptance

The signed-extension examples preserve all original incidences, keep the
positive-only constructor unchanged, admit an unobserved known denial, and
reject an unknown denial. The basis examples compare the projected supported
basis with the original full filtered canonical basis on all 256 two-object,
two-base-attribute signed incidence contexts, including all 16 seeds per
context. Capacity examples distinguish a large declared but mostly unobserved
alphabet from more than 20 actually incident coordinates. The original full
canonical-basis and strict prime-operator examples remain applicable.
