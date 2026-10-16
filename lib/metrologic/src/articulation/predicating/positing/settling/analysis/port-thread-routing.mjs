/**
 * Explicit finite bead-port routing: holes are internal bead transitions and
 * listed external port segments join passes. Unlike causal K(C) sequencing,
 * an actual thread walk can revisit a lenticule and close a cycle.
 *
 * An admitted route is an exact combinatorial witness, NOT a material embedding,
 * collision check, tension/friction model, cultural license or Lean proof.
 * The material graph's thread, contact, cell and visible adjacencies remain
 * separate; only the actually traversed THREAD segments are returned here.
 */
import { condensate } from "./port-graph.mjs";

const MAX_BEADS = 4096;
const MAX_PASSES = 65536;
const MAX_LINKS = 131072;
const MAX_STATES = 300000;
const pairKey = (beadId, port) => JSON.stringify([beadId, port]);
const linkKey = (from, to) => JSON.stringify([from.beadId, from.port, to.beadId, to.port]);
const fail = (message) => { throw new TypeError("port-thread-routing: " + message); };
const id = (value, where) => {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024)
    fail(where + " must be a nonempty bounded string");
  return value;
};
const portRef = (port, where) => {
  if (!port || typeof port !== "object" || Array.isArray(port)) fail(where + " must be a port reference");
  return { beadId: id(port.beadId, where + ".beadId"), port: id(port.port, where + ".port") };
};

function modelOf({ beads, links }) {
  if (!Array.isArray(beads) || beads.length > MAX_BEADS || !Array.isArray(links) || links.length > MAX_LINKS)
    fail("requires bounded beads and links arrays");
  const byBead = new Map();
  const holeOptions = [];
  for (const [index, bead] of beads.entries()) {
    const beadId = id(bead?.id, "beads[" + index + "].id");
    if (byBead.has(beadId)) fail("duplicate bead ID " + beadId);
    if (!Array.isArray(bead.holes) || bead.holes.length === 0 || bead.holes.length > 24)
      fail("each bead requires 1..24 explicitly paired holes");
    const knownPorts = new Map();
    const holes = bead.holes.map((pair, holeIndex) => {
      if (!Array.isArray(pair) || pair.length !== 2) fail("a hole must pair exactly two ports");
      const a = id(pair[0], "hole port"), b = id(pair[1], "hole port");
      if (a === b || knownPorts.has(a) || knownPorts.has(b))
        fail("hole endpoints must be different, with distinct mouths on this bead");
      knownPorts.set(a, holeIndex);
      knownPorts.set(b, holeIndex);
      holeOptions.push(Object.freeze({ beadId, beadIndex: index, holeIndex, enter: a, exit: b }));
      holeOptions.push(Object.freeze({ beadId, beadIndex: index, holeIndex, enter: b, exit: a }));
      return Object.freeze([a, b]);
    });
    byBead.set(beadId, { index, holes: Object.freeze(holes), knownPorts });
  }
  const connections = new Set();
  for (const [index, link] of links.entries()) {
    const from = portRef(link?.from, "links[" + index + "].from");
    const to = portRef(link?.to, "links[" + index + "].to");
    for (const p of [from, to]) {
      if (!byBead.get(p.beadId)?.knownPorts.has(p.port))
        fail("external link refers to an absent bead port");
    }
    const key = linkKey(from, to);
    if (connections.has(key)) fail("duplicate external port link");
    connections.add(key);
  }
  return { byBead, holeOptions, connections, beads };
}

const refusal = (reason, atPassIndex = null) => Object.freeze({
  kind: "aperiodic.portGraph.threadRoute-obstruction", reason, atPassIndex,
});

/**
 * Independently check an explicitly supplied PORT walk. Repetition is legal;
 * per-bead and per-hole occupations must not be replaced by thread.length.
 * The loop closure is an explicit final-out to first-in connector.
 */
export function portThreadRouteOf(spec) {
  if (!spec || typeof spec !== "object") fail("expected a route object");
  const { byBead, connections, beads } = modelOf(spec);
  const passes = spec.passes;
  if (!Array.isArray(passes) || passes.length > MAX_PASSES) fail("passes must be a bounded array");
  if (typeof spec.closed !== "boolean" || typeof spec.requireEveryBead !== "boolean")
    fail("closed and requireEveryBead must be explicit booleans");
  if (spec.closed && passes.length === 0) return refusal("empty-closed-route");
  const localCounts = new Array(beads.length).fill(0);
  const holeCounts = beads.map(b => new Array(b.holes.length).fill(0));
  const route = [];
  for (const [i, pass] of passes.entries()) {
    const beadId = id(pass?.beadId, "passes[" + i + "].beadId");
    const enter = id(pass?.enter, "passes[" + i + "].enter");
    const exit = id(pass?.exit, "passes[" + i + "].exit");
    const bead = byBead.get(beadId);
    if (!bead) fail("route names an absent bead");
    const holeIndex = bead.knownPorts.get(enter);
    if (holeIndex === undefined || enter === exit || bead.knownPorts.get(exit) !== holeIndex)
      return refusal("unlisted-hole-transition", i);
    localCounts[bead.index]++;
    holeCounts[bead.index][holeIndex]++;
    route.push(Object.freeze({ passIndex: i, beadId, holeIndex, enter, exit }));
  }
  if (spec.requireEveryBead && localCounts.some(n => n === 0))
    return refusal("unvisited-bead");
  const segments = [];
  const edgeCount = passes.length === 0 ? 0 : passes.length - 1 + Number(spec.closed);
  for (let i = 0; i < edgeCount; i++) {
    const next = (i + 1) % route.length;
    const from = { beadId: route[i].beadId, port: route[i].exit };
    const to = { beadId: route[next].beadId, port: route[next].enter };
    if (!connections.has(linkKey(from, to))) return refusal("unlisted-external-connector", i);
    segments.push(Object.freeze({
      fromPassIndex: i, toPassIndex: next,
      from: Object.freeze(from), to: Object.freeze(to),
    }));
  }
  const occupations = Object.freeze(beads.map((b, i) => Object.freeze({
    beadId: b.id, count: localCounts[i], charge: condensate(localCounts[i]),
    holes: Object.freeze(holeCounts[i].map((count, holeIndex) => Object.freeze({
      holeIndex, count, charge: condensate(count),
    }))),
  })));
  return Object.freeze({
    kind: "aperiodic.portGraph.threadRoute:witness", closed: spec.closed,
    passCount: route.length, thread: Object.freeze(route),
    // Keep repeated directed segments, not a set of informal bead adjacencies.
    threadSegments: Object.freeze(segments), occupations,
    locallyOverOccupied: Object.freeze(occupations.filter(x => x.count >= 2).map(x => x.beadId)),
    globalPassCharge: condensate(route.length),
    // No claim is made about contact/cell/visible adjacency or physical jamming.
  });
}

/**
 * Bounded shortest BEAD-PASS search over an explicit port graph. Multi-source
 * breadth-first search proves minimum number of hole traversals when it finds
 * a route covering every bead. Every route is independently rechecked above.
 * This is not Demaine-style minimum material thread length or minimum turn cost.
 */
export function minimumPortThreadRouteOf({ beads, links, closed = true } = {}) {
  const carrier = modelOf({ beads, links });
  if (typeof closed !== "boolean") fail("closed must be a boolean");
  const n = beads.length;
  if (n > 9 || carrier.holeOptions.length > 60 || links.length > 96)
    throw new RangeError("minimumPortThreadRouteOf is bounded to 9 beads, 60 oriented passes, 96 links");
  if (n === 0) return closed ? refusal("empty-closed-route") : portThreadRouteOf({ beads, links, passes: [], closed: false, requireEveryBead: true });
  const options = carrier.holeOptions;
  const startsByPort = new Map();
  options.forEach((option, index) => {
    const key = pairKey(option.beadId, option.enter);
    if (!startsByPort.has(key)) startsByPort.set(key, []);
    startsByPort.get(key).push(index);
  });
  const adjacent = options.map(o => {
    const result = [];
    for (const key of carrier.connections) {
      const [fromBead, fromPort, toBead, toPort] = JSON.parse(key);
      if (fromBead === o.beadId && fromPort === o.exit)
        result.push(...(startsByPort.get(pairKey(toBead, toPort)) ?? []));
    }
    return result;
  });
  const all = (1 << n) - 1;
  const queue = [], visited = new Set();
  const keyOf = state => state.start + ":" + state.last + ":" + state.mask;
  options.forEach((o, optionIndex) => {
    const state = { start: optionIndex, last: optionIndex, mask: 1 << o.beadIndex, previous: -1, depth: 1 };
    const key = keyOf(state);
    if (!visited.has(key)) { visited.add(key); queue.push(state); }
  });
  const terminal = state => state.mask === all && (!closed || carrier.connections.has(linkKey(
    { beadId: options[state.last].beadId, port: options[state.last].exit },
    { beadId: options[state.start].beadId, port: options[state.start].enter },
  )));
  for (let i = 0; i < queue.length; i++) {
    if (i >= MAX_STATES) return refusal("search-budget-exceeded");
    const state = queue[i];
    if (terminal(state)) {
      const history = [];
      for (let at = i; at !== -1; at = queue[at].previous) history.push(options[queue[at].last]);
      history.reverse();
      const passes = history.map(o => ({ beadId: o.beadId, enter: o.enter, exit: o.exit }));
      const checked = portThreadRouteOf({ beads, links, passes, closed, requireEveryBead: true });
      if (checked.kind !== "aperiodic.portGraph.threadRoute:witness")
        throw new TypeError("minimumPortThreadRouteOf constructed an inadmissible witness");
      return Object.freeze({ ...checked, minimalPassCount: checked.passCount, statesExamined: i + 1, minimalBy: "bounded-unit-cost-breadth-first-search" });
    }
    for (const next of adjacent[state.last]) {
      const candidate = { start: state.start, last: next,
        mask: state.mask | (1 << options[next].beadIndex), previous: i, depth: state.depth + 1 };
      const key = keyOf(candidate);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(candidate);
    }
  }
  return refusal(closed ? "no-closed-thread-route" : "no-covering-thread-route");
}
