import assert from "node:assert/strict";
import test from "node:test";
import { astOfRoute, checkProofPathAst, routeOf, termKey } from "../src/index.mts";

// Carried from computer-filepath-engineering-services-section's address test when its copy of this
// implementation was retired (5e87abf): the cases that exercised the proof-path leg.

test("JSON prototype-shaped properties do not collide in proof-path term keys", () => {
  const term = JSON.parse('{"__proto__":{"important":true},"a":1}');
  assert.notEqual(termKey(term), termKey({ a: 1 }));
});

test("witnessed reachability terminates on cycles and retains the shortest earned route", () => {
  const witnesses = Array.from({ length: 3000 }, (_, i) => ({ domain: String(i), generator: "specialization", codomain: String((i + 1) % 3000) }));
  assert.equal(routeOf(witnesses, "0", "unreachable"), null);
  const route = routeOf(witnesses, "0", "2999");
  assert.equal(route.steps.length, 2999);
  assert.equal(checkProofPathAst(astOfRoute(route), witnesses), true);
  const shortcuts = [...witnesses, { domain: "0", generator: "specialization", codomain: "2999" }];
  assert.equal(routeOf(shortcuts, "0", "2999").steps.length, 1);
});
