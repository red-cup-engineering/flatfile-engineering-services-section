/**
 * models/kinetic-theory/boltzmann-entropy - finite real-valued Boltzmann H surface.
 *
 * This captures `Obsmetrologia.Relational.Thermo.BoltzmannEntropy`: cell
 * contributions `log(n!)`, configuration H as their sum, equilibrating exchanges
 * that do not increase H, and monotone relaxation chains.
 */

const EPSILON = 1e-10;

const assertNat = (value, caller) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeConfig(config, caller) {
  return Object.freeze(config.map((value) => assertNat(value, caller)));
}

function sameNatMultiset(left, right) {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function closeEnough(left, right) {
  return Math.abs(left - right) <= EPSILON;
}

export function fact(n) {
  const admitted = assertNat(n, "fact");
  let result = 1n;
  for (let k = 2n; k <= BigInt(admitted); k += 1n) result *= k;
  return result;
}

export function logNat(base, n) {
  if (!Number.isSafeInteger(base) || base < 2) throw new RangeError("logNat: base must be a safe integer at least two");
  const asNumber = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(asNumber) || asNumber < 1) throw new RangeError("logNat: argument must be positive and finite");
  return Math.log(asNumber) / Math.log(base);
}

export function cellH(n) {
  const admitted = assertNat(n, "cellH");
  let total = 0;
  for (let k = 2; k <= admitted; k += 1) total += logNat(2, k);
  return total;
}

export function cellHSucc(n) {
  const admitted = assertNat(n, "cellHSucc");
  const lhs = cellH(admitted + 1);
  const increment = logNat(2, admitted + 1);
  const previous = cellH(admitted);
  if (!closeEnough(lhs, increment + previous)) throw new TypeError("cellHSucc: log factorial additive law failed");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.cellH_succ:witness",
    n: admitted,
    cellHSucc: lhs,
    logIncrement: increment,
    previous,
    additive: true,
    leanTheorem: "Obsmetrologia.Relational.Thermo.cellH_succ",
  });
}

export function configH(config) {
  return normalizeConfig(config, "configH").reduce((total, occupation) => total + cellH(occupation), 0);
}

/**
 * The Boltzmann readout of one occupation list: its cells, total objects, the
 * configuration H (sum of log2 n!) and the entropy in bits, log2 of the number
 * of microstates N!/prod n! that realize the occupation.
 */
export function occupationEntropy(occupation) {
  if (!Array.isArray(occupation) || occupation.length === 0) throw new TypeError("occupation must be a non-empty array of non-negative safe integers");
  const config = normalizeConfig(occupation, "occupationEntropy");
  const totalObjects = config.reduce((total, n) => total + n, 0);
  const h = configH(config);
  return Object.freeze({ cells: config.length, totalObjects, configH: h, entropyBits: cellH(totalObjects) - h });
}

export function configHPerm(left, right) {
  const admittedLeft = normalizeConfig(left, "configHPerm");
  const admittedRight = normalizeConfig(right, "configHPerm");
  if (!sameNatMultiset(admittedLeft, admittedRight)) throw new TypeError("configHPerm: configurations are not permutations");
  const leftH = configH(admittedLeft);
  const rightH = configH(admittedRight);
  if (!closeEnough(leftH, rightH)) throw new TypeError("configHPerm: permuted configurations have different H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.configH_perm:witness",
    left: admittedLeft,
    right: admittedRight,
    h: leftH,
    permutationInvariant: true,
    leanTheorem: "Obsmetrologia.Relational.Thermo.configH_perm",
  });
}

export function equilibratingExchange(a, b, rest = []) {
  const admittedA = assertNat(a, "equilibratingExchange");
  const admittedB = assertNat(b, "equilibratingExchange");
  if (admittedB > admittedA) throw new TypeError("equilibratingExchange: expected b <= a");
  const admittedRest = normalizeConfig(rest, "equilibratingExchange");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.exchange:witness",
    a: admittedA,
    b: admittedB,
    rest: admittedRest,
    before: Object.freeze([admittedA + 1, admittedB, ...admittedRest]),
    after: Object.freeze([admittedA, admittedB + 1, ...admittedRest]),
    smoothing: true,
    leanDefinition: "Obsmetrologia.Relational.Thermo.Exchange",
  });
}

export function htheoremPair(a, b) {
  const exchange = equilibratingExchange(a, b);
  const beforeH = configH(exchange.before);
  const afterH = configH(exchange.after);
  if (afterH > beforeH + EPSILON) throw new TypeError("htheoremPair: smoothing exchange increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem_pair:witness",
    a: exchange.a,
    b: exchange.b,
    beforeH,
    afterH,
    nonIncreasing: true,
    entropyIncrement: beforeH - afterH,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_pair",
  });
}

export function htheorem(exchange) {
  const beforeH = configH(exchange.before);
  const afterH = configH(exchange.after);
  if (afterH > beforeH + EPSILON) throw new TypeError("htheorem: exchange increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem:witness",
    exchange,
    beforeH,
    afterH,
    nonIncreasing: true,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem",
  });
}

export function htheoremEvolution(initial, exchanges) {
  let current = normalizeConfig(initial, "htheoremEvolution");
  const steps = [];
  for (const exchange of exchanges) {
    if (!sameNatMultiset(current, exchange.before)) {
      throw new TypeError("htheoremEvolution: exchange does not start at the current configuration");
    }
    const witness = htheorem(exchange);
    steps.push(witness);
    current = exchange.after;
  }
  const initialH = configH(initial);
  const finalH = configH(current);
  if (finalH > initialH + EPSILON) throw new TypeError("htheoremEvolution: relaxation increased H");
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.htheorem_evolution:witness",
    initial: normalizeConfig(initial, "htheoremEvolution"),
    final: current,
    steps: Object.freeze(steps),
    initialH,
    finalH,
    nonIncreasing: true,
    leanTheorem: "Obsmetrologia.Relational.Thermo.htheorem_evolution",
  });
}

export function boltzmannEntropyReceipt() {
  const exchange = equilibratingExchange(4, 1, [2]);
  return Object.freeze({
    kind: "relational.thermo.boltzmannEntropy.receipt:witness",
    cellHSucc: cellHSucc(4),
    pair: htheoremPair(4, 1),
    configPerm: configHPerm([5, 1, 2], [2, 5, 1]),
    exchange: htheorem(exchange),
    evolution: htheoremEvolution(exchange.before, [
      exchange,
      equilibratingExchange(3, 2, [2]),
    ]),
    finiteRealValuedModel: true,
    capturedLeanModule: "Obsmetrologia.Relational.Thermo.BoltzmannEntropy",
  });
}
