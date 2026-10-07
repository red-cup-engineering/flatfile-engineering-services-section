/**
 * models/plasma/quasineutrality - finite Debye relaxation.
 *
 * This captures `Obsmetrologia.Relational.Plasma.Quasineutrality`:
 * net charge, quasineutrality, imbalance as a Lyapunov, one-step screening,
 * fixed-point equilibrium, and finite relaxation to neutrality.
 */

export function netCharge(cell) {
  return cell.reduce((total, charge) => total + charge, 0);
}

export function quasineutral(cell) {
  return netCharge(cell) === 0;
}

export function imbalance(cell) {
  return Math.abs(netCharge(cell));
}

export function screen(cell) {
  const charge = netCharge(cell);
  if (charge > 0) return Object.freeze([-1, ...cell]);
  if (charge < 0) return Object.freeze([1, ...cell]);
  return Object.freeze([...cell]);
}

export function imbalanceScreen(cell) {
  const after = screen(cell);
  const beforeImbalance = imbalance(cell);
  const afterImbalance = imbalance(after);
  if (afterImbalance > beforeImbalance) throw new TypeError("imbalanceScreen: screening increased imbalance");
  const charged = !quasineutral(cell);
  if (charged && !(afterImbalance < beforeImbalance)) throw new TypeError("imbalanceScreen: charged cell did not strictly descend");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.imbalance_screen:witness",
    before: Object.freeze([...cell]),
    after,
    beforeImbalance,
    afterImbalance,
    nonIncreasing: true,
    strictlyDecreasing: charged,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.imbalance_screen_le",
      "Obsmetrologia.Relational.Plasma.imbalance_screen_lt",
    ]),
  });
}

export function quasineutralIffScreenFixed(cell) {
  const screened = screen(cell);
  const fixed = screened.length === cell.length && screened.every((charge, index) => charge === cell[index]);
  if (quasineutral(cell) !== fixed) throw new TypeError("quasineutralIffScreenFixed: fixed-point equivalence failed");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.fixed:witness",
    cell: Object.freeze([...cell]),
    quasineutral: quasineutral(cell),
    screenFixed: fixed,
    equivalent: true,
    leanTheorem: "Obsmetrologia.Relational.Plasma.quasineutral_iff_screen_fixed",
  });
}

export function relax(steps, cell) {
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError("relax: expected a natural number of steps");
  let current = Object.freeze([...cell]);
  for (let index = 0; index < steps; index += 1) current = screen(current);
  return current;
}

export function relaxNeutral(cell, steps = imbalance(cell)) {
  if (steps < imbalance(cell)) throw new TypeError("relaxNeutral: steps must cover the initial imbalance");
  const relaxed = relax(steps, cell);
  if (!quasineutral(relaxed)) throw new TypeError("relaxNeutral: relaxation did not reach neutrality");
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.relax_neutral:witness",
    initial: Object.freeze([...cell]),
    steps,
    relaxed,
    quasineutral: true,
    leanTheorem: "Obsmetrologia.Relational.Plasma.relax_neutral",
  });
}

export function plasmaQuasineutralityReceipt() {
  return Object.freeze({
    kind: "relational.plasma.quasineutrality.receipt:witness",
    descent: imbalanceScreen([1, 1, -1]),
    fixed: quasineutralIffScreenFixed([1, -1]),
    relaxed: relaxNeutral([1, 1, -1]),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.Quasineutrality",
  });
}
