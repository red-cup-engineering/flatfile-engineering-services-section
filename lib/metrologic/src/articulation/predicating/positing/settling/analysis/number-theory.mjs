/**
 * analysis/number-theory - finite executable shadows of RelMath.Order number theory.
 *
 * Lean proves factorial/Pascal/binomial, divisibility/gcd/prime, FTA, and
 * image factorization. This module keeps the Node side finite and carrier
 * shaped: concrete Nat computations and finite function tables become
 * witness/obstruction receipts without pretending to reify arbitrary functions
 * or proof terms at runtime.
 */
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name}: expected a non-negative safe integer`);
    }
};
function safeAdd(left, right, label) {
    const value = left + right;
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${label}: result exceeds safe integer range`);
    return value;
}
function safeMultiply(left, right, label) {
    const value = left * right;
    if (!Number.isSafeInteger(value))
        throw new RangeError(`${label}: result exceeds safe integer range`);
    return value;
}
function safePow(base, exponent, label) {
    assertNat(`${label} base`, base);
    assertNat(`${label} exponent`, exponent);
    let value = 1;
    for (let index = 0; index < exponent; index += 1) {
        value = safeMultiply(value, base, label);
    }
    return value;
}
/** `n!`, matching `RelMath.NumberTheory.factorial`. */
export function factorial(n) {
    assertNat("factorial n", n);
    let value = 1;
    for (let factor = 2; factor <= n; factor += 1)
        value = safeMultiply(value, factor, "factorial");
    return value;
}
/** The falling-product permutation count `P(n,k)`. */
export function permutationCount(n, k) {
    assertNat("permutationCount n", n);
    assertNat("permutationCount k", k);
    let value = 1;
    for (let index = 0; index < k; index += 1) {
        value = safeMultiply(value, Math.max(n - index, 0), "permutationCount");
    }
    return value;
}
/** `C(n,k)`, computed by Pascal's recurrence with over-choosing equal to zero. */
export function choose(n, k) {
    assertNat("choose n", n);
    assertNat("choose k", k);
    if (k > n)
        return 0;
    const width = k + 1;
    const row = Array.from({ length: width }, () => 0);
    row[0] = 1;
    for (let i = 1; i <= n; i += 1) {
        const top = Math.min(i, k);
        for (let j = top; j >= 1; j -= 1)
            row[j] = safeAdd(row[j] ?? 0, row[j - 1] ?? 0, "choose");
    }
    return row[k] ?? 0;
}
/** Carrier receipt for `choose n 0 = 1`, `choose n n = 1`, and Pascal recurrence. */
export function pascal(n, k) {
    assertNat("pascal n", n);
    assertNat("pascal k", k);
    const chooseZero = choose(n, 0);
    const chooseSelf = choose(n, n);
    const left = choose(n + 1, k + 1);
    const right = safeAdd(choose(n, k), choose(n, k + 1), "pascal");
    if (chooseZero === 1 && chooseSelf === 1 && left === right) {
        return Object.freeze({
            kind: "numberTheory.pascal:witness",
            n,
            k,
            chooseZero: 1,
            chooseSelf: 1,
            left,
            right,
            holds: true,
        });
    }
    return Object.freeze({
        kind: "numberTheory.pascal-obstruction",
        n,
        k,
        chooseZero,
        chooseSelf,
        left,
        right,
        holds: false,
    });
}
/** Finite Nat-semiring receipt for `(x+y)^n = Σ C(n,k)x^k y^(n-k)`. */
export function binomial(x, y, n) {
    assertNat("binomial x", x);
    assertNat("binomial y", y);
    assertNat("binomial n", n);
    const lhs = safePow(safeAdd(x, y, "binomial base"), n, "binomial lhs");
    const terms = Array.from({ length: n + 1 }, (_, k) => {
        const coeff = choose(n, k);
        const xPow = safePow(x, k, "binomial x");
        const yPow = safePow(y, n - k, "binomial y");
        return safeMultiply(coeff, safeMultiply(xPow, yPow, "binomial term"), "binomial term");
    });
    const rhs = terms.reduce((sum, term) => safeAdd(sum, term, "binomial sum"), 0);
    if (lhs === rhs)
        return Object.freeze({ kind: "numberTheory.binomial:witness", x, y, n, lhs, rhs, terms, holds: true });
    return Object.freeze({ kind: "numberTheory.binomial-obstruction", x, y, n, lhs, rhs, terms, holds: false });
}
/** The finite witness for `a ∣ b := ∃ c, b = a*c`. */
export function divides(divisor, dividend) {
    assertNat("divides divisor", divisor);
    assertNat("divides dividend", dividend);
    if (divisor === 0) {
        if (dividend === 0)
            return Object.freeze({ kind: "numberTheory.divides:witness", divisor, dividend, quotient: 0, product: 0, divides: true });
        return Object.freeze({ kind: "numberTheory.divides-obstruction", divisor, dividend, divides: false });
    }
    if (dividend % divisor === 0) {
        const quotient = dividend / divisor;
        return Object.freeze({ kind: "numberTheory.divides:witness", divisor, dividend, quotient, product: dividend, divides: true });
    }
    return Object.freeze({ kind: "numberTheory.divides-obstruction", divisor, dividend, divides: false });
}
/** Euclid's algorithm. */
export function gcd(a, b) {
    assertNat("gcd a", a);
    assertNat("gcd b", b);
    let left = a;
    let right = b;
    while (right !== 0) {
        const next = left % right;
        left = right;
        right = next;
    }
    return left;
}
/** Receipt for gcd dividing both arguments, greatestness for `d`, and Euclid recurrence. */
export function gcdMeet(a, b, d = 1) {
    assertNat("gcdMeet d", d);
    const value = gcd(a, b);
    const gcdDividesA = divides(value, a).divides;
    const gcdDividesB = divides(value, b).divides;
    const dDividesA = divides(d, a).divides;
    const dDividesB = divides(d, b).divides;
    const dDividesGcd = divides(d, value).divides;
    const greatestPremiseHolds = dDividesA && dDividesB;
    const recurrence = b === 0 ? true : gcd(b, a) === gcd(a % b, b);
    const holds = gcdDividesA && gcdDividesB && (!greatestPremiseHolds || dDividesGcd) && recurrence;
    if (holds) {
        return Object.freeze({
            kind: "numberTheory.gcdMeet:witness",
            a,
            b,
            d,
            gcd: value,
            gcdDividesA: true,
            gcdDividesB: true,
            dDividesA,
            dDividesB,
            dDividesGcd,
            greatestPremiseHolds,
            recurrence,
            holds: true,
        });
    }
    return Object.freeze({
        kind: "numberTheory.gcdMeet-obstruction",
        a,
        b,
        d,
        gcd: value,
        gcdDividesA,
        gcdDividesB,
        dDividesA,
        dDividesB,
        dDividesGcd,
        greatestPremiseHolds,
        recurrence,
        holds: false,
    });
}
/** Trial-division primality predicate for finite Nat receipts. */
export function isPrime(n) {
    assertNat("isPrime n", n);
    if (n < 2)
        return false;
    for (let divisor = 2; divisor * divisor <= n; divisor += 1) {
        if (n % divisor === 0)
            return false;
    }
    return true;
}
/** Finite witness for Euclid's lemma: prime `p` dividing `a*b` divides `a` or `b`. */
export function euclidLemma(p, a, b) {
    assertNat("euclidLemma a", a);
    assertNat("euclidLemma b", b);
    const product = safeMultiply(a, b, "euclidLemma product");
    const prime = isPrime(p);
    const premiseHolds = divides(p, product).divides;
    const dividesLeft = divides(p, a).divides;
    const dividesRight = divides(p, b).divides;
    const conclusionHolds = dividesLeft || dividesRight;
    if (prime && premiseHolds && conclusionHolds) {
        return Object.freeze({ kind: "numberTheory.euclidLemma:witness", p, a, b, product, prime: true, premiseHolds: true, dividesLeft, dividesRight, conclusionHolds: true });
    }
    return Object.freeze({
        kind: "numberTheory.euclidLemma-obstruction",
        reason: !prime ? "prime" : !premiseHolds ? "premise" : "conclusion",
        p,
        a,
        b,
        product,
        prime,
        premiseHolds,
        dividesLeft,
        dividesRight,
        conclusionHolds,
    });
}
/** Prime factors of `n`, with multiplicity, in nondecreasing order. */
export function primeFactors(n) {
    assertNat("primeFactors n", n);
    let rest = n;
    const factors = [];
    for (let divisor = 2; divisor * divisor <= rest; divisor += 1) {
        while (rest % divisor === 0) {
            factors.push(divisor);
            rest /= divisor;
        }
    }
    if (rest > 1)
        factors.push(rest);
    return Object.freeze(factors);
}
/** Existence half of FTA, computed for `n >= 2`. */
export function primeFactorization(n) {
    const factors = primeFactors(n);
    const product = factors.reduce((value, factor) => safeMultiply(value, factor, "primeFactorization product"), 1);
    const allPrime = factors.every(isPrime);
    const admissible = n >= 2;
    if (admissible && product === n && allPrime) {
        return Object.freeze({ kind: "numberTheory.primeFactorization:witness", n, factors, product, allPrime: true, admissible: true });
    }
    return Object.freeze({
        kind: "numberTheory.primeFactorization-obstruction",
        reason: !admissible ? "domain" : product !== n ? "product" : "prime",
        n,
        factors,
        product,
        allPrime,
        admissible,
    });
}
const productOf = (values, label) => values.reduce((product, value) => {
    assertNat(`${label} factor`, value);
    return safeMultiply(product, value, label);
}, 1);
/** Uniqueness half of FTA: two prime factorizations of `n` are permutations. */
export function primeFactorizationUnique(n, left, right) {
    assertNat("primeFactorizationUnique n", n);
    const frozenLeft = Object.freeze([...left]);
    const frozenRight = Object.freeze([...right]);
    const leftProduct = productOf(frozenLeft, "primeFactorizationUnique left");
    const rightProduct = productOf(frozenRight, "primeFactorizationUnique right");
    const leftAllPrime = frozenLeft.every(isPrime);
    const rightAllPrime = frozenRight.every(isPrime);
    const permutation = JSON.stringify([...frozenLeft].sort((a, b) => a - b)) === JSON.stringify([...frozenRight].sort((a, b) => a - b));
    if (leftProduct === n && rightProduct === n && leftAllPrime && rightAllPrime && permutation) {
        return Object.freeze({
            kind: "numberTheory.primeFactorizationUnique:witness",
            n,
            left: frozenLeft,
            right: frozenRight,
            leftProduct,
            rightProduct,
            leftAllPrime: true,
            rightAllPrime: true,
            permutation: true,
        });
    }
    return Object.freeze({
        kind: "numberTheory.primeFactorizationUnique-obstruction",
        reason: leftProduct !== n ? "left-product" : rightProduct !== n ? "right-product" : !leftAllPrime ? "left-prime" : !rightAllPrime ? "right-prime" : "permutation",
        n,
        left: frozenLeft,
        right: frozenRight,
        leftProduct,
        rightProduct,
        leftAllPrime,
        rightAllPrime,
        permutation,
    });
}
/** Finite table form of image/epi-mono factorization for a total map `A -> B`. */
export function imageFactorization(outputs) {
    const frozenOutputs = Object.freeze([...outputs]);
    const image = [];
    const corestriction = frozenOutputs.map((output) => {
        const existing = image.findIndex((value) => Object.is(value, output));
        if (existing >= 0)
            return existing;
        image.push(output);
        return image.length - 1;
    });
    const frozenImage = Object.freeze(image);
    const frozenCorestriction = Object.freeze(corestriction);
    const reconstructed = Object.freeze(frozenCorestriction.map((index) => frozenImage[index]));
    const surjectiveCorestriction = frozenImage.every((_, index) => frozenCorestriction.includes(index));
    const injectiveInclusion = new Set(frozenImage).size === frozenImage.length;
    const factors = frozenOutputs.length === reconstructed.length && frozenOutputs.every((output, index) => Object.is(output, reconstructed[index]));
    if (surjectiveCorestriction && injectiveInclusion && factors) {
        return Object.freeze({
            kind: "numberTheory.imageFactorization:witness",
            outputs: frozenOutputs,
            image: frozenImage,
            corestriction: frozenCorestriction,
            reconstructed,
            surjectiveCorestriction: true,
            injectiveInclusion: true,
            factors: true,
        });
    }
    return Object.freeze({
        kind: "numberTheory.imageFactorization-obstruction",
        outputs: frozenOutputs,
        image: frozenImage,
        corestriction: frozenCorestriction,
        reconstructed,
        surjectiveCorestriction,
        injectiveInclusion,
        factors,
    });
}
export function numberTheoryCombinatoricsReceipt() {
    const pascalReceipt = pascal(5, 2);
    const binomialReceipt = binomial(2, 3, 4);
    const meet = gcdMeet(84, 126, 14);
    const euclid = euclidLemma(7, 10, 21);
    if (pascalReceipt.kind !== "numberTheory.pascal:witness"
        || binomialReceipt.kind !== "numberTheory.binomial:witness"
        || meet.kind !== "numberTheory.gcdMeet:witness"
        || euclid.kind !== "numberTheory.euclidLemma:witness") {
        throw new TypeError("numberTheoryCombinatoricsReceipt: finite arithmetic laws failed");
    }
    return Object.freeze({
        kind: "numberTheory.combinatorics:witness",
        sourceModule: "RelMath.Order.NumberTheoryCombinatorics",
        theorems: Object.freeze([
            "RelMath.NumberTheory.factorial_zero",
            "RelMath.NumberTheory.factorial_succ",
            "RelMath.NumberTheory.factorial_pos",
            "RelMath.NumberTheory.perm_zero",
            "RelMath.NumberTheory.perm_succ",
            "RelMath.NumberTheory.choose_zero_right",
            "RelMath.NumberTheory.choose_zero_succ",
            "RelMath.NumberTheory.choose_succ_succ",
            "RelMath.NumberTheory.choose_eq_zero_of_lt",
            "RelMath.NumberTheory.choose_self",
            "RelMath.NumberTheory.pascal_and_binomial_theorem",
            "RelMath.NumberTheory.gcd_prime_theory",
        ]),
        factorialZero: factorial(0),
        factorialSucc: (factorial(5) === 5 * factorial(4)),
        factorialPositive: [0, 1, 2, 3, 4, 5].every((n) => factorial(n) > 0),
        permutationStep: (permutationCount(5, 3) === (5 - 2) * permutationCount(5, 2)),
        pascal: pascalReceipt,
        binomial: binomialReceipt,
        gcdPrime: Object.freeze({ meet, euclid }),
    });
}
