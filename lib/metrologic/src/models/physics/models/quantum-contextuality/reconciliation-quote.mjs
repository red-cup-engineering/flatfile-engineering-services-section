/**
 * Exact reconciliation quotations for finite Boolean parity models whose
 * contexts are pairs of distinct measurements.
 *
 * A target cochain is not priced in isolation.  A Boolean reference section
 * contributes a coboundary, so the executable search ranges over the entire
 * coset `[target] + B¹`.  For every representative it computes both prices
 * carried by CohomologicalContextuality:
 *
 * - the minimum vertex-cover weight of its frustrated contexts, where a
 *   degree-one measurement is free because it cannot mint merged `⊤`; and
 * - the counting energy, one lossless incidence per frustrated context.
 *
 * The result is deliberately scoped to the hypotheses of
 * `Obsmetrologia.QuantumContextuality.merged_support_norm` and
 * `record_merge_ground_state`.  Translating arbitrary FOUR-valued claim
 * covers into this domain is a separate, proof-bearing responsibility.
 */

export const parityReconciliationProofBasis = Object.freeze([
  "Obsmetrologia.QuantumContextuality.merged_support_norm",
  "Obsmetrologia.QuantumContextuality.record_merge_ground_state",
  "Obsmetrologia.QuantumContextuality.topCount_le_massSum",
  "Obsmetrologia.QuantumContextuality.two_spread_ledger",
]);

const MAX_COMPONENT_EXACT_SEARCH_WORK = 8_388_608;
const DEFAULT_MENU_LIMIT = 12;
const MAX_MENU_LIMIT = 64;

function xor(left, right) {
  return left !== right;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function obstruction(...obstructions) {
  return Object.freeze({
    kind: "relational.quantum.parity-reconciliation-quote:obstruction",
    scope: "finite-boolean-pair-context",
    obstructions: Object.freeze([...obstructions]),
    proofBasis: parityReconciliationProofBasis,
  });
}

function normalizeRequest(request) {
  const issues = [];
  const measurements = [...new Set(request.measurements.map((measurement) => measurement.trim()))].sort(compareText);
  if (measurements.length !== request.measurements.length) issues.push("measurements must be unique after trimming");
  if (measurements.some((measurement) => measurement.length === 0)) issues.push("measurement names must be nonempty");
  if (measurements.length === 0) issues.push("at least one measurement is required");
  const known = new Set(measurements);
  const ids = new Set();
  const pairs = new Set();
  const contexts = [];
  for (const context of request.contexts) {
    const id = context.id.trim();
    const left = context.left.trim();
    const right = context.right.trim();
    if (id.length === 0) issues.push("context ids must be nonempty");
    if (ids.has(id)) issues.push(`duplicate context id: ${id}`);
    ids.add(id);
    if (!known.has(left)) issues.push(`context ${id || "(unnamed)"} has unknown measurement: ${left}`);
    if (!known.has(right)) issues.push(`context ${id || "(unnamed)"} has unknown measurement: ${right}`);
    if (left === right) issues.push(`context ${id || "(unnamed)"} must contain two distinct measurements`);
    const [first, second] = compareText(left, right) <= 0 ? [left, right] : [right, left];
    const pair = `${first}\0${second}`;
    if (pairs.has(pair)) issues.push(`duplicate pair context: ${first}, ${second}`);
    pairs.add(pair);
    contexts.push(Object.freeze({ id, left: first, right: second, target: context.target }));
  }
  if (contexts.length === 0) issues.push("at least one pair context is required");
  if (issues.length > 0) return obstruction(...new Set(issues));
  contexts.sort((left, right) => compareText(left.id, right.id));

  const degree = new Map(measurements.map((measurement) => [measurement, 0]));
  const adjacent = new Map(measurements.map((measurement) => [measurement, new Set()]));
  for (const context of contexts) {
    degree.set(context.left, (degree.get(context.left) ?? 0) + 1);
    degree.set(context.right, (degree.get(context.right) ?? 0) + 1);
    adjacent.get(context.left)?.add(context.right);
    adjacent.get(context.right)?.add(context.left);
  }
  const unseen = new Set(measurements);
  const components = [];
  while (unseen.size > 0) {
    const anchor = [...unseen].sort(compareText)[0];
    const queue = [anchor];
    const component = [];
    unseen.delete(anchor);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const measurement = queue[cursor];
      component.push(measurement);
      for (const neighbor of adjacent.get(measurement) ?? []) {
        if (!unseen.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
    component.sort(compareText);
    components.push(component);
  }
  components.sort((left, right) => compareText(left[0], right[0]));
  const componentProblems = [];
  for (const component of components) {
    const componentSet = new Set(component);
    const componentContexts = contexts.filter((context) => componentSet.has(context.left));
    const componentDegree = new Map(component.map((measurement) => [measurement, degree.get(measurement) ?? 0]));
    const freeMeasurements = component.slice(1);
    const representatives = 2 ** freeMeasurements.length;
    const coverBranchUpperBound = 2 ** Math.min(component.length, componentContexts.length);
    const searchWork = representatives * coverBranchUpperBound;
    if (!Number.isSafeInteger(representatives) || searchWork > MAX_COMPONENT_EXACT_SEARCH_WORK) {
      return obstruction(
        `irreducible connected component exact-search envelope exceeded for [${component.join(", ")}]: ${freeMeasurements.length} coboundary dimensions and an upper bound of ${searchWork} search states`,
        `maximum exact connected-component envelope: ${MAX_COMPONENT_EXACT_SEARCH_WORK} states`,
      );
    }
    componentProblems.push(Object.freeze({
      measurements: Object.freeze([...component]),
      contexts: Object.freeze(componentContexts),
      degree: componentDegree,
      freeMeasurements: Object.freeze(freeMeasurements),
    }));
  }
  const requestedOffset = request.menuOffset ?? 0;
  if (!Number.isSafeInteger(requestedOffset) || requestedOffset < 0) {
    return obstruction("menuOffset must be a nonnegative safe integer");
  }
  const requestedLimit = request.menuLimit ?? DEFAULT_MENU_LIMIT;
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    return obstruction("menuLimit must be a positive safe integer");
  }
  const menuOffset = requestedOffset;
  const menuLimit = Math.max(1, Math.min(MAX_MENU_LIMIT, Math.trunc(requestedLimit)));
  if (!Number.isSafeInteger(menuOffset + menuLimit)) {
    return obstruction("menuOffset + menuLimit must remain within the safe ranked-page cursor range");
  }
  return Object.freeze({
    measurements: Object.freeze(measurements),
    contexts: Object.freeze(contexts),
    degree,
    components: Object.freeze(components.map((component) => Object.freeze(component))),
    componentProblems: Object.freeze(componentProblems),
    menuOffset,
    menuLimit,
  });
}

function compareNames(left, right) {
  return compareText(left.join("\0"), right.join("\0"));
}

function minimumCover(
  edges,
  degree,
) {
  const memo = new Map();
  const weight = (measurement) => (degree.get(measurement) ?? 0) >= 2 ? 1 : 0;
  const compare = (left, right) => {
    const leftPrice = left.reduce((sum, measurement) => sum + weight(measurement), 0);
    const rightPrice = right.reduce((sum, measurement) => sum + weight(measurement), 0);
    if (leftPrice !== rightPrice) return leftPrice < rightPrice ? left : right;
    if (left.length !== right.length) return left.length < right.length ? left : right;
    return compareNames(left, right) <= 0 ? left : right;
  };
  const solve = (remaining) => {
    if (remaining.length === 0) return Object.freeze([]);
    const key = remaining.map((edge) => edge.id).join("\0");
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const edge = remaining[0];
    const choose = (measurement) => {
      const tail = solve(remaining.filter((candidate) =>
        candidate.left !== measurement && candidate.right !== measurement));
      return Object.freeze([...new Set([measurement, ...tail])].sort(compareText));
    };
    const result = compare(choose(edge.left), choose(edge.right));
    memo.set(key, result);
    return result;
  };
  return solve(edges);
}

function evaluationOf(
  problem,
  mask,
) {
  const reference = Object.fromEntries(
    problem.measurements.map((measurement) => [measurement, false]),
  );
  for (let bit = 0; bit < problem.freeMeasurements.length; bit += 1) {
    reference[problem.freeMeasurements[bit]] = (mask & (2 ** bit)) !== 0;
  }
  const representative = {};
  const frustratedContexts = [];
  for (const context of problem.contexts) {
    const frustrated = xor(context.target, xor(reference[context.left], reference[context.right]));
    representative[context.id] = frustrated;
    if (frustrated) frustratedContexts.push(context);
  }
  const cover = minimumCover(frustratedContexts, problem.degree);
  const price = cover.filter((measurement) => (problem.degree.get(measurement) ?? 0) >= 2).length;
  return Object.freeze({
    gaugeMove: Object.freeze({
      flippedMeasurements: Object.freeze(problem.freeMeasurements.filter((measurement) => reference[measurement])),
      reference: Object.freeze(reference),
    }),
    representative: Object.freeze(representative),
    frustratedContexts: Object.freeze(frustratedContexts),
    cover,
    price,
    energy: frustratedContexts.length,
  });
}

function compareEvaluation(left, right) {
  return left.price - right.price
    || left.energy - right.energy
    || compareNames(left.gaugeMove.flippedMeasurements, right.gaugeMove.flippedMeasurements);
}

function compareLosslessEvaluation(left, right) {
  return left.energy - right.energy
    || left.price - right.price
    || compareNames(left.gaugeMove.flippedMeasurements, right.gaugeMove.flippedMeasurements);
}

function combineEvaluations(evaluations) {
  const flippedMeasurements = evaluations.flatMap((evaluation) => evaluation.gaugeMove.flippedMeasurements).sort(compareText);
  const reference = Object.freeze(Object.assign({}, ...evaluations.map((evaluation) => evaluation.gaugeMove.reference)));
  const representative = Object.freeze(Object.assign({}, ...evaluations.map((evaluation) => evaluation.representative)));
  const frustratedContexts = evaluations
    .flatMap((evaluation) => evaluation.frustratedContexts)
    .sort((left, right) => compareText(left.id, right.id));
  const cover = evaluations.flatMap((evaluation) => evaluation.cover).sort(compareText);
  return Object.freeze({
    gaugeMove: Object.freeze({
      flippedMeasurements: Object.freeze(flippedMeasurements),
      reference,
    }),
    representative,
    frustratedContexts: Object.freeze(frustratedContexts),
    cover: Object.freeze(cover),
    price: evaluations.reduce((sum, evaluation) => sum + evaluation.price, 0),
    energy: evaluations.reduce((sum, evaluation) => sum + evaluation.energy, 0),
  });
}

function compareProductState(left, right) {
  const priced = left.evaluation.price - right.evaluation.price
    || left.evaluation.energy - right.evaluation.energy;
  if (priced !== 0) return priced;
  for (let index = 0; index < left.indices.length; index += 1) {
    const compared = left.indices[index] - right.indices[index];
    if (compared !== 0) return compared;
  }
  return 0;
}

/**
 * Read a bounded page from the ordered Cartesian product without materializing
 * that product. Each component list is monotone in price, energy, and its
 * deterministic local tie-break. Global ties use the component-index tuple,
 * so advancing one coordinate cannot improve a state. The frontier therefore
 * emits the exact global order without conflating the component product.
 */
function rankedProductPage(
  components,
  offset,
  limit,
) {
  const initialIndices = Object.freeze(components.map(() => 0));
  const frontier = [{
    indices: initialIndices,
    evaluation: combineEvaluations(components.map((component) => component[0])),
  }];
  const visited = new Set([initialIndices.join(",")]);
  const page = [];
  for (let rank = 0; frontier.length > 0 && page.length < limit; rank += 1) {
    frontier.sort(compareProductState);
    const current = frontier.shift();
    if (rank >= offset) page.push(current.evaluation);
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const nextIndex = current.indices[componentIndex] + 1;
      if (nextIndex >= components[componentIndex].length) continue;
      const indices = [...current.indices];
      indices[componentIndex] = nextIndex;
      const key = indices.join(",");
      if (visited.has(key)) continue;
      visited.add(key);
      frontier.push(Object.freeze({
        indices: Object.freeze(indices),
        evaluation: combineEvaluations(indices.map((index, position) => components[position][index])),
      }));
    }
  }
  return Object.freeze(page);
}

function settlementOf(
  evaluation,
  degree,
) {
  const cover = new Set(evaluation.cover);
  const accountedIncidences = evaluation.frustratedContexts.map((context) => Object.freeze({
    context: context.id,
    measurement: cover.has(context.left) ? context.left : context.right,
  }));
  return Object.freeze({
    kind: "relational.quantum.parity-reconciliation-offer",
    gaugeMove: evaluation.gaugeMove,
    representative: evaluation.representative,
    frustratedContexts: Object.freeze(evaluation.frustratedContexts.map((context) => context.id)),
    idempotentSettlement: Object.freeze({
      price: evaluation.price,
      payingMeasurements: Object.freeze(evaluation.cover.filter((measurement) => (degree.get(measurement) ?? 0) >= 2)),
      freeMeasurements: Object.freeze(evaluation.cover.filter((measurement) => (degree.get(measurement) ?? 0) < 2)),
    }),
    losslessSettlement: Object.freeze({
      energy: evaluation.energy,
      accountedIncidences: Object.freeze(accountedIncidences),
    }),
  });
}

function offerOf(
  evaluation,
  rank,
  degree,
) {
  return Object.freeze({ ...settlementOf(evaluation, degree), rank });
}

/** Compute an exact priced menu over `[target] + B¹`, factoring disconnected components. */
export function quoteParityReconciliation(
  request,
) {
  const problem = normalizeRequest(request);
  if ("kind" in problem) return problem;
  const componentEvaluations = problem.componentProblems.map((component) => {
    const cardinality = 2 ** component.freeMeasurements.length;
    const evaluations = [];
    for (let mask = 0; mask < cardinality; mask += 1) evaluations.push(evaluationOf(component, mask));
    evaluations.sort(compareEvaluation);
    return Object.freeze(evaluations);
  });
  const cardinality = componentEvaluations.reduce(
    (product, evaluations) => product * BigInt(evaluations.length),
    1n,
  );
  const cheapestIdempotentEvaluation = combineEvaluations(componentEvaluations.map((evaluations) => evaluations[0]));
  const cheapestLosslessEvaluation = combineEvaluations(componentEvaluations.map((evaluations) =>
    [...evaluations].sort(compareLosslessEvaluation)[0]));
  const idempotentPrice = cheapestIdempotentEvaluation.price;
  const groundStateEnergy = cheapestLosslessEvaluation.energy;
  if (idempotentPrice > groundStateEnergy) {
    return obstruction("computed idempotent price exceeded counting ground-state energy; topCount_le_massSum was violated");
  }
  const target = Object.freeze(Object.fromEntries(problem.contexts.map((context) => [context.id, context.target])));
  const freeMeasurements = problem.componentProblems.flatMap((component) => component.freeMeasurements);
  const coboundaryBasis = Object.freeze(freeMeasurements.map((measurement) => Object.freeze({
    measurement,
    toggles: Object.freeze(problem.contexts
      .filter((context) => context.left === measurement || context.right === measurement)
      .map((context) => context.id)),
  })));
  const menuEvaluations = BigInt(problem.menuOffset) >= cardinality
    ? Object.freeze([])
    : rankedProductPage(componentEvaluations, problem.menuOffset, problem.menuLimit);
  const nextOffset = problem.menuOffset + menuEvaluations.length;
  return Object.freeze({
    kind: "relational.quantum.parity-reconciliation-quote:witness",
    scope: "finite-boolean-pair-context",
    measurements: problem.measurements,
    contexts: problem.contexts,
    topology: Object.freeze({
      vertices: problem.measurements.length,
      edges: problem.contexts.length,
      components: problem.components.length,
      h1Rank: problem.contexts.length - problem.measurements.length + problem.components.length,
    }),
    coset: Object.freeze({
      target,
      coboundaryBasis,
      dimension: freeMeasurements.length,
      cardinality: cardinality.toString(),
      evaluatedRepresentatives: componentEvaluations.reduce((sum, evaluations) => sum + evaluations.length, 0),
      components: Object.freeze(problem.componentProblems.map((component, index) => Object.freeze({
        measurements: component.measurements,
        contexts: Object.freeze(component.contexts.map((context) => context.id)),
        dimension: component.freeMeasurements.length,
        cardinality: BigInt(componentEvaluations[index].length).toString(),
        evaluatedRepresentatives: componentEvaluations[index].length,
      }))),
    }),
    minima: Object.freeze({
      idempotentPrice,
      groundStateEnergy,
      erasedMultiplicity: groundStateEnergy - idempotentPrice,
      cheapestIdempotent: settlementOf(cheapestIdempotentEvaluation, problem.degree),
      cheapestLossless: settlementOf(cheapestLosslessEvaluation, problem.degree),
    }),
    menu: Object.freeze(menuEvaluations
      .map((evaluation, index) => offerOf(evaluation, problem.menuOffset + index + 1, problem.degree))),
    menuPage: Object.freeze({
      offset: problem.menuOffset,
      limit: problem.menuLimit,
      returned: menuEvaluations.length,
      total: cardinality.toString(),
      ...(BigInt(nextOffset) < cardinality ? { nextOffset } : {}),
    }),
    proofBasis: parityReconciliationProofBasis,
  });
}

function witnessedQuote(
  request,
  caller,
) {
  const judgment = quoteParityReconciliation(request);
  if (judgment.kind !== "relational.quantum.parity-reconciliation-quote:witness") {
    throw new TypeError(`${caller}: ${judgment.obstructions.join("; ")}`);
  }
  return judgment;
}

/**
 * Executable correspondence receipt for the two carriers used by
 * `two_spread_ledger`: figure-eight opens the idempotent/counting spread;
 * theta opens the counting/H¹-rank spread.
 */
export function parityReconciliationLawReceipt() {
  const figureEight = witnessedQuote({
    kind: "relational.quantum.parity-reconciliation-request",
    measurements: ["0", "1", "2", "3", "4"],
    contexts: [
      { id: "01", left: "0", right: "1", target: true },
      { id: "12", left: "1", right: "2", target: false },
      { id: "20", left: "2", right: "0", target: false },
      { id: "03", left: "0", right: "3", target: true },
      { id: "34", left: "3", right: "4", target: false },
      { id: "40", left: "4", right: "0", target: false },
    ],
  }, "parityReconciliationLawReceipt.figureEight");
  const theta = witnessedQuote({
    kind: "relational.quantum.parity-reconciliation-request",
    measurements: ["0", "1", "2", "3"],
    contexts: [
      { id: "01", left: "0", right: "1", target: true },
      { id: "12", left: "1", right: "2", target: false },
      { id: "20", left: "2", right: "0", target: false },
      { id: "03", left: "0", right: "3", target: false },
      { id: "31", left: "3", right: "1", target: false },
    ],
  }, "parityReconciliationLawReceipt.theta");
  if (figureEight.minima.idempotentPrice !== 1
      || figureEight.minima.groundStateEnergy !== 2
      || figureEight.minima.erasedMultiplicity !== 1
      || figureEight.topology.h1Rank !== 2) {
    throw new TypeError("parityReconciliationLawReceipt: figure-eight exchange rates diverged");
  }
  if (theta.minima.idempotentPrice !== 1
      || theta.minima.groundStateEnergy !== 1
      || theta.minima.erasedMultiplicity !== 0
      || theta.topology.h1Rank !== 2) {
    throw new TypeError("parityReconciliationLawReceipt: theta exchange rates diverged");
  }
  return Object.freeze({
    kind: "relational.quantum.parity-reconciliation-law-receipt:witness",
    figureEight: Object.freeze({
      idempotentPrice: 1,
      groundStateEnergy: 2,
      erasedMultiplicity: 1,
      h1Rank: 2,
    }),
    theta: Object.freeze({
      idempotentPrice: 1,
      groundStateEnergy: 1,
      erasedMultiplicity: 0,
      h1Rank: 2,
    }),
    proofBasis: parityReconciliationProofBasis,
  });
}
