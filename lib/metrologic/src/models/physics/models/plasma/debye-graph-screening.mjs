/**
 * models/plasma/debye-graph-screening - relay closure on plasma graphs.
 *
 * This captures `Obsmetrologia.Relational.Plasma.DebyeGraphScreening`:
 * Debye graphs with nonnegative relay costs, monotone screened-potential
 * steps, least relay-closed screened clouds, idempotence, and pairGraph.
 */

function normalizeScreened(cells, screened) {
  return Object.freeze(Object.fromEntries(cells.map((cell) => [cell, screened[cell] === true])));
}

function leScreened(cells, left, right) {
  return cells.every((cell) => !left[cell] || right[cell]);
}

export function debyeGraph(
  cells,
  couplings,
) {
  const admittedCells = Object.freeze([...new Set(cells)]);
  const known = new Set(admittedCells);
  for (const coupling of couplings) {
    if (!known.has(coupling.from) || !known.has(coupling.to)) throw new TypeError("debyeGraph: coupling mentions unknown cell");
    if (!Number.isFinite(coupling.cost) || coupling.cost < 0) throw new TypeError("debyeGraph: coupling cost must be nonnegative");
  }
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.graph",
    cells: admittedCells,
    couplings: Object.freeze(couplings.map((coupling) => Object.freeze({ ...coupling }))),
  });
}

export function screenedPotentialStep(
  graph,
  source,
  current,
) {
  const next = { ...normalizeScreened(graph.cells, source) };
  const admitted = normalizeScreened(graph.cells, current);
  for (const coupling of graph.couplings) {
    if (admitted[coupling.from]) next[coupling.to] = true;
  }
  for (const cell of graph.cells) next[cell] = next[cell] === true || admitted[cell] === true;
  return Object.freeze(next);
}

export function screenedPotential(
  graph,
  source,
) {
  let current = normalizeScreened(graph.cells, source);
  for (;;) {
    const next = screenedPotentialStep(graph, source, current);
    if (graph.cells.every((cell) => next[cell] === current[cell])) return next;
    current = next;
  }
}

export function debyeScreenedWitness(
  graph,
  source,
) {
  const admittedSource = normalizeScreened(graph.cells, source);
  const screened = screenedPotential(graph, admittedSource);
  const rescreened = screenedPotential(graph, screened);
  if (!leScreened(graph.cells, admittedSource, screened)) throw new TypeError("debyeScreenedWitness: source not included");
  if (graph.cells.some((cell) => rescreened[cell] !== screened[cell])) throw new TypeError("debyeScreenedWitness: screening was not idempotent");
  if (graph.couplings.some((coupling) => coupling.cost < 0)) throw new TypeError("debyeScreenedWitness: negative relay cost");
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.screened:witness",
    graph,
    source: admittedSource,
    screened,
    sourceIncluded: true,
    idempotent: true,
    relayCostsNonnegative: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.screening_step_mono",
      "Obsmetrologia.Relational.Plasma.screened_potential_is_lfp",
      "Obsmetrologia.Relational.Plasma.source_le_screened",
      "Obsmetrologia.Relational.Plasma.screened_cloud_mono",
      "Obsmetrologia.Relational.Plasma.screened_potential_idem",
      "Obsmetrologia.Relational.Plasma.relay_cost_nonneg",
    ]),
  });
}

export function pairDebyeGraph() {
  return debyeGraph(["source", "neighbor"], [Object.freeze({ from: "source", to: "neighbor", cost: 1 })]);
}

export function plasmaDebyeGraphScreeningReceipt() {
  const graph = pairDebyeGraph();
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.receipt:witness",
    pairGraph: graph,
    screened: debyeScreenedWitness(graph, { source: true, neighbor: false }),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.DebyeGraphScreening",
  });
}
