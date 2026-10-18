// The formal context and its Galois machinery: extents, intents, attribute
// closure, and the Duquenne–Guigues canonical basis via Ganter's algorithm.
// The basis is not an analysis artifact here — it IS the machine's compiled
// knowledge, and (see nuclei.mjs) its implication-closure is the saturation
// operator σ.
//
// The denial lane: when denial rows are given, the context's attribute
// ALPHABET ctx.A is the dichotomized M ⊔ ¬M (standard FCA attribute
// negation) — an object bears ¬m when it is witnessed NOT to bear m. The
// basis then carries laws with denied premises and denied conclusions, and
// one closure propagates both lanes (penguin → ¬flies). ctx.M stays the
// base attribute universe consumers iterate; ctx.A is what the Galois
// machinery closes over. withSignedAttributes explicitly extends a context's
// alphabet before an additional negative reading arrives, without inventing
// a denial incidence. See specifications/formal-context.md.

import { settle } from "@red-cup-engineering/metrologic/settlement";

export const NEG = "¬";

const signedAlphabet = attributes => [...attributes, ...attributes.map(m => NEG + m)];

// An incidence is an ordered (object, attribute) pair. A delimiter-joined key
// aliases distinct valid string coordinates whenever either contains that delimiter.
// JSON tuple encoding is injective for the admitted string carrier, including NUL,
// slashes, Unicode, and literal negation markers; no delimiter escapes are guessed.
const incidenceKey = (object, attribute) => JSON.stringify([object, attribute]);

export function isDenied(a) {
  return a.startsWith(NEG);
}

export function baseAttr(a) {
  return isDenied(a) ? a.slice(NEG.length) : a;
}

export function makeContext(objects, attributes, incidencePairs, denialPairs = []) {
  const G = [...objects];
  const M = [...attributes];
  // A formal context is a relation on *sets* G and M, not an unchecked
  // collection of string-coerced rows. The public FCA carrier is strings.
  if (G.some((g) => typeof g !== "string") || M.some((m) => typeof m !== "string"))
    throw new TypeError("makeContext: objects and base attributes must be strings");
  if (new Set(G).size !== G.length || new Set(M).size !== M.length)
    throw new TypeError("makeContext: objects and base attributes must be distinct");
  // The public notation uses the literal ¬ prefix for the negative injection.
  // Its two coproduct injections are NOT disjoint when a base name already
  // begins with ¬; refuse this representational collision, rather than
  // silently promoting evidence against x into positive evidence for ¬x.
  if (M.some((m) => m.startsWith(NEG)))
    throw new TypeError("makeContext: base attribute uses the reserved negation prefix; supply its negative evidence in denialPairs");
  if (!Array.isArray(incidencePairs) || !Array.isArray(denialPairs))
    throw new TypeError("makeContext: incidence and denial rows must be arrays");
  const objectsSet = new Set(G), attributesSet = new Set(M);
  for (const [g, m] of [...incidencePairs, ...denialPairs]) {
    if (!objectsSet.has(g) || !attributesSet.has(m))
      throw new TypeError("makeContext: an incidence row names an object or base attribute outside the context");
  }
  const A = denialPairs.length > 0 ? signedAlphabet(M) : [...M];
  const attrIndex = new Map(A.map((a, i) => [a, i]));
  const I = new Set([
    ...incidencePairs.map(([g, m]) => incidenceKey(g, m)),
    ...denialPairs.map(([g, m]) => incidenceKey(g, NEG + m)),
  ]);
  return { G, M, A, attrIndex, I };
}

/**
 * Extend an admitted context to M ⊔ ¬M without adding evidence. The original
 * G, M and incidence relation are shared unchanged. This is idempotent, and
 * leaves makeContext's positive-only default intact. An unobserved ¬m is a
 * valid coordinate with empty extent; a name outside M ⊔ ¬M still refuses.
 */
export function withSignedAttributes(ctx) {
  const A = signedAlphabet(ctx.M);
  if (ctx.A.length === A.length && ctx.A.every((attribute, index) => attribute === A[index]))
    return ctx;
  return { ...ctx, A, attrIndex: new Map(A.map((attribute, index) => [attribute, index])) };
}

export function has(ctx, g, m) {
  return ctx.I.has(incidenceKey(g, m));
}

// A prime operator is defined on a subset of the context's declared carrier,
// not on arbitrary labels. Unknown attributes previously gave an empty extent
// and therefore an all-attribute double-prime closure: an unearned inference.
// Accept the finite Set/Array carriers that existing FCA consumers actually
// supply, and snapshot the input before quantifying over it.
function admitContextSubset(values, universe, label) {
  if (!Array.isArray(values) && !(values instanceof Set))
    throw new TypeError(`FCA ${label} subset must be a finite Set or Array`);
  const allowed = new Set(universe), selected = new Set();
  for (const value of values) {
    if (!allowed.has(value))
      throw new TypeError(`FCA ${label} lies outside the declared context carrier`);
    selected.add(value);
  }
  return selected;
}

// intent of an object set: attributes borne by every object in A.
export function intent(ctx, A) {
  const selected = admitContextSubset(A, ctx.G, "object");
  const out = new Set();
  for (const m of ctx.A) {
    let all = true;
    for (const g of selected) if (!has(ctx, g, m)) { all = false; break; }
    if (all) out.add(m);
  }
  return out;
}

// extent of an attribute set: objects bearing every attribute in B.
export function extent(ctx, B) {
  const selected = admitContextSubset(B, ctx.A, "attribute");
  const out = new Set();
  for (const g of ctx.G) {
    let all = true;
    for (const m of selected) if (!has(ctx, g, m)) { all = false; break; }
    if (all) out.add(g);
  }
  return out;
}

// Attribute closure B'' — the Galois double prime.
export function closeAttrs(ctx, B) {
  return intent(ctx, extent(ctx, B));
}

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// Closure of X under a list of implications {from:Set, to:Set}.
//
// The knowledge order on an attribute set is inclusion: a set knows everything a
// smaller one knows. One pass over the implications is knowledge-monotone and
// inflationary (it only ever adds), so its closure is the least fixed point of that
// step — the settlement node, `@lenticule-science/obsmetrologic-settlement`. What is
// this module's own is the STEP (which implications fire on which premises) and the
// fiber (attribute sets under union); the ITERATION is not reimplemented here.
export function impClosure(implications, X) {
  const firePass = (held) => {
    const out = new Set(held);
    for (const imp of implications) {
      let fires = true;
      for (const m of imp.from) if (!out.has(m)) { fires = false; break; }
      if (!fires) continue;
      for (const m of imp.to) out.add(m);
    }
    return out;
  };
  const { state } = settle(firePass, new Set(X), {
    merge: (before, after) => new Set([...before, ...after]),
    equal: setEq,
    divergenceMessage: "impClosure did not reach a fixed point; the implication list is not inflationary",
  });
  return state;
}

// Duquenne–Guigues canonical basis, by Ganter's Next Closure over the
// implication-closure operator, in the lectic order induced by ctx.A.
export function dgBasis(ctx) {
  const M = ctx.A;
  // The old capped loop returned an incomplete basis as though it were exact
  // when more than 20 attribute coordinates were present. Do not issue a
  // purported canonical implication basis if full Next Closure is not admitted.
  if (M.length > 20)
    throw new RangeError("dgBasis: exact canonical basis requires at most 20 attribute coordinates");
  const L = [];
  let A = impClosure(L, new Set());
  const full = new Set(M);
  for (let guard = 0; guard < 2 ** M.length; guard++) {
    const closed = closeAttrs(ctx, A);
    if (!setEq(A, closed)) L.push({ from: new Set(A), to: new Set([...closed].filter((m) => !A.has(m))) });
    if (setEq(A, full)) return L;
    A = nextLectic(ctx, L, A);
    if (A === null) return L;
  }
  throw new RangeError("dgBasis: closure enumeration exceeded its exact finite bound");
}

// The supported sub-basis: every implication whose premise some object
// realizes. A premise no object realizes has empty extent, so its FCA
// closure is all of ctx.A — ex falso, the classical explosion. Closure of a
// realized attribute set never passes through an unrealized one, so on
// realized sets the two bases agree; on a contradicting seed the supported
// basis fires only the consequences of its realized sub-premises and leaves
// the contradiction a local contested cell. This is the basis settle() runs.
export function lawfulBasis(ctx) {
  // An unobserved column cannot occur in a supported premise or conclusion.
  // Every subset of a supported premise is itself supported, with the same
  // double-prime closure after removing unobserved columns. Thus its entire
  // pseudo-intent test, and the supported DG implication family, are unchanged.
  // Only compilation uses this projection: the declared alphabet and the full
  // Galois closure remain intact, including for unrealized or contradictory seeds.
  const A = ctx.A.filter(attribute => ctx.G.some(object => has(ctx, object, attribute)));
  const observed = A.length === ctx.A.length ? ctx : {
    ...ctx, A, attrIndex: new Map(A.map((attribute, index) => [attribute, index])),
  };
  return dgBasis(observed).filter((imp) => extent(ctx, imp.from).size > 0);
}

// Lectic successor of A among impClosure(L, ·)-closed sets.
function nextLectic(ctx, L, A) {
  const M = ctx.A;
  for (let i = M.length - 1; i >= 0; i--) {
    const m = M[i];
    if (A.has(m)) continue;
    const seed = new Set([...A].filter((x) => ctx.attrIndex.get(x) < i));
    seed.add(m);
    const B = impClosure(L, seed);
    // B must be the lectic successor: no attribute before position i that A lacks.
    let ok = true;
    for (const x of B) {
      if (ctx.attrIndex.get(x) < i && !A.has(x)) { ok = false; break; }
    }
    if (ok) return B;
  }
  return null;
}
