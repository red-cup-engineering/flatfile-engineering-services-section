/** @param {bigint} left @param {bigint} right @returns {bigint} The nonnegative greatest common divisor. */
function hostGreatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

/** @param {string | bigint} value A canonical integer carrier. @param {string} label The failing boundary field. @returns {bigint} The parsed integer. */
function hostInteger(value, label) {
  if (typeof value === "string" && !/^-?(?:0|[1-9][0-9]*)$/u.test(value)) throw new TypeError(`${label} must be a canonical integer string`);
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer number`);
  if (typeof value !== "string" && typeof value !== "bigint" && typeof value !== "number") throw new TypeError(`${label} must be a string, bigint, or safe integer`);
  return BigInt(value);
}

/**
 * Constructs the canonical host-wire exact ratio `{ numerator, denominator }` for arbitrary-size integer carriers.
 * @param {string | bigint} numerator The signed numerator.
 * @param {string | bigint} [denominator="1"] The nonzero denominator.
 * @returns {{ readonly numerator: string, readonly denominator: string }} A reduced ratio with a positive denominator.
 */
export function hostRatio(numerator, denominator = "1") {
  let num = hostInteger(numerator, "numerator");
  let den = hostInteger(denominator, "denominator");
  if (den === 0n) throw new RangeError("host ratio: zero denominator");
  if (den < 0n) { num = -num; den = -den; }
  if (num === 0n) return Object.freeze({ numerator: "0", denominator: "1" });
  const divisor = hostGreatestCommonDivisor(num, den);
  return Object.freeze({ numerator: (num / divisor).toString(), denominator: (den / divisor).toString() });
}

/** @param {{ numerator: string, denominator: string }} value A host-wire exact ratio. @returns {{ readonly numerator: string, readonly denominator: string }} Its validated canonical form. */
export function admitHostRatio(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("host ratio must be one object");
  const normalized = hostRatio(value.numerator, value.denominator);
  if (normalized.numerator !== value.numerator || normalized.denominator !== value.denominator) throw new TypeError("host ratio must be reduced with a positive denominator");
  return normalized;
}

/** @param {string | bigint} numerator The nonnegative numerator. @param {string | bigint} [denominator="1"] The positive denominator. @returns {{ readonly numerator: string, readonly denominator: string }} A nonnegative host-wire ratio. */
export function nonnegativeHostRatio(numerator, denominator = "1") {
  const value = hostRatio(numerator, denominator);
  if (value.numerator.startsWith("-")) throw new RangeError("host ratio must be nonnegative");
  return value;
}

/** @param {string | bigint} numerator The positive numerator. @param {string | bigint} [denominator="1"] The positive denominator. @returns {{ readonly numerator: string, readonly denominator: string }} A positive host-wire ratio. */
export function positiveHostRatio(numerator, denominator = "1") {
  const value = nonnegativeHostRatio(numerator, denominator);
  if (value.numerator === "0") throw new RangeError("host ratio must be positive");
  return value;
}

/** @param {{ numerator: string, denominator: string }} left A host-wire exact ratio. @param {{ numerator: string, denominator: string }} right A host-wire exact ratio. @returns {{ readonly numerator: string, readonly denominator: string }} Their exact sum. */
export function addHostRatio(left, right) {
  const a = admitHostRatio(left), b = admitHostRatio(right);
  return hostRatio(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}

/** @param {{ numerator: string, denominator: string }} left A host-wire exact ratio. @param {{ numerator: string, denominator: string }} right A host-wire exact ratio. @returns {{ readonly numerator: string, readonly denominator: string }} Their exact difference. */
export function subtractHostRatio(left, right) {
  const a = admitHostRatio(left), b = admitHostRatio(right);
  return hostRatio(BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}

/** @param {{ numerator: string, denominator: string }} left A host-wire exact ratio. @param {{ numerator: string, denominator: string }} right A host-wire exact ratio. @returns {-1 | 0 | 1} Their exact total ordering. */
export function compareHostRatio(left, right) {
  const a = admitHostRatio(left), b = admitHostRatio(right);
  const difference = BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
