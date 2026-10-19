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

/**
 * The generic mathematical portion of "an example of a class of a category".
 *
 * Derive the nontrivial closed concepts around one actual member of a finite
 * formal context. "Class" means a proper shared-attribute closed extent;
 * "category candidate" means a DIRECT STRICT PARENT of such a class in the
 * supported concept subposet. Neither depends on a domain label, source
 * witness, business role, word similarity or a claimed categorical process.
 *
 * The existing enumerator intentionally retains only concepts with >=2
 * members and nonempty intent. Therefore cover arrows refer to the induced
 * nontrivial-concept POS(E)T, not the entire complete FCA lattice.
 *
 * Input must be source-admitted by its caller. This purely mathematical
 * function neither validates external evidence nor manufactures negative
 * incidence from missing attributes. When original enumeration becomes
 * approximate, it refuses exact derivation instead of relabeling greed.
 *
 * @template Id
 * @param {ReadonlyArray<{id:Id,attrs:ReadonlySet<string>}>} objects
 * @param {(id:Id)=>string} idOf
 * @param {string} example
 */
export function deriveExampleClassCategory(objects, idOf, example) {
  if (!Array.isArray(objects) || typeof idOf !== "function" ||
      typeof example !== "string" || example.length === 0) {
    throw new TypeError("example-class-category requires actual objects, identity function and focal example");
  }
  const identifiers = objects.map(item => {
    if (!item || !(item.attrs instanceof Set) ||
        [...item.attrs].some(attr => typeof attr !== "string" || !attr.length)) {
      throw new TypeError("example-class-category requires source-admitted finite attribute sets");
    }
    const id = idOf(item.id);
    if (typeof id !== "string" || !id.length) {
      throw new TypeError("example-class-category identities must be nonempty strings");
    }
    return id;
  });
  if (new Set(identifiers).size !== identifiers.length ||
      !identifiers.includes(example)) {
    throw new TypeError("example-class-category focus must name exactly one distinct original member");
  }
  const exact = enumerateFormalConcepts(objects,idOf);
  if (exact.fellBackToGreedy) {
    throw new RangeError("example-class-category exact FCA requires source-bounded computation: " + exact.fallbackReason);
  }
  const ordered = xs => Object.freeze([...xs].sort());
  const includes = (small,big) => small.every(x => big.includes(x));
  const stricter = (small,big) => small.length < big.length && includes(small,big);
  const extentOf = objects.map((item,index) => ({id:identifiers[index],attrs:item.attrs}));
  const common = extentOf.length === 0 ? [] : [...extentOf[0].attrs]
    .filter(attribute => extentOf.every(item => item.attrs.has(attribute)));
  const top = Object.freeze({
    key:JSON.stringify(["extent",...ordered(identifiers)]),
    extent:ordered(identifiers),
    intent:ordered(common)
  });
  const concepts = new Map([[JSON.stringify(top.extent),top]]);
  for (const concept of exact.concepts) {
    if (!Array.isArray(concept.extent) || !Array.isArray(concept.intent)) {
      throw new TypeError("example-class-category received malformed FCA concept");
    }
    const extent = ordered(concept.extent.map(idOf)), intent = ordered(concept.intent);
    if (extent.length < 2 || !stricter(extent,top.extent)) continue;
    concepts.set(JSON.stringify(extent), Object.freeze({
      key:JSON.stringify(["extent",...extent]),extent,intent
    }));
  }
  const nodes=Object.freeze([...concepts.values()].sort((a,b) =>
    a.extent.length-b.extent.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)));
  const arrows=Object.freeze(nodes.flatMap(from => nodes
    .filter(to => includes(from.extent,to.extent))
    .map(to => Object.freeze({from:from.key,to:to.key,relation:"extent-inclusion"}))));
  const covers=Object.freeze(arrows.filter(arrow => {
    if (arrow.from===arrow.to) return false;
    const from=nodes.find(n=>n.key===arrow.from);
    const to=nodes.find(n=>n.key===arrow.to);
    return !nodes.some(mid => stricter(from.extent,mid.extent) && stricter(mid.extent,to.extent));
  }));
  const focusNodes=nodes.filter(node=>node.key!==top.key && node.extent.includes(example));
  const minimal=focusNodes.filter(node=>!focusNodes.some(smaller=>stricter(smaller.extent,node.extent)));
  const paths=Object.freeze(minimal.map(cls=>{
    const parents=covers.filter(e=>e.from===cls.key)
      .map(e=>nodes.find(n=>n.key===e.to));
    return Object.freeze({
      example,
      class:cls,
      categoryCandidates:Object.freeze(parents.filter(p=>p.intent.length>0)),
      parentWithNoSharedAttribute:Object.freeze(parents.filter(p=>p.intent.length===0)),
      // A parent in the supported subposet is not an authorized enterprise
      // operation or a claim that absent source evidence is false.
    });
  }));
  const state=paths.some(p=>p.categoryCandidates.length>0) ?
    "derived-class-and-category-candidates" :
    (minimal.length ? "class-derived-without-grounded-parent-category" : "no-shared-nontrivial-class");
  return Object.freeze({
    kind:"metrologic.fca.example-class-category.v1",example,state,
    top,concepts:nodes,arrows,covers,paths,
    completeness:"exact-among-enumerated-nontrivial-formal-concepts",
    excludesUnobservedClaims:false
  });
}
