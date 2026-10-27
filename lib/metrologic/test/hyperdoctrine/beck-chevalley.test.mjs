// Beck–Chevalley — the base-change theorem for a pullback square of index morphisms
//   K --q--> I
//   |p       |g
//   v        v
//   J --f--> L
// (K = { (j,i) : f(j) = g(i) }, `pullbackSquare` builds it): for any fiber `phi` over `I`,
//   ∃_p(q*(phi)) = f*(∃_g(phi))
// as fibers over `J`. Property-tested on RANDOM finite morphisms at both orders, including the case
// where the square's apex `K` is empty (f and g's images never meet) — the theorem holds vacuously
// there too, which is itself part of what's being checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE, TRUTH, sameValue } from "../../src/hyperdoctrine/order.mjs";
import { reindex, existsAlong, pullbackSquare } from "../../src/hyperdoctrine/adjoints.mjs";
import { keys, randFiber, randMorphism, randInt } from "./_fixtures.mjs";

const N = 60;
const orders = [KNOWLEDGE, TRUTH];
const sameFiber = (a, b, ks) => ks.every((k) => sameValue(a.get(k), b.get(k)));

test("Beck–Chevalley: exists_p(q*(phi)) = f*(exists_g(phi))  (knowledge and truth)", () => {
  for (const order of orders) {
    for (let n = 0; n < N; n++) {
      const J = keys(2 + randInt(2), "j"), I = keys(2 + randInt(2), "i"), L = keys(2 + randInt(2), "l");
      const f = randMorphism(J, L), g = randMorphism(I, L);
      const { p, q } = pullbackSquare(f, g);
      const phi = randFiber(I);

      const lhs = existsAlong(p, reindex(q, phi), order);
      const rhs = reindex(f, existsAlong(g, phi, order));

      assert.ok(sameFiber(lhs, rhs, J), `order=${order}, |K|=${p.source.length}`);
    }
  }
});

test("pullbackSquare: rejects morphisms that don't share a target index set", () => {
  const f = { source: ["j0"], target: ["l0"], map: () => "l0" };
  const g = { source: ["i0"], target: ["l1"], map: () => "l1" };
  assert.throws(() => pullbackSquare(f, g), TypeError);
});

test("pullback square preserves distinct structured strings with embedded NUL and delimiters",()=>{
 const J=["a\\u0000b","a"],I=["c","b\\u0000c"],L=["l"];
 const f={source:J,target:L,map:()=> "l"},g={source:I,target:L,map:()=> "l"};
 const {K,p,q}=pullbackSquare(f,g);
 assert.equal(K.length,4);
 assert.equal(new Set(K).size,4,
   "distinct pairs cannot collapse under a separator byte inside their source");
 for(const j of J)for(const i of I){
   const matches=K.filter(key=>p.map(key)===j&&q.map(key)===i);
   assert.equal(matches.length,1,`lost original source pair ${JSON.stringify([j,i])}`);
 }
 const phi=new Map([[I[0],"potential"],[I[1],"active"]]);
 for(const order of [KNOWLEDGE,TRUTH]){
   const lhs=existsAlong(p,reindex(q,phi),order);
   const rhs=reindex(f,existsAlong(g,phi,order));
   for(const j of J)assert.ok(sameValue(lhs.get(j),rhs.get(j)));
 }
 assert.equal(Object.isFrozen(K),true);
 assert.equal(Object.isFrozen(p.table),true);
 assert.equal(Object.isFrozen(q.table),true);
});
