import assert from "node:assert/strict";
import test from "node:test";
import {
  loopSum, vortexLoop, circulation, gradientVelocity, isGradient,
  gradientCirculationZero, circulationSuperpose, unitVortex,
  vortexObstruction, fluidVortexCohomologyReceipt,
} from "../src/models/physics/models/fluid.mjs";

const wire = value => JSON.parse(JSON.stringify(value));

test("Int circulation is exact and replayable; no binary64 or callback hides in a witness", () => {
  const velocity = ["9007199254740993", "-9007199254740992", "4"];
  const loop = vortexLoop(3, velocity);
  assert.deepEqual(loop.velocity, velocity);
  assert.equal(Object.isFrozen(loop), true);
  assert.equal(Object.isFrozen(loop.velocity), true);
  assert.equal(circulation(loop), "5");
  assert.equal(loopSum(velocity, 3), "5");
  assert.equal(circulation(wire(loop)), "5", "JSON transport retains mathematical cochain exactly");
  assert.equal(circulation(vortexLoop(0, [])), "0");
  const vortex = vortexObstruction(vortexLoop(1, ["9007199254740993"]));
  assert.equal(vortex.circulation, "9007199254740993");
  assert.equal(vortex.leanTheorems.length, 1,
    "an arbitrary vortex does not inherit the specialized unitVortex theorems");
  assert.deepEqual(wire(vortex), vortex);
});

test("finite gradients close, telescope and attest only the current KineticTheory theorem", () => {
  const potential = ["12345678901234567890", "12345678901234567892", "12345678901234567891", "12345678901234567890"];
  const differences = ["2", "-1", "-1"];
  const loop = vortexLoop(3, differences);
  assert.equal(isGradient(loop, potential), true);
  const proof = gradientCirculationZero(loop, potential);
  assert.equal(proof.circulation, "0");
  assert.deepEqual(proof.potential, potential);
  assert.equal(proof.leanTheorem,
    "Obsmetrologia.KineticTheory.Fluid.gradient_circulation_zero");
  assert.equal(isGradient(loop, ["0", "2", "1", "3"]), false,
    "a nonclosing potential cannot establish exactness");
  assert.throws(() => gradientCirculationZero(loop, ["0", "2", "1", "3"]), /closed gradient/);
  const generated = vortexLoop(2, gradientVelocity(node => node === 1 ? 1 : 0));
  assert.deepEqual(generated.velocity, ["1", "-1"]);
  assert.equal(gradientCirculationZero(generated, [0, 1, 0]).gradient, true);
  assert.throws(() => vortexObstruction(generated), /vanishes/,
    "zero circulation cannot be repackaged as a nontrivial H1 class");
});

test("exact circulation is additive over one sampled finite cochain, not unstable repeated function calls", () => {
  let calls = 0;
  const loop = vortexLoop(4, edge => { calls++; return edge < 2 ? "2" : "-1"; });
  assert.equal(calls, 4, "original caller is sampled exactly once per edge");
  assert.equal(circulation(loop), "2");
  assert.equal(calls, 4);
  for (let n = 0; n <= 32; n++) {
    const left = Array.from({length:n}, (_,i) => String((i%5)-2));
    const right = Array.from({length:n}, (_,i) => String((i%7)-3));
    const receipt = circulationSuperpose(n, left, right);
    assert.equal(BigInt(receipt.superposedCirculation),
      BigInt(receipt.leftCirculation) + BigInt(receipt.rightCirculation));
    assert.equal(circulation(wire(receipt.combined)), receipt.superposedCirculation);
  }
  const huge = circulationSuperpose(2,
    ["999999999999999999999999999", "-999999999999999999999999999"],
    ["1", "-1"]);
  assert.equal(huge.superposedCirculation, "0");
  assert.equal(huge.additive, true);
});

test("non-finite, fractional, imprecise, forged and incomplete data cannot mint physics witnesses", () => {
  for (const bad of [NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1,
    "NaN", "Infinity", "1.0", "1e3", "01", "+1", "-0", {}, null]) {
    assert.throws(() => vortexLoop(1, [bad]), { name:/^(TypeError|RangeError)$/ },
      "reject unrepresentable velocity: " + String(bad));
  }
  assert.throws(() => vortexLoop(1, []), /one value/);
  assert.throws(() => vortexLoop(1, new Array(1)), /one value|missing/);
  assert.throws(() => vortexLoop(-1, [1]), RangeError);
  assert.throws(() => vortexLoop(16385, () => 0), RangeError);
  assert.throws(() => vortexLoop(1, ["1".repeat(129)]), RangeError);
  assert.throws(() => circulation({ kind:"relational.fluid.vortex.loop", size:1, velocity:[0.1] }), TypeError);
  assert.throws(() => circulation({kind:"relational.fluid.vortex.loop",size:2,velocity:["1"]}),TypeError);
  assert.throws(() => vortexObstruction({kind:"relational.fluid.vortex.loop",size:1,velocity:[NaN]}), TypeError);
});

test("the bundled demonstration qualifies its GENERAL and UNIT claims separately", () => {
  const witness = fluidVortexCohomologyReceipt();
  assert.equal(circulation(unitVortex()), "1");
  assert.equal(witness.unit.circulation, "1");
  assert.equal(witness.gradientZero.circulation, "0");
  assert.equal(witness.superpose.superposedCirculation, "4");
  assert.deepEqual(witness.unitLeanTheorems, [
    "Obsmetrologia.KineticTheory.Fluid.unitVortex_circulation",
    "Obsmetrologia.KineticTheory.Fluid.unitVortex_not_gradient",
  ]);
  assert.equal(witness.capturedLeanModule,
    "Obsmetrologia.KineticTheory.Fluid.VortexCohomology");
  assert.ok(witness.qualification.includes("no-installed-lean"));
  assert.deepEqual(wire(witness), witness);
});


test("mutating a caller-owned loop after a theorem check cannot falsify its returned witness", () => {
  const original = { kind:"relational.fluid.vortex.loop",size:1,velocity:["1"] };
  const proof = vortexObstruction(original);
  original.velocity[0] = "0";
  original.velocity.push("9007199254740993");
  original.size = 2;
  assert.equal(proof.circulation,"1");
  assert.equal(circulation(proof.loop),"1");
  assert.deepEqual(proof.loop.velocity,["1"]);
  assert.equal(Object.isFrozen(proof.loop),true);
  assert.equal(Object.isFrozen(proof.loop.velocity),true);
  assert.deepEqual(wire(proof).loop,proof.loop);
  assert.throws(()=>vortexObstruction(original),/complete materialized cochain/);

  const supplied = {kind:"relational.fluid.vortex.loop",size:2,velocity:["1","-1"]};
  const closed = gradientCirculationZero(supplied,[0,1,0]);
  supplied.velocity[0] = "100";
  supplied.velocity[1] = "200";
  assert.deepEqual(closed.loop.velocity,["1","-1"]);
  assert.equal(circulation(closed.loop),"0");
  assert.deepEqual(closed.potential,["0","1","0"]);
  assert.deepEqual(wire(closed),closed);
});

test("accessor-backed or sparse readouts cannot switch cochain values during admission", () => {
  let reads = 0;
  const dynamic = ["1"];
  Object.defineProperty(dynamic,"0",{enumerable:true,get(){reads++;return reads%2?"1":"0";}});
  assert.throws(()=>vortexLoop(1,dynamic),/accessor-backed/);
  assert.equal(reads,0,"admission must not invoke a foreign getter");
  const original = {kind:"relational.fluid.vortex.loop",size:1,velocity:["1"]};
  Object.defineProperty(original,"velocity",{get(){reads++;return ["1"];}});
  assert.throws(()=>vortexObstruction(original),/own data fields/);
  assert.equal(reads,0);
  const potential = [0,1,0];
  Object.defineProperty(potential,"1",{get(){reads++;return 1;}});
  assert.throws(()=>gradientCirculationZero(vortexLoop(2,["1","-1"]),potential),/accessor-backed/);
  assert.equal(reads,0);
});
