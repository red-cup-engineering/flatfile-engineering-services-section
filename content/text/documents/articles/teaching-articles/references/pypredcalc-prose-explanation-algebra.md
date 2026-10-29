---
title: Algebra
type: reference
status: historical-software-documentation
date-recorded: 2026-10-28
original-source: https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/explanation/algebra.md
source-revision: git-blob:sha1:87ce4332c6b1ddaa363e4108fb80aad2aba387d7
---
Layer-0 algebraic carriers.

## Realized

### `pypred.algebra.bilattice`

Four-element Belnap bilattice FOUR with truth and knowledge orders, joins, meets, negation, and the negation-induced permutation matrix on a valued alphabet.
Every operation has property-test coverage of its lattice and interlacing axioms (`tests/property/test_bilattice_laws.py`): commutativity, associativity, idempotence, absorption, order/lattice consistency, distributivity in both orders, interlaced monotonicity of each order's operations in the other order, and the negation laws (involutivity, de Morgan in the truth order, knowledge-order homomorphism, fixed BOT/TOP, swap T↔F).

### `pypred.algebra.pre_bilattice`

Finite axiom-checker for pre-bilattices: two bounded lattice structures on the same carrier (truth and knowledge orders), with no further interaction enforced.

### `pypred.algebra.twist_product`

Ginsberg's L⋈L construction: given a bounded lattice L, builds the interlaced bilattice on L × L with truth order ``(a, b) ≤_t (c, d) iff a ≤ c and d ≤ b``, knowledge order ``(a, b) ≤_k (c, d) iff a ≤ c and b ≤ d``, and negation ``~(a, b) = (b, a)``.
``boolean_twist()`` recovers FOUR.

### `pypred.algebra.residuated_lattice`

Finite commutative integral residuated lattice with full constructor validation (partial-order axioms, true LUB/GLB, monoid associativity and commutativity, integrality of the unit, monotonicity of ⊗, and the residuation biconditional ``a ⊗ b ≤ c iff b ≤ a → c``).
The derived ``residuum`` operation is verified by property tests (`tests/property/test_residuation_adjunction.py`) on the boolean instance and on chain Heyting algebras of size ≤ 5.
``boolean_residuated_lattice()`` exposes the canonical two-element instance.
