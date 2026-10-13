import { test } from "node:test";
import assert from "node:assert/strict";
import {
    step, settle, orbit, mark0, box, pastSum, indicator, receipt, actionReceipt,
} from "../src/articulation/predicating/positing/settling/analysis/chromatic-lorentzian.mjs";

test("closed-form finite orbit agrees with every repeated-step Boolean orbit of width <= 8", () => {
    for (let width = 0; width <= 8; width++) {
        for (let bits = 0; bits < 2 ** width; bits++) {
            const marking = Array.from({ length: width }, (_, i) => Boolean(bits & (1 << i)));
            let repeated = marking;
            for (let count = 0; count <= width + 3; count++) {
                const actual = orbit(marking, count);
                assert.deepEqual(actual, repeated, `width=${width}, bits=${bits}, count=${count}`);
                if (count > 0) assert.ok(Object.isFrozen(actual));
                repeated = step(repeated);
            }
            assert.deepEqual(orbit(marking, Number.MAX_SAFE_INTEGER), settle(marking));
        }
    }
});

test("million-step propagation no longer performs a million repeated allocations", () => {
    const seed = mark0(12_000);
    const propagated = orbit(seed, 1_000_000);
    assert.equal(propagated.length, seed.length);
    assert.equal(propagated.every(Boolean), true);
    assert.deepEqual(orbit([false, true, false, true], 1), [false, true, true, true]);
    assert.deepEqual(orbit([false, true, false, false], 1), [false, true, true, false]);
});

test("orbit preserves the count-zero identity but validates the input even at zero", () => {
    const marking = [false, true];
    assert.equal(orbit(marking, 0), marking);
    assert.throws(() => orbit([false, 1], 0), /boolean marking/);
    for (const count of [-1, 1.5, Infinity, NaN]) {
        assert.throws(() => orbit(marking, count), /natural number/);
    }
});

test("backward difference and past sum remain inverse on exact safe fields", () => {
    const fields = [[], [0], [3, -2, 5, 1], [-5, 1, 1, -2], [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 7]];
    for (const field of fields) {
        assert.deepEqual(box(pastSum(field)), field);
        assert.deepEqual(pastSum(box(field)), field);
    }
    assert.deepEqual(pastSum(indicator([true, false, true])), [1, 1, 2]);
});

test("integer fields fail closed instead of silently losing exactness on overflow", () => {
    const max = Number.MAX_SAFE_INTEGER;
    assert.throws(() => pastSum([max, 1]), /safe integer range/);
    assert.throws(() => pastSum([-max, -1]), /safe integer range/);
    assert.throws(() => box([max, -max]), /safe integer range/);
    assert.throws(() => box([-max, max]), /safe integer range/);
    assert.throws(() => pastSum([1.25]), /safe integer/);
    assert.throws(() => box([Infinity]), /safe integer/);
});

test("finite fixed-point and chain-action demonstrations still execute", () => {
    assert.equal(receipt().settleOrbitConstant, true);
    assert.equal(actionReceipt().boxPastSum, true);
});
