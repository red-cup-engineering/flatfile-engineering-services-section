/**
 * The closed concepts of a formal context given as `{ id, attrs }` objects, with deterministic
 * computation ceilings past which the enumeration falls back, explicitly, to one group per
 * attribute. formal-context.mjs holds the context's Galois machinery and canonical basis; this
 * module enumerates concepts. Context `(G, M, I)`: `G` = objects (rooms),
 * `M` = attribute universe, `I` = incidence (object carries attribute). A closed concept is a
 * pair `(extent, intent)` where `intent` is exactly the set of attributes common to every object
 * in `extent`, and `extent` is exactly the set of objects carrying every attribute in `intent` —
 * closure, not a superset match.
 *
 * Algorithm: the set of all closed intents realizable by some extent of size >= 1 is exactly the
 * intersection-closure of the family `{ intent(g) : g in G }` (standard Galois-connection fact).
 * Since the attribute universe is expected small (tens of values), computing that closure by
 * repeated pairwise intersection to a fixpoint is fine — past a configurable ceiling this falls
 * back to a capped greedy grouping.
 */

import { settle } from "@red-cup-engineering/metrologic/settlement";

function keyOfAttrs(s) {
  return JSON.stringify([...s].sort());
}

function keyOfExtent(ids) {
  return JSON.stringify(ids.slice().sort());
}

function intersect(a, b) {
  const out = new Set();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

/** Attribute-count ceiling past which the compiler warns and falls back to a capped greedy
 * grouping rather than risk a combinatorial hang. */
/** Exact FCA is used through 500 distinct attributes and 1024 closed intents; either bound
 * selects the documented deterministic greedy grouping instead of an unbounded closure. */
export const ATTRIBUTE_CEILING = 500;
export const CONCEPT_CEILING = 1024;

/** The settling step's refusal when the concept ceiling is reached mid-closure: a private
 * sentinel, so only this module's own ceiling is ever read as the greedy-fallback signal. */
const conceptCeilingReached = Symbol("fca.concept-ceiling-reached");

/**
 * Compute every closed concept `(extent, intent)` with `|extent| >= 2` and `intent != ∅` over
 * the given objects. `idOf` extracts a stable string key from an object id for dedup/sorting.
 * @template Id
 * @param {ReadonlyArray<{id: Id, attrs: ReadonlySet<string>}>} objects
 * @param {(id: Id) => string} idOf
 * @returns {{ concepts: Array<{intent: string[], extent: Id[]}>, fellBackToGreedy: boolean, fallbackReason: "attribute-ceiling" | "concept-ceiling" | null }}
 */
export function enumerateFormalConcepts(objects, idOf) {
  const attributeUniverse = new Set();
  for (const o of objects) for (const a of o.attrs) attributeUniverse.add(a);

  if (attributeUniverse.size > ATTRIBUTE_CEILING) {
    return { concepts: greedyFallback(objects, idOf), fellBackToGreedy: true, fallbackReason: "attribute-ceiling" };
  }

  // Intersection-closure of the family of object intents.
  const seenKeys = new Set();
  const family = [];
  const add = (s) => {
    if (s.size === 0) return;
    const k = keyOfAttrs(s);
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    family.push(s);
  };
  for (const o of objects) {
    const intent = new Set(o.attrs);
    if (!seenKeys.has(keyOfAttrs(intent)) && family.length >= CONCEPT_CEILING) {
      return { concepts: greedyFallback(objects, idOf), fellBackToGreedy: true, fallbackReason: "concept-ceiling" };
    }
    add(intent);
  }

  // The intersection-closure is the least fixed point of one pairwise-intersection pass over
  // the family, in the knowledge order that orders intent families by inclusion: a pass only
  // ever adds intents, so it is monotone and inflationary. Reaching that fixed point is the
  // settlement node, `@lenticule-science/obsmetrologic-settlement`; what is this compiler's own
  // is the STEP (pairwise intersection, deduped by sorted-attribute key) and the ceiling that
  // refuses an unbounded closure.
  const closurePass = (current) => {
    const next = current.slice();
    const keys = new Set(next.map(keyOfAttrs));
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        if (!a || !b) continue;
        const inter = intersect(a, b);
        if (inter.size === 0) continue;
        const k = keyOfAttrs(inter);
        if (keys.has(k)) continue;
        if (next.length >= CONCEPT_CEILING) throw conceptCeilingReached;
        keys.add(k);
        next.push(inter);
      }
    }
    return next;
  };
  let closedFamily;
  try {
    ({ state: closedFamily } = settle(closurePass, family, {
      // union of two intent families, the earlier family's order kept
      merge: (before, after) => {
        const out = before.slice();
        const keys = new Set(out.map(keyOfAttrs));
        for (const s of after) {
          const k = keyOfAttrs(s);
          if (keys.has(k)) continue;
          keys.add(k);
          out.push(s);
        }
        return out;
      },
      equal: (a, b) => a.length === b.length,
    }));
  } catch (error) {
    if (error !== conceptCeilingReached) throw error;
    return { concepts: greedyFallback(objects, idOf), fellBackToGreedy: true, fallbackReason: "concept-ceiling" };
  }

  // For each candidate closed intent, derive its extent, then re-close the intent from that
  // extent (exact closure, never a superset match), filter, and dedupe by extent.
  const byExtent = new Map();
  for (const candidateIntent of closedFamily) {
    const extentObjs = objects.filter((o) => isSubset(candidateIntent, o.attrs));
    if (extentObjs.length < 2) continue;
    let closed;
    for (const o of extentObjs) {
      closed = closed === undefined ? new Set(o.attrs) : intersect(closed, o.attrs);
    }
    if (!closed || closed.size === 0) continue;
    const extentIds = extentObjs.map((o) => o.id);
    const extentKey = keyOfExtent(extentIds.map(idOf));
    if (byExtent.has(extentKey)) continue;
    byExtent.set(extentKey, {
      intent: [...closed].sort(),
      extent: extentIds.slice().sort((x, y) => (idOf(x) < idOf(y) ? -1 : idOf(x) > idOf(y) ? 1 : 0)),
    });
  }

  return { concepts: [...byExtent.values()], fellBackToGreedy: false, fallbackReason: null };
}

function isSubset(sub, sup) {
  for (const x of sub) if (!sup.has(x)) return false;
  return true;
}

/** Capped greedy grouping fallback for pathologically large attribute universes: one group per
 * attribute value, capped extent size, no closure guarantee. */
function greedyFallback(objects, idOf) {
  const GREEDY_CAP = 200;
  const byAttr = new Map();
  for (const o of objects) {
    for (const a of o.attrs) {
      const list = byAttr.get(a) ?? [];
      if (list.length < GREEDY_CAP) list.push(o.id);
      byAttr.set(a, list);
    }
  }
  const out = [];
  for (const [attr, ids] of byAttr) {
    if (ids.length < 2) continue;
    out.push({ intent: [attr], extent: ids.slice().sort((x, y) => (idOf(x) < idOf(y) ? -1 : idOf(x) > idOf(y) ? 1 : 0)) });
  }
  return out;
}
