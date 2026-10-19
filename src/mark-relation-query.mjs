/**
 * Index and select original, directed, witnessed Mark relations in one finite
 * source-admitted digital chart. This is a pure Computer Data operation:
 * it does not open a corpus, authenticate anyone, add inferred edges, decode
 * tokens, decide truth, or confer rights from possession of a content address.
 *
 * Exact selectors commute: address means incident in either direction;
 * from/to remain ordered endpoints; predicate names the original relation.
 * Every returned row is the original authored relation, including BOTH
 * evidence sides and its content identity. No synthetic claim is emitted.
 */
const indexByChart = new WeakMap();
const allowed = new Set(["address", "from", "to", "predicate"]);
const empty = Object.freeze([]);
const isName = value => typeof value === "string" && value.length > 0;

function add(index, key, row) {
  const rows = index.get(key) ?? [];
  rows.push(row);
  index.set(key, rows);
}

function sourceIndex(chart) {
  if (!chart || typeof chart !== "object" || Array.isArray(chart) ||
      !["lspace.mark-space", "lspace.digital-topology"].includes(chart.kind) ||
      !Array.isArray(chart.resources) || !Array.isArray(chart.relations))
    throw new TypeError("Mark relation query requires one finite admitted chart presentation");
  const cacheable = Object.isFrozen(chart) && Object.isFrozen(chart.resources) &&
    Object.isFrozen(chart.relations) && chart.resources.every(Object.isFrozen) &&
    chart.relations.every(row => row && typeof row === "object" &&
      Object.isFrozen(row) && row.evidence && Object.isFrozen(row.evidence) &&
      Array.isArray(row.evidence.for) && Object.isFrozen(row.evidence.for) &&
      Array.isArray(row.evidence.against) && Object.isFrozen(row.evidence.against));
  if (cacheable && indexByChart.has(chart)) return indexByChart.get(chart);
  const addresses = new Set();
  for (const resource of chart.resources) {
    if (!resource || !isName(resource.address) || !resource.address.startsWith("ni:") ||
        addresses.has(resource.address))
      throw new TypeError("Mark relation query requires distinct admitted NI resources");
    addresses.add(resource.address);
  }
  const byAddress = new Map(), byFrom = new Map(), byTo = new Map(), byPredicate = new Map();
  for (const relation of chart.relations) {
    if (!relation || !isName(relation.id) || !isName(relation.from) ||
        !isName(relation.to) || !isName(relation.predicate) ||
        !addresses.has(relation.from) || !addresses.has(relation.to) ||
        !relation.evidence || !Array.isArray(relation.evidence.for) ||
        !Array.isArray(relation.evidence.against))
      throw new TypeError("Mark relation query requires witnessed edges between admitted NI resources");
    add(byFrom, relation.from, relation);
    add(byTo, relation.to, relation);
    add(byPredicate, relation.predicate, relation);
    add(byAddress, relation.from, relation);
    if (relation.to !== relation.from) add(byAddress, relation.to, relation);
  }
  const built = { addresses, rows: chart.relations,
    byAddress, byFrom, byTo, byPredicate };
  if (cacheable) indexByChart.set(chart, built);
  return built;
}

/** Select exact original rows, in source order, by any conjunction of four
 * selectors. Unknown scoped NI addresses refuse (never probe another source);
 * an unobserved predicate yields an empty result. A frozen chart's index can
 * be reused; caller-mutable presentations are re-read on every invocation.
 */
export function selectMarkRelations(chart, selection = {}) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection) ||
      Object.keys(selection).some(key => !allowed.has(key)) ||
      Object.values(selection).some(value => !isName(value)))
    throw new TypeError("Mark relation query permits only nonempty exact address/from/to/predicate selectors");
  const index = sourceIndex(chart);
  for (const key of ["address", "from", "to"]) {
    if (Object.hasOwn(selection, key) && !index.addresses.has(selection[key]))
      throw new RangeError("Mark relation query address not admitted");
  }
  const selected = [
    ["address", index.byAddress], ["from", index.byFrom],
    ["to", index.byTo], ["predicate", index.byPredicate],
  ].filter(([key]) => Object.hasOwn(selection, key))
    .map(([key, lookup]) => lookup.get(selection[key]) ?? empty);
  const candidates = selected.length
    ? selected.reduce((a, b) => b.length < a.length ? b : a)
    : index.rows;
  const { address, from, to, predicate } = selection;
  return Object.freeze(candidates.filter(relation =>
    (address === undefined || relation.from === address || relation.to === address) &&
    (from === undefined || relation.from === from) &&
    (to === undefined || relation.to === to) &&
    (predicate === undefined || relation.predicate === predicate)));
}
