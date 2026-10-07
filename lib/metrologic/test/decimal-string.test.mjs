import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDecimalStrings, compareDecimalStrings, divideDecimalStrings, multiplyDecimalStrings, negateDecimalString, stripUnitSuffix, truncateDecimalString,
} from "@red-cup-engineering/computer-data-engineering-services-section/number/decimal-string";

test("negateDecimalString: negates a positive value", () => {
  assert.equal(negateDecimalString("1.5"), "-1.5");
});

test("negateDecimalString: negates a negative value back to positive", () => {
  assert.equal(negateDecimalString("-1.5"), "1.5");
});

test("negateDecimalString: zero (in any fractional form) negates to itself, never '-0'", () => {
  assert.equal(negateDecimalString("0"), "0");
  assert.equal(negateDecimalString("0.00"), "0.00");
});

test("compareDecimalStrings: orders by magnitude and sign", () => {
  assert.equal(compareDecimalStrings("1", "2"), -1);
  assert.equal(compareDecimalStrings("2", "1"), 1);
  assert.equal(compareDecimalStrings("1.50", "1.5"), 0);
  assert.equal(compareDecimalStrings("-1", "1"), -1);
});

test("addDecimalStrings: sums at the widest scale present, exactly", () => {
  assert.equal(addDecimalStrings(["142.423", "0.1", "1"]), "143.523");
});

test("addDecimalStrings: handles negative values", () => {
  assert.equal(addDecimalStrings(["5.5", "-2.25"]), "3.25");
});

test("addDecimalStrings: never touches a float boundary case (0.1 + 0.2)", () => {
  assert.equal(addDecimalStrings(["0.1", "0.2"]), "0.3");
});

test("addDecimalStrings: throws on an empty array", () => {
  assert.throws(() => addDecimalStrings([]), RangeError);
});

test("addDecimalStrings: throws on a malformed decimal string", () => {
  assert.throws(() => addDecimalStrings(["1.2.3"]), TypeError);
});

test("addDecimalStrings: accepts a leading-zero-omitted decimal, as Hive-Engine returns", () => {
  assert.equal(addDecimalStrings([".25", "0.10"]), "0.35");
});

test("multiplyDecimalStrings: exact product, truncated to maxDecimals", () => {
  assert.equal(multiplyDecimalStrings("0.08005745", "0.04643451", 10), "0.0037174284");
});

test("multiplyDecimalStrings: truncates rather than rounds", () => {
  // 2 * 0.999 = 1.998; truncated to 1 decimal place is 1.9, never rounded to 2.0
  assert.equal(multiplyDecimalStrings("2", "0.999", 1), "1.9");
});

test("truncateDecimalString: trims trailing zeros after truncation", () => {
  assert.equal(truncateDecimalString("1.230000", 4), "1.23");
});

test("stripUnitSuffix: strips a trailing chain-unit label", () => {
  assert.equal(stripUnitSuffix("142.423 HIVE"), "142.423");
  assert.equal(stripUnitSuffix("1485723.467508 VESTS"), "1485723.467508");
});

test("stripUnitSuffix: passes through a bare decimal unchanged", () => {
  assert.equal(stripUnitSuffix("142.423"), "142.423");
});

test("divideDecimalStrings: exact reciprocal, truncated to maxDecimals", () => {
  assert.equal(divideDecimalStrings("1", "0.1423", 10), "7.0274068868");
});

test("divideDecimalStrings: matches float division within its truncated precision", () => {
  assert.equal(divideDecimalStrings("1", "1.234", 10), "0.8103727714");
  assert.equal(divideDecimalStrings("1", "3.512", 10), "0.284738041");
});

test("divideDecimalStrings: truncates rather than rounds", () => {
  // 1 / 3 = 0.333...; truncated to 3 decimal places is 0.333, never rounded
  assert.equal(divideDecimalStrings("1", "3", 3), "0.333");
});

test("divideDecimalStrings: throws on division by zero", () => {
  assert.throws(() => divideDecimalStrings("1", "0", 10), RangeError);
});

test("divideDecimalStrings: throws on a malformed decimal string", () => {
  assert.throws(() => divideDecimalStrings("1.2.3", "2", 10), TypeError);
});
