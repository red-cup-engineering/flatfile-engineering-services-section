import assert from "node:assert/strict";
import test from "node:test";
import {
  ofNat, namedLimitRead, regimeOfOrdinal, classifierShadow,
} from "../src/articulation/predicating/positing/settling/analysis/ordinal-closure.mjs";
import {
  omegaOrdinal, omegaMultipleOrdinal,
} from "../src/articulation/predicating/positing/settling/closure.mjs";
import { natOne, successor } from "@red-cup-engineering/exact-number-data-service/exact-number";

test("finite and countably generated limit shapes cannot manufacture an aperiodic ordinal witness", () => {
  const countablyGenerated = [ofNat(0), ofNat(3), omegaOrdinal(), omegaMultipleOrdinal(successor(natOne))];
  for (const ordinal of countablyGenerated) {
    assert.throws(() => regimeOfOrdinal(ordinal, false, false), /cannot witness uncountable cofinality/);
    assert.throws(() => regimeOfOrdinal(ordinal, true, false), /cannot witness uncountable cofinality/);
  }
  const omega = namedLimitRead("omega");
  const twoOmega = namedLimitRead("omegaShift");
  for (const read of [omega, twoOmega]) {
    assert.equal(read.regimeWhenNonScottUncountable.kind, "ordinalClosure.cofinality:obstruction");
    assert.match(read.regimeWhenNonScottUncountable.reason, /do not witness uncountable/);
    assert.equal(read.prefixBelowLimit, true);
    assert.equal(read.isFinite, false);
  }
});

test("ordinal reading refuses malformed names, fake cofinality and unbounded summary fabrication", () => {
  for (const name of ["", "omega-one", "ω1", null, undefined, "aperiodic"]) {
    assert.throws(() => namedLimitRead(name), /omega or omegaShift/);
  }
  for (const length of [-1, 0, 1.5, 65, NaN, Infinity]) {
    assert.throws(() => namedLimitRead("omega", length), /prefixLength/);
  }
  assert.equal(namedLimitRead("omega", 1).ordinal.fundamentalPrefix.length, 1);
  for (const value of [undefined, null, 0, "true"]) {
    assert.throws(() => regimeOfOrdinal(omegaOrdinal(), value, true), /Boolean/);
    assert.throws(() => regimeOfOrdinal(omegaOrdinal(), true, value), /Boolean/);
  }
  assert.throws(() => classifierShadow({
    finiteBase: false, scottContinuous: false, countableCofinality: false,
  }, omegaOrdinal()), /cannot witness uncountable/);
});

test("actual finite closure remains strict independently of address-space cardinality guesses", () => {
  assert.equal(regimeOfOrdinal(ofNat(1), true, true).kind, regimeOfOrdinal(ofNat(1), false, true).kind);
  const receipt = namedLimitRead("omega", 3);
  assert.notEqual(receipt.regimeWhenScott.kind, receipt.regimeWhenNonScottCountable.kind);
  assert.notEqual(receipt.regimeWhenNonScottUncountable.kind, receipt.regimeWhenNonScottCountable.kind);
});
