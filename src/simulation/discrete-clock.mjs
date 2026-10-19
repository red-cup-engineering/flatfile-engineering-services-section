/**
 * Pure discrete clock arithmetic for state machines. Wall clocks and persistence
 * are supplied by callers; no domain, economy or network policy lives here.
 */
export const MILLISECONDS_PER_SECOND = 1000;

export function boundedNatural(value, label = 'value', maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(maximum) || maximum < 0 ||
      !Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${label} must be an integer between 0 and ${maximum}`);
  }
  return value;
}

/**
 * Quantize a monotone observed interval into whole ticks, with a caller-selected
 * offline cap. Preserve fractional ticks when the interval is within the cap;
 * discard the excess history when the cap is exceeded, rather than repeatedly
 * paying out the same capped past on later observations.
 */
export function elapsedTicks(fromMs, toMs, { tickMs = MILLISECONDS_PER_SECOND,
  maxElapsedMs = Number.MAX_SAFE_INTEGER } = {}) {
  boundedNatural(fromMs, 'fromMs');
  boundedNatural(toMs, 'toMs');
  boundedNatural(tickMs, 'tickMs');
  boundedNatural(maxElapsedMs, 'maxElapsedMs');
  if (tickMs === 0 || maxElapsedMs < tickMs) {
    throw new RangeError('tickMs must be positive and at most maxElapsedMs');
  }
  const available = Math.max(0, toMs - fromMs);
  const capped = Math.min(available, maxElapsedMs);
  const ticks = Math.floor(capped / tickMs);
  const accountedMs = ticks * tickMs;
  const cappedOut = available > maxElapsedMs;
  return Object.freeze({
    ticks,
    accountedMs,
    nextMs: cappedOut ? toMs : fromMs + accountedMs,
    discardedMs: cappedOut ? available - accountedMs : 0,
  });
}
