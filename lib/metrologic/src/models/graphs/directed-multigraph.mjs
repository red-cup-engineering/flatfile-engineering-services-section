/**
 * A deterministic directed multigraph and the graph algorithms over it: topological order and
 * tiers, strongly and weakly connected components and cycles, reachability, neighborhoods, shortest paths and
 * distances, merging and subgraphs, and JSON, DOT and Mermaid readings.
 * @packageDocumentation
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

// An edge without data keys by its three coordinates alone; canonical JSON has no undefined.
const edgeKey = (edge) => canonicalJson(edge.data === undefined ? [edge.from, edge.kind, edge.to] : [edge.from, edge.kind, edge.to, edge.data]);
const edgesAt = (index, id, { kind } = {}) => {
  const edges = index.get(id) ?? [];
  return kind === undefined ? edges.slice() : edges.filter((edge) => edge.kind === kind);
};

/** A deterministic directed multigraph. */
export function createGraph({ nodes = [], edges = [] } = {}) {
  const nodeById = new Map(), edgeByKey = new Map();
  const outgoingByNode = new Map(), incomingByNode = new Map();
  const ensureNode = (id) => {
    if (typeof id !== "string" || id.length === 0) throw new TypeError("node id must be a non-empty string");
    if (!nodeById.has(id)) {
      nodeById.set(id, Object.freeze({ id, data: undefined }));
      outgoingByNode.set(id, []); incomingByNode.set(id, []);
    }
    return nodeById.get(id);
  };
  const graph = {
    addNode(id, data = undefined) {
      const existing = ensureNode(id);
      if (data === undefined) return existing;
      if (existing.data === undefined) {
        const node = Object.freeze({ id, data }); nodeById.set(id, node); return node;
      }
      if (canonicalJson(existing.data) !== canonicalJson(data)) throw new Error(`node ${JSON.stringify(id)} already has different data`);
      return existing;
    },
    addEdge({ from, to, kind = "edge", data = undefined }) {
      ensureNode(from); ensureNode(to);
      if (typeof kind !== "string" || kind.length === 0) throw new TypeError("edge kind must be a non-empty string");
      const edge = Object.freeze({ from, to, kind, data }), key = edgeKey(edge);
      if (edgeByKey.has(key)) return edgeByKey.get(key);
      edgeByKey.set(key, edge); outgoingByNode.get(from).push(edge); incomingByNode.get(to).push(edge);
      return edge;
    },
    hasNode: (id) => nodeById.has(id), node: (id) => nodeById.get(id), nodes: () => [...nodeById.values()],
    edges: ({ kind } = {}) => {
      const all = [...edgeByKey.values()];
      return kind === undefined ? all : all.filter((edge) => edge.kind === kind);
    },
    outgoing: (id, filter = {}) => edgesAt(outgoingByNode, id, filter),
    incoming: (id, filter = {}) => edgesAt(incomingByNode, id, filter),
    order: () => nodeById.size, size: () => edgeByKey.size,
  };
  for (const node of nodes) graph.addNode(node.id, node.data);
  for (const edge of edges) graph.addEdge(edge);
  return graph;
}

export function topologicalOrder(graph, { kind } = {}) {
  const remaining = new Map(graph.nodes().map(({ id }) => [id, graph.incoming(id, { kind }).length]));
  const ready = [...remaining].filter(([, n]) => n === 0).map(([id]) => id), order = [];
  while (ready.length) {
    const id = ready.shift(); remaining.delete(id); order.push(id);
    for (const edge of graph.outgoing(id, { kind })) {
      const degree = remaining.get(edge.to); if (degree === undefined) continue;
      if (degree === 1) ready.push(edge.to); remaining.set(edge.to, degree - 1);
    }
  }
  return remaining.size === 0 ? { order } : { cycle: [...remaining.keys()] };
}
export const isAcyclic = (graph, options = {}) => topologicalOrder(graph, options).order !== undefined;

export function topologicalTiers(graph, { kind } = {}) {
  const remaining = new Map(graph.nodes().map(({ id }) => [id, graph.incoming(id, { kind }).length]));
  const tiers = []; let frontier = [...remaining].filter(([, n]) => n === 0).map(([id]) => id);
  while (frontier.length) {
    tiers.push(frontier); const next = [];
    for (const id of frontier) {
      remaining.delete(id);
      for (const edge of graph.outgoing(id, { kind })) {
        const degree = remaining.get(edge.to); if (degree === undefined) continue;
        if (degree === 1) next.push(edge.to); remaining.set(edge.to, degree - 1);
      }
    }
    frontier = next;
  }
  return remaining.size === 0 ? { tiers } : { tiers, cycle: [...remaining.keys()] };
}

export function neighborhood(graph, start, { downDepth = 1, upDepth = 1, kind } = {}) {
  const keep = new Set(); if (!graph.hasNode(start)) return keep; keep.add(start);
  const expand = (neighbors, depth) => {
    const seen = new Set([start]); let frontier = [start];
    for (let hop = 0; hop < depth; hop += 1) {
      const next = [];
      for (const id of frontier) for (const neighbor of neighbors(id)) if (!seen.has(neighbor)) { seen.add(neighbor); keep.add(neighbor); next.push(neighbor); }
      frontier = next;
    }
  };
  expand((id) => graph.outgoing(id, { kind }).map((edge) => edge.to), downDepth);
  expand((id) => graph.incoming(id, { kind }).map((edge) => edge.from), upDepth);
  return keep;
}

export function stronglyConnectedComponents(graph, { kind } = {}) {
  let index = 0; const stack = [], onStack = new Set(), indices = new Map(), lowlink = new Map(), components = [];
  const connect = (start) => {
    const successors = (id) => graph.outgoing(id, { kind }).map((edge) => edge.to);
    const work = [[start, successors(start), 0]];
    indices.set(start, index); lowlink.set(start, index); index += 1; stack.push(start); onStack.add(start);
    while (work.length) {
      const frame = work[work.length - 1], [current, nextIds] = frame;
      let advanced = false;
      while (frame[2] < nextIds.length) {
        const next = nextIds[frame[2]]; frame[2] += 1;
        if (!indices.has(next)) {
          indices.set(next, index); lowlink.set(next, index); index += 1; stack.push(next); onStack.add(next);
          work.push([next, successors(next), 0]); advanced = true; break;
        }
        if (onStack.has(next)) lowlink.set(current, Math.min(lowlink.get(current), indices.get(next)));
      }
      if (advanced) continue;
      if (lowlink.get(current) === indices.get(current)) {
        const component = []; let member;
        do { member = stack.pop(); onStack.delete(member); component.push(member); } while (member !== current);
        components.push(component);
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1][0];
        lowlink.set(parent, Math.min(lowlink.get(parent), lowlink.get(current)));
      }
    }
  };
  for (const { id } of graph.nodes()) if (!indices.has(id)) connect(id);
  return components;
}
export const cycles = (graph, options = {}) => stronglyConnectedComponents(graph, options).filter((component) => component.length > 1 || graph.outgoing(component[0], options).some((edge) => edge.to === component[0]));

/** The weakly connected components: the strongly connected components once each edge also runs back. */
export function weaklyConnectedComponents(graph, { kind } = {}) {
  const edges = graph.edges({ kind }).flatMap(({ from, to }) => [{ from, to }, { from: to, to: from }]);
  return stronglyConnectedComponents(createGraph({ nodes: graph.nodes(), edges }));
}
export function reachable(graph, start, { kind } = {}) {
  const frontier = (Array.isArray(start) ? start : [start]).filter((id) => graph.hasNode(id)), seen = new Set();
  while (frontier.length) for (const edge of graph.outgoing(frontier.pop(), { kind })) if (!seen.has(edge.to)) { seen.add(edge.to); frontier.push(edge.to); }
  return seen;
}
class MinHeap {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); for (let i = this.items.length - 1; i > 0;) { const parent = (i - 1) >> 1; if (this.items[parent].cost <= this.items[i].cost) break; [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]]; i = parent; } }
  pop() { const top = this.items[0], last = this.items.pop(); if (this.items.length) { this.items[0] = last; for (let i = 0;;) { const left = i * 2 + 1, right = left + 1; let smallest = i; if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) smallest = left; if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) smallest = right; if (smallest === i) break; [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]]; i = smallest; } } return top; }
  get size() { return this.items.length; }
}
export function shortestPath(graph, from, to, { kind, weight = () => 1 } = {}) {
  if (!graph.hasNode(from) || !graph.hasNode(to)) return null;
  if (from === to) return { path: [from], cost: 0 };
  const distance = new Map([[from, 0]]), previous = new Map(), visited = new Set(), heap = new MinHeap(); heap.push({ id: from, cost: 0 });
  while (heap.size) {
    const { id, cost } = heap.pop(); if (visited.has(id)) continue; visited.add(id); if (id === to) break;
    for (const edge of graph.outgoing(id, { kind })) {
      if (visited.has(edge.to)) continue; const edgeWeight = weight(edge);
      if (!Number.isFinite(edgeWeight) || edgeWeight < 0) throw new TypeError(`shortestPath requires a nonnegative finite edge weight, got ${edgeWeight} for ${edge.from} -> ${edge.to}`);
      const next = cost + edgeWeight;
      if (next < (distance.get(edge.to) ?? Infinity)) { distance.set(edge.to, next); previous.set(edge.to, id); heap.push({ id: edge.to, cost: next }); }
    }
  }
  if (!distance.has(to)) return null;
  const path = [to]; for (let id = to; id !== from;) { id = previous.get(id); path.push(id); } path.reverse();
  return { path, cost: distance.get(to) };
}
export function distances(graph, start, { kind, maxDepth = Infinity } = {}) {
  const distance = new Map(); if (!graph.hasNode(start)) return distance; distance.set(start, 0);
  const queue = [start]; for (let i = 0; i < queue.length; i += 1) { const id = queue[i], depth = distance.get(id); if (depth >= maxDepth) continue; for (const edge of graph.outgoing(id, { kind })) if (!distance.has(edge.to)) { distance.set(edge.to, depth + 1); queue.push(edge.to); } }
  return distance;
}
export function mergeGraphs(...graphs) { const merged = createGraph(); for (const graph of graphs) { for (const node of graph.nodes()) merged.addNode(node.id, node.data); for (const edge of graph.edges()) merged.addEdge(edge); } return merged; }
export function subgraph(graph, nodeIds) { const keep = new Set(nodeIds), result = createGraph(); for (const id of keep) { const node = graph.node(id); if (node) result.addNode(node.id, node.data); } for (const edge of graph.edges()) if (keep.has(edge.from) && keep.has(edge.to)) result.addEdge(edge); return result; }
export function toJson(graph) {
  const nodes = graph.nodes().map(({ id, data }) => data === undefined ? { id } : { id, data });
  nodes.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const edges = graph.edges().map(({ from, to, kind, data }) => data === undefined ? { from, to, kind } : { from, to, kind, data });
  edges.sort((left, right) => {
    const leftKey = edgeKey(left), rightKey = edgeKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return { nodes, edges };
}
export const fromJson = (json) => createGraph({ nodes: json.nodes ?? [], edges: json.edges ?? [] });
const quote = (text) => `"${String(text).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
const dotId = (text) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(text) ? text : quote(text);
export function toDot(graph, { label = "graph_data", rankdir, nodeLabel = () => undefined, edgeLabel = (edge) => edge.kind === "edge" ? undefined : edge.kind } = {}) { const { nodes, edges } = toJson(graph), lines = [`digraph ${dotId(label)} {`]; if (rankdir !== undefined) lines.push(`  rankdir=${rankdir};`); for (const node of nodes) { const value = nodeLabel(node); lines.push(`  ${quote(node.id)}${value === undefined ? "" : ` [label=${quote(value)}]`};`); } for (const edge of edges) { const value = edgeLabel(edge); lines.push(`  ${quote(edge.from)} -> ${quote(edge.to)}${value === undefined ? "" : ` [label=${quote(value)}]`};`); } return `${lines.join("\n")}\n}\n`; }
const mermaidId = (id) => id.replaceAll(/[^A-Za-z0-9_]/gu, "_");
export function toMermaid(graph, { direction = "TD" } = {}) { const { nodes, edges } = toJson(graph), lines = [`flowchart ${direction}`]; for (const node of nodes) lines.push(`  ${mermaidId(node.id)}[${quote(node.id)}]`); for (const edge of edges) lines.push(`  ${mermaidId(edge.from)} ${edge.kind === "edge" ? "-->" : `-- ${edge.kind} -->`} ${mermaidId(edge.to)}`); return `${lines.join("\n")}\n`; }
