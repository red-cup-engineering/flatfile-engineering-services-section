import assert from "node:assert/strict";
import test from "node:test";
import {
  closureRegimeNames,
  closureRegimeSchema,
  costlierRegime,
  isClosureRegimeName,
  regimeCost,
  regimeDecidable,
  regimeCohomologyVanishes,
} from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";

const names = ["strict", "scott", "transfinite-bounded", "aperiodic"];

test("closure regimes expose the four frozen names and their schema through the public export", () => {
  assert.deepEqual(closureRegimeNames, names);
  assert.deepEqual(closureRegimeSchema.enum, names);
  assert.ok(Object.isFrozen(closureRegimeNames));
  assert.ok(Object.isFrozen(closureRegimeSchema));
});

test("Scott H1-vanishing does not claim finite-stage decidability", () => {
  for (const [cost, name] of names.entries()) {
    assert.equal(isClosureRegimeName(name), true);
    assert.equal(regimeCost(name), cost);
    assert.equal(regimeDecidable(name), cost === 0, "finite arrival only on strict rung");
    assert.equal(
      regimeCohomologyVanishes(name),
      cost <= 1,
      "Obsmetrologia.Closure.Regime.cohomologyVanishes classification",
    );
  }
  assert.equal(regimeCohomologyVanishes("scott"), true);
  assert.equal(regimeDecidable("scott"), false, "κ=ω is not finite termination");
});

test("costlierRegime returns the higher original stratum for every pair", () => {
  for (const [leftCost, left] of names.entries()) {
    for (const [rightCost, right] of names.entries()) {
      assert.equal(costlierRegime(left, right), names[Math.max(leftCost, rightCost)]);
    }
  }
});

test("closure regime exports refuse names outside the original vocabulary", () => {
  for (const name of [undefined, null, "", "identity", "non-monotone",
    "ordinal.closure.regime.finite", "ordinal.closure.regime.scott", 42]) {
    assert.equal(isClosureRegimeName(name), false);
    assert.throws(() => regimeCost(name), TypeError);
    assert.throws(() => regimeDecidable(name), TypeError);
    assert.throws(() => regimeCohomologyVanishes(name), TypeError);
    assert.throws(() => costlierRegime(name, "strict"), TypeError);
    assert.throws(() => costlierRegime("strict", name), TypeError);
  }
});
