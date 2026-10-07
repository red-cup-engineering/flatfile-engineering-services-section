import assert from "node:assert/strict";
import test from "node:test";
import {
  createGraph,
  cycles,
  distances,
  fromJson,
  isAcyclic,
  mergeGraphs,
  neighborhood,
  reachable,
  shortestPath,
  stronglyConnectedComponents,
  subgraph,
  toDot,
  toJson,
  toMermaid,
  topologicalOrder,
  topologicalTiers,
  weaklyConnectedComponents,
} from "../../../src/models/graphs/directed-multigraph.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

test("canonical json ignores object key order", () => {
  assert.equal(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] }), canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }));
});

test("edges imply nodes and identical edges are appended once", () => {
  const graph = createGraph();
  graph.addEdge({ from: "a", to: "b", kind: "depends-on" });
  graph.addEdge({ from: "a", to: "b", kind: "depends-on" });
  assert.equal(graph.order(), 2);
  assert.equal(graph.size(), 1);
  assert.ok(graph.hasNode("a"));
  assert.ok(graph.hasNode("b"));
});

test("same endpoints with different kind or data are distinct edges", () => {
  const graph = createGraph();
  graph.addEdge({ from: "a", to: "b", kind: "depends-on" });
  graph.addEdge({ from: "a", to: "b", kind: "witnesses" });
  graph.addEdge({ from: "a", to: "b", kind: "witnesses", data: { at: 1 } });
  assert.equal(graph.size(), 3);
  assert.equal(graph.edges({ kind: "witnesses" }).length, 2);
});

test("node data may be supplied once; a different second value is refused", () => {
  const graph = createGraph();
  graph.addEdge({ from: "a", to: "b" });
  graph.addNode("a", { title: "Alpha" });
  graph.addNode("a", { title: "Alpha" });
  assert.deepEqual(graph.node("a").data, { title: "Alpha" });
  assert.throws(() => graph.addNode("a", { title: "Beta" }), /different data/);
});

test("topological order lists every node with all edges pointing forward", () => {
  const graph = createGraph({
    edges: [
      { from: "boot", to: "lib" },
      { from: "lib", to: "app" },
      { from: "boot", to: "app" },
      { from: "app", to: "site" },
    ],
  });
  const { order, cycle } = topologicalOrder(graph);
  assert.equal(cycle, undefined);
  assert.equal(order.length, graph.order());
  const position = new Map(order.map((id, index) => [id, index]));
  for (const edge of graph.edges()) assert.ok(position.get(edge.from) < position.get(edge.to));
  assert.ok(isAcyclic(graph));
});

test("topological tiers group independent nodes and expose what could not be placed", () => {
  const graph = createGraph({
    edges: [
      { from: "boot", to: "lib" },
      { from: "app", to: "lib" },
      { from: "site", to: "app" },
    ],
  });
  const { tiers, cycle } = topologicalTiers(graph);
  assert.equal(cycle, undefined);
  assert.equal(tiers.length, 3);
  assert.deepEqual([...tiers[0]].sort(), ["boot", "site"]);
  assert.deepEqual(tiers[1], ["app"]);
  assert.deepEqual(tiers[2], ["lib"]);
});

test("topological tiers still place every orderable node when an unrelated cycle exists", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }, { from: "x", to: "y" }, { from: "y", to: "x" }] });
  const { tiers, cycle } = topologicalTiers(graph);
  assert.deepEqual([...cycle].sort(), ["x", "y"]);
  assert.deepEqual(tiers.map((tier) => [...tier].sort()), [["a"], ["b"]]);
});

test("neighborhood is the bounded-depth, bidirectional ego graph and always includes the focus", () => {
  const graph = createGraph({
    edges: [
      { from: "site", to: "app" },
      { from: "app", to: "lib" },
      { from: "lib", to: "core" },
      { from: "other", to: "lib" },
    ],
  });
  assert.deepEqual([...neighborhood(graph, "app")].sort(), ["app", "lib", "site"]);
  assert.deepEqual([...neighborhood(graph, "app", { downDepth: 2, upDepth: 0 })].sort(), ["app", "core", "lib"]);
  assert.deepEqual([...neighborhood(graph, "missing")], []);
  assert.deepEqual([...neighborhood(graph, "core", { downDepth: 0, upDepth: 0 })], ["core"]);
});

test("a cycle is reported as a cycle, not an order", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
      { from: "x", to: "a" },
    ],
  });
  const { order, cycle } = topologicalOrder(graph);
  assert.equal(order, undefined);
  assert.deepEqual([...cycle].sort(), ["a", "b", "c"]);
  assert.equal(isAcyclic(graph), false);
});

test("stronglyConnectedComponents partitions every node, trivial singletons included", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }, { from: "b", to: "c" }] });
  const found = stronglyConnectedComponents(graph).map((component) => [...component].sort());
  found.sort((left, right) => left.join() < right.join() ? -1 : 1);
  assert.deepEqual(found, [["a", "b"], ["c"]]);
});

test("weaklyConnectedComponents ignores edge direction and keeps isolated nodes", () => {
  const graph = createGraph({ nodes: [{ id: "d" }], edges: [{ from: "a", to: "b" }, { from: "c", to: "b" }] });
  const found = weaklyConnectedComponents(graph).map((component) => [...component].sort());
  found.sort((left, right) => left.join() < right.join() ? -1 : 1);
  assert.deepEqual(found, [["a", "b", "c"], ["d"]]);
});

test("cycles separates a self-loop from a multi-node strongly connected component", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "a", kind: "depends-on" },
      { from: "b", to: "c", kind: "depends-on" },
      { from: "c", to: "d", kind: "depends-on" },
      { from: "d", to: "b", kind: "depends-on" },
      { from: "x", to: "b", kind: "depends-on" },
    ],
  });
  const found = cycles(graph, { kind: "depends-on" }).map((cycle) => [...cycle].sort());
  found.sort((left, right) => left.join() < right.join() ? -1 : 1);
  assert.deepEqual(found, [["a"], ["b", "c", "d"]]);
});

test("cycles reports separate strongly connected components separately", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
      { from: "c", to: "d" },
      { from: "d", to: "c" },
    ],
  });
  const found = cycles(graph).map((cycle) => [...cycle].sort());
  found.sort((left, right) => left.join() < right.join() ? -1 : 1);
  assert.deepEqual(found, [["a", "b"], ["c", "d"]]);
});

test("an acyclic graph has no cycles", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }] });
  assert.deepEqual(cycles(graph), []);
});

test("reachability follows edges transitively and respects kind restriction", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "b", kind: "depends-on" },
      { from: "b", to: "c", kind: "depends-on" },
      { from: "a", to: "d", kind: "mentions" },
    ],
  });
  assert.deepEqual([...reachable(graph, "a")].sort(), ["b", "c", "d"]);
  assert.deepEqual([...reachable(graph, "a", { kind: "depends-on" })].sort(), ["b", "c"]);
  assert.deepEqual([...reachable(graph, "missing")], []);
});

test("shortestPath finds the cheapest weighted route, not just the fewest hops", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "b", data: { cost: 5 } },
      { from: "a", to: "c", data: { cost: 1 } },
      { from: "c", to: "b", data: { cost: 1 } },
    ],
  });
  const byCost = shortestPath(graph, "a", "b", { weight: (edge) => edge.data.cost });
  assert.deepEqual(byCost, { path: ["a", "c", "b"], cost: 2 });
  const byHops = shortestPath(graph, "a", "b");
  assert.deepEqual(byHops, { path: ["a", "b"], cost: 1 });
});

test("shortestPath returns null for an absent endpoint or no route, and zero-cost for a to itself", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }] });
  assert.equal(shortestPath(graph, "a", "missing"), null);
  assert.equal(shortestPath(graph, "b", "a"), null);
  assert.deepEqual(shortestPath(graph, "a", "a"), { path: ["a"], cost: 0 });
});

test("shortestPath rejects a negative edge weight", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }] });
  assert.throws(() => shortestPath(graph, "a", "b", { weight: () => -1 }), /nonnegative/);
});

test("distances gives BFS hop counts ignoring edge weight, capped by maxDepth", () => {
  const graph = createGraph({ edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }] });
  const uncapped = distances(graph, "a");
  assert.deepEqual([...uncapped.entries()].sort(), [["a", 0], ["b", 1], ["c", 2], ["d", 3]]);
  const capped = distances(graph, "a", { maxDepth: 2 });
  assert.deepEqual([...capped.keys()].sort(), ["a", "b", "c"]);
  const zero = distances(graph, "a", { maxDepth: 0 });
  assert.deepEqual([...zero.entries()], [["a", 0]]);
  assert.deepEqual(distances(graph, "missing"), new Map());
});

test("merge is set union and does not depend on argument order", () => {
  const left = createGraph({ nodes: [{ id: "a", data: { n: 1 } }], edges: [{ from: "a", to: "b" }] });
  const right = createGraph({ edges: [{ from: "b", to: "c" }, { from: "a", to: "b" }] });
  const one = toJson(mergeGraphs(left, right));
  const other = toJson(mergeGraphs(right, left));
  assert.deepEqual(one, other);
  assert.equal(one.edges.length, 2);
});

test("merge refuses conflicting node data instead of overwriting", () => {
  const left = createGraph({ nodes: [{ id: "a", data: { n: 1 } }] });
  const right = createGraph({ nodes: [{ id: "a", data: { n: 2 } }] });
  assert.throws(() => mergeGraphs(left, right), /different data/);
});

test("subgraph keeps only the named nodes and the edges between them", () => {
  const graph = createGraph({
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "a", to: "c" },
    ],
  });
  const restricted = subgraph(graph, ["a", "b"]);
  assert.deepEqual(restricted.nodes().map((node) => node.id), ["a", "b"]);
  assert.equal(restricted.size(), 1);
});

test("json round-trips and is deterministic across construction order", () => {
  const forward = createGraph({ edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }] });
  const backward = createGraph({ edges: [{ from: "b", to: "c" }, { from: "a", to: "b" }] });
  assert.deepEqual(toJson(forward), toJson(backward));
  assert.deepEqual(toJson(fromJson(toJson(forward))), toJson(forward));
});

test("dot output is a digraph with quoted ids and labeled non-default kinds", () => {
  const graph = createGraph({ edges: [{ from: "a b", to: "c", kind: "depends-on" }, { from: "c", to: "d" }] });
  const dot = toDot(graph, { label: "demo" });
  assert.ok(dot.startsWith("digraph demo {"));
  assert.ok(dot.includes('"a b" -> "c" [label="depends-on"];'));
  assert.ok(dot.includes('"c" -> "d";'));
  assert.ok(dot.endsWith("}\n"));
});

test("dot label is bare when a valid identifier, and rankdir and node labels emit", () => {
  const graph = createGraph({ nodes: [{ id: "a", data: { kind: "root" } }], edges: [{ from: "a", to: "b" }] });
  const dot = toDot(graph, { label: "software_inventory", rankdir: "LR", nodeLabel: (node) => node.data?.kind });
  assert.ok(dot.startsWith("digraph software_inventory {\n  rankdir=LR;"));
  assert.ok(dot.includes('"a" [label="root"];'));
  assert.ok(dot.includes('"b";'));
});

test("mermaid output sanitizes ids and names non-default kinds on the arrow", () => {
  const graph = createGraph({ edges: [{ from: "a b", to: "c", kind: "depends-on" }] });
  const mermaid = toMermaid(graph);
  assert.ok(mermaid.startsWith("flowchart TD"));
  assert.ok(mermaid.includes('a_b["a b"]'));
  assert.ok(mermaid.includes("a_b -- depends-on --> c"));
});

const fixture=()=>createGraph({edges:[{from:'a',to:'b'},{from:'b',to:'a'},{from:'c',to:'b'}]});
test('incoming traversal reaches an ancestor through a node also reached outgoing',()=>{
  assert.deepEqual([...neighborhood(fixture(),'a',{downDepth:1,upDepth:2})].sort(),['a','b','c']);
});
test('increasing outgoing depth cannot remove incoming-neighborhood members',()=>{
  const graph=fixture();
  const zero=neighborhood(graph,'a',{downDepth:0,upDepth:2});
  const one=neighborhood(graph,'a',{downDepth:1,upDepth:2});
  assert.ok([...zero].every(id=>one.has(id)));
});
test('incoming-only control reaches the full expected ancestor set',()=>{
  assert.deepEqual([...neighborhood(fixture(),'a',{downDepth:0,upDepth:2})].sort(),['a','b','c']);
});


test("neighborhood equals independent directional reachability on every three-node digraph",()=>{
  const ids=['a','b','c']; let checked=0;
  for(let mask=0;mask<512;mask++){
    const edges=[];
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(mask & (1<<(i*3+j)))edges.push({from:ids[i],to:ids[j]});
    const graph=createGraph({nodes:ids.map(id=>({id})),edges});
    const walk=(start,depth,reverse)=>{let reached=new Set([start]);for(let d=0;d<depth;d++){const prior=new Set(reached);for(const e of edges)if(prior.has(reverse?e.to:e.from))reached.add(reverse?e.from:e.to);}return reached;};
    for(const start of ids)for(let downDepth=0;downDepth<=2;downDepth++)for(let upDepth=0;upDepth<=2;upDepth++){
      const expected=new Set([...walk(start,downDepth,false),...walk(start,upDepth,true)]);
      assert.deepEqual([...neighborhood(graph,start,{downDepth,upDepth})].sort(),[...expected].sort(),`mask=${mask},start=${start},down=${downDepth},up=${upDepth}`);checked++;
    }
  }
  assert.equal(checked,13824);
});


test("neighborhood preserves edge-kind filtering with parallel edges", () => {
  const graph = createGraph({ edges: [
    { from: "a", to: "b", kind: "red" },
    { from: "a", to: "b", kind: "red", data: { parallel: true } },
    { from: "b", to: "a", kind: "red" },
    { from: "c", to: "b", kind: "red" },
    { from: "d", to: "b", kind: "blue" },
  ] });
  assert.deepEqual([...neighborhood(graph, "a", { downDepth: 1, upDepth: 2, kind: "red" })].sort(), ["a", "b", "c"]);
  assert.deepEqual([...neighborhood(graph, "a", { downDepth: 1, upDepth: 2, kind: "blue" })], ["a"]);
  assert.deepEqual([...neighborhood(graph, "a", { downDepth: 1, upDepth: 2 })].sort(), ["a", "b", "c", "d"]);
});
