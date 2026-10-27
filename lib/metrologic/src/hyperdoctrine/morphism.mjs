// morphism.mjs — the finite index morphisms the hyperdoctrine fibers over, and their hand-rolled
// validation. No JSON-schema, no ajv: a morphism is checked by running it, the same way the bilattice
// floor is checked by running it.
//
// An IndexMorphism `u: J → I` is `{ source: string[], target: string[], map: (j: string) => string }` —
// a finite function given by listing its whole domain `source` (so `existsAlong`/`forallAlong` can group
// preimages) and codomain `target` (so vacuous cases — a target key nothing maps to — read as the
// order's ⊥/⊤ rather than being silently absent). A Fiber over an index set `I` is `Map<string, Reading>`,
// required COMPLETE over whatever index list it is read against (a reading for every key, even if that
// reading is `⊥` — nothing is read as absent-therefore-bottom; absence is a validation error).

/** @typedef {string} Reading a knowledge-family reading name from four.mjs (absurd/potential/active/stable) */
/** @typedef {{ source: string[], target: string[], map: (sourceKey: string) => string }} IndexMorphism */
/** @typedef {Map<string, Reading>} Fiber */

/**
 * Validate a finite index morphism: `source`/`target` are string arrays, `map` is a function, and `map`
 * sends every element of `source` into `target` (a total function landing in its declared codomain).
 * @param {IndexMorphism} u
 */
export function assertMorphism(u) {
  if (!u || !Array.isArray(u.source) || !Array.isArray(u.target) || typeof u.map !== "function") {
    throw new TypeError("assertMorphism: expected { source: string[], target: string[], map: fn }");
  }
  const target = new Set(u.target);
  for (const j of u.source) {
    const i = u.map(j);
    if (!target.has(i)) {
      throw new TypeError(`assertMorphism: map(${JSON.stringify(j)}) = ${JSON.stringify(i)} is not in target`);
    }
  }
}

/**
 * Validate that a fiber carries a reading for every key in `keys` — completeness, not mere non-emptiness.
 * A fibration measures every cell of its index; a missing key is a bug in the caller, not a silent ⊥.
 * @param {Fiber} fiber @param {string[]} keys
 */
export function assertFiberComplete(fiber, keys) {
  if (!(fiber instanceof Map)) throw new TypeError("assertFiberComplete: expected a Fiber (Map<string, Reading>)");
  for (const k of keys) {
    if (!fiber.has(k)) throw new TypeError(`assertFiberComplete: fiber is missing a reading for ${JSON.stringify(k)}`);
  }
}

/**
 * Receive a finite index morphism as pure, transportable data. The mapping is
 * exhaustive, not a supplied JavaScript closure: each source point has exactly
 * one explicitly named target image. The function is a derived local read of
 * the table for consumers of the existing adjoint operations.
 */

/** Inert finite-index schema snapshots. Not a canonical Cell codec. */
export function finiteIndexSourceRecord(input,label="finite index record") {
  if (!input || typeof input!=="object" || Array.isArray(input) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(input)))
    throw new TypeError(label+": expected a plain data record");
  const fields=Object.getOwnPropertyDescriptors(input),keys=Reflect.ownKeys(fields);
  if(keys.some(key=>typeof key!=="string"||!fields[key].enumerable||!Object.hasOwn(fields[key],"value")))
    throw new TypeError(label+": requires inert enumerable own data properties");
  return Object.freeze(Object.fromEntries(keys.map(key=>[key,fields[key].value])));
}
/** Dense own data only; no dynamic iterator, sparse slot or decoration. */
export function finiteIndexSourceArray(input,label="finite index array") {
  if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype)
    throw new TypeError(label+": expected an ordinary data array");
  const fields=Object.getOwnPropertyDescriptors(input);
  if(Reflect.ownKeys(fields).length!==input.length+1)
    throw new TypeError(label+": cannot be sparse or decorated");
  return Object.freeze(Array.from({length:input.length},(_,index)=>{
    const field=fields[String(index)];
    if(!field||!field.enumerable||!Object.hasOwn(field,"value"))
      throw new TypeError(label+": requires inert enumerable array slots");
    return field.value;
  }));
}
/** Admit one stable total finite mapping through the existing Metrologic owner. */
export function finiteIndexMorphismFromTable(source,target,table) {
  const domain=finiteIndexSourceArray(source,"finiteIndexMorphismFromTable source");
  const codomain=finiteIndexSourceArray(target,"finiteIndexMorphismFromTable target");
  const mapping=finiteIndexSourceRecord(table,"finiteIndexMorphismFromTable mapping table");
  const valid=keys=>keys.every(key=>typeof key==="string"&&key.length>0)&&new Set(keys).size===keys.length;
  if(!valid(domain)||!valid(codomain))
    throw new TypeError("finiteIndexMorphismFromTable: source and target need distinct nonempty string keys");
  const entries=Object.entries(mapping),from=new Set(domain),to=new Set(codomain);
  if(entries.length!==domain.length||entries.some(([key,value])=>!from.has(key)||!to.has(value)))
    throw new TypeError("finiteIndexMorphismFromTable: mapping must be total, exact and land in its codomain");
  const frozenTable=Object.freeze(Object.fromEntries(domain.map(key=>[key,mapping[key]])));
  const morphism=Object.freeze({kind:"hyperdoctrine.finiteIndexMorphism",
    source:domain,target:codomain,table:frozenTable,
    map:key=>{
      if(!Object.hasOwn(frozenTable,key))
        throw new TypeError(`finiteIndexMorphismFromTable: unknown source cell ${String(key)}`);
      return frozenTable[key];
    },
  });
  assertMorphism(morphism);
  return morphism;
}
