/**
 * analysis/aperiodic-autocorrelation - finite Patterson autocorrelation.
 *
 * Executable carrier for `RelMath.Aperiodic.FiniteAutocorrelation`: Boolean
 * occupation patterns on a finite cyclic group, pair-difference counts, and
 * homometry as equality of those finite autocorrelation vectors. This is not a
 * diffraction measure; it is the finite combinatorial shadow before Fourier
 * analysis.
 */
const requirePattern = (pattern) => {
    if (pattern.length === 0)
        throw new RangeError("autocorr: pattern must be nonempty");
    for (const [index, value] of pattern.entries()) {
        if (typeof value !== "boolean")
            throw new TypeError(`autocorr pattern[${index}]: expected boolean`);
    }
};
/** Pair-difference count at cyclic displacement `displacement`. */
export function autocorr(pattern, displacement) {
    requirePattern(pattern);
    if (!Number.isSafeInteger(displacement))
        throw new RangeError("autocorr displacement: expected a safe integer");
    const length = pattern.length;
    const d = ((displacement % length) + length) % length;
    let count = 0;
    for (let site = 0; site < length; site += 1) {
        if (pattern[site] === true && pattern[(site + d) % length] === true)
            count += 1;
    }
    return count;
}
export function autocorrelation(pattern) {
    requirePattern(pattern);
    return Object.freeze(pattern.map((_value, displacement) => autocorr(pattern, displacement)));
}
export function homometric(left, right) {
    if (left.length !== right.length)
        return false;
    const leftAuto = autocorrelation(left);
    const rightAuto = autocorrelation(right);
    return leftAuto.every((value, index) => value === rightAuto[index]);
}
function cyclicShift(pattern, offset) {
    requirePattern(pattern);
    return Object.freeze(pattern.map((_value, index) => pattern[(index - offset + pattern.length) % pattern.length]));
}
/** Finite carrier for `RelMath.Aperiodic.FiniteAutocorrelation`. */
export function receipt() {
    const pattern = Object.freeze([true, true, false, false, true]);
    const shifted = cyclicShift(pattern, 2);
    const auto = autocorrelation(pattern);
    const shiftedAuto = autocorrelation(shifted);
    const boundedBySiteCount = auto.every((value) => value <= pattern.length)
        && shiftedAuto.every((value) => value <= shifted.length);
    const homometricRefl = homometric(pattern, pattern);
    const homometricSymm = homometric(pattern, shifted) === homometric(shifted, pattern);
    const homometricTrans = homometric(pattern, shifted) && homometric(shifted, pattern) && homometric(pattern, pattern);
    if (!boundedBySiteCount || !homometricRefl || !homometricSymm || !homometricTrans) {
        throw new TypeError("aperiodic.autocorrelation.receipt: finite homometry laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.autocorrelation.receipt:witness",
        sourceModule: "RelMath.Aperiodic.FiniteAutocorrelation",
        theorems: Object.freeze([
            "RelMath.Aperiodic.autocorr",
            "RelMath.Aperiodic.autocorr_le",
            "RelMath.Aperiodic.Homometric",
            "RelMath.Aperiodic.Homometric.refl",
            "RelMath.Aperiodic.Homometric.symm",
            "RelMath.Aperiodic.Homometric.trans",
        ]),
        pattern,
        shifted,
        autocorrelation: auto,
        shiftedAutocorrelation: shiftedAuto,
        boundedBySiteCount: true,
        homometricRefl: true,
        homometricSymm: true,
        homometricTrans: true,
        boundary: "finite pair-correlation only; no Fourier transform or diffraction measure",
    });
}
