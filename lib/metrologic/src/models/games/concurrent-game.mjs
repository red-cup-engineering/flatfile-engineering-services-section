/**
 * The finite prime-event-structure part of concurrent games with symmetry.
 *
 * Events are mathematical positions, NOT remotely authorized actions or
 * content addresses. A configuration is finite, conflict-free and down-closed.
 * Minimal conflict is closed through causal descendants. Polarity is a game
 * coordinate, not the identity or office of a software player.
 *
 * A configuration isomorphism is a single partial symmetry, not a certified
 * isomorphism family, receptive strategy or interaction-and-hiding composition.
 */
import { createGraph, topologicalTiers, reachable } from '../graphs/directed-multigraph.mjs';

const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const idOf = x => typeof x === 'string' && x.length > 0;
const pairKey = (a, b) => JSON.stringify(a < b ? [a, b] : [b, a]);
const orderedKey = (a, b) => JSON.stringify([a, b]);

/** Admit a finite polarized prime event structure, deriving hereditary conflict. */
export function concurrentGame({ events, minimalConflicts = [] } = {}) {
  if (!Array.isArray(events) || !Array.isArray(minimalConflicts))
    throw new TypeError('concurrent game needs events and minimal conflicts');
  const byId = new Map(), graph = createGraph();
  for (const event of events) {
    if (!object(event) || !idOf(event.id) || byId.has(event.id)
        || !['player', 'opponent'].includes(event.polarity)
        || !Array.isArray(event.after ?? []) ||
        !(event.after ?? []).every(idOf) ||
        new Set(event.after ?? []).size !== (event.after ?? []).length)
      throw new TypeError('concurrent game needs distinct polarized events with causal names');
    const admitted = Object.freeze({ id: event.id, polarity: event.polarity,
      after: Object.freeze([...(event.after ?? [])]) });
    byId.set(admitted.id, admitted);
    graph.addNode(admitted.id);
  }
  for (const event of byId.values()) for (const parent of event.after) {
    if (!byId.has(parent) || parent === event.id)
      throw new TypeError('unknown or reflexive cause of ' + event.id + ': ' + parent);
    graph.addEdge({ from: parent, to: event.id, kind: 'causal' });
  }
  const { tiers, cycle } = topologicalTiers(graph, { kind: 'causal' });
  if (cycle) throw new TypeError('concurrent game has a causal cycle');
  const future = new Map([...byId.keys()].map(id => [id, [id, ...reachable(graph, id, { kind: 'causal' })]]));
  const precedence = new Set();
  for (const id of byId.keys()) for (const to of future.get(id))
    if (to !== id) precedence.add(orderedKey(id, to));
  const minimal = [], minimalKeys = new Set(), conflictKeys = new Set();
  for (const pair of minimalConflicts) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !pair.every(id => idOf(id) && byId.has(id)) || pair[0] === pair[1])
      throw new TypeError('minimal conflict must name two different existing events');
    const key = pairKey(...pair);
    if (minimalKeys.has(key)) throw new TypeError('duplicate minimal conflict');
    minimalKeys.add(key);
    minimal.push(Object.freeze([...pair]));
    for (const left of future.get(pair[0])) for (const right of future.get(pair[1])) {
      if (left === right)
        throw new TypeError('conflict inheritance would make an event inconsistent with itself');
      conflictKeys.add(pairKey(left, right));
    }
  }
  return Object.freeze({
    kind: 'metrologic.concurrent-game',
    events: Object.freeze([...byId.values()]),
    tiers: Object.freeze(tiers.map(tier => Object.freeze([...tier]))),
    minimalConflicts: Object.freeze(minimal),
    conflicts: Object.freeze([...conflictKeys].map(key => Object.freeze(JSON.parse(key)))),
    precedence: Object.freeze([...precedence].map(key => Object.freeze(JSON.parse(key)))),
  });
}

/** Read one possible play; strategy and authorization are strictly downstream. */
export function configurationOf(game, eventIds = []) {
  if (game?.kind !== 'metrologic.concurrent-game' || !Array.isArray(eventIds) ||
      !eventIds.every(idOf) || new Set(eventIds).size !== eventIds.length)
    throw new TypeError('configuration needs a game and distinct event names');
  const chosen = new Set(eventIds), byId = new Map(game.events.map(e => [e.id, e]));
  for (const id of chosen) {
    const event = byId.get(id);
    if (!event) throw new TypeError('configuration contains unknown event ' + id);
    if (event.after.some(parent => !chosen.has(parent)))
      throw new TypeError('configuration is not causally closed at ' + id);
  }
  for (const [a, b] of game.conflicts) if (chosen.has(a) && chosen.has(b))
    throw new TypeError('configuration contains incompatible events ' + a + ' and ' + b);
  return Object.freeze([...chosen]);
}

/** Events available for the next finite extension (no scheduler or wall-clock). */
export function enabledOf(game, configuration = []) {
  const members = new Set(configurationOf(game, configuration));
  const conflicting = new Set(game.conflicts.flatMap(([a, b]) =>
    members.has(a) ? [b] : members.has(b) ? [a] : []));
  return Object.freeze(game.events.filter(e => !members.has(e.id) && !conflicting.has(e.id) &&
    e.after.every(parent => members.has(parent))).map(e => e.id));
}

/** Causally independent, compatible events; no forced global alternation. */
export function concurrentIn(game, left, right) {
  if (game?.kind !== 'metrologic.concurrent-game' || !game.events.some(e => e.id === left) ||
      !game.events.some(e => e.id === right)) throw new TypeError('unknown game event');
  return left !== right && !game.conflicts.some(([a, b]) =>
    (a === left && b === right) || (a === right && b === left)) &&
    !game.precedence.some(([a, b]) => (a === left && b === right) || (a === right && b === left));
}

/** Pure induced-poset isomorphism of two configurations of the same arena.
 * No content-address identity, role equivalence or game-strategy laws implied.
 */
export function configurationIsomorphism(game, pairs) {
  if (!Array.isArray(pairs) || !pairs.every(p => Array.isArray(p) && p.length === 2))
    throw new TypeError('configuration symmetry requires ordered event pairs');
  const from = configurationOf(game, pairs.map(p => p[0]));
  const to = configurationOf(game, pairs.map(p => p[1]));
  const byId = new Map(game.events.map(e => [e.id, e]));
  for (const [a, b] of pairs) if (byId.get(a).polarity !== byId.get(b).polarity)
    throw new TypeError('configuration symmetry changes game polarity');
  const precedes = new Set(game.precedence.map(p => orderedKey(...p)));
  for (const [a, b] of pairs) for (const [c, d] of pairs)
    if (precedes.has(orderedKey(a, c)) !== precedes.has(orderedKey(b, d)))
      throw new TypeError('configuration symmetry changes causal order');
  return Object.freeze({ kind: 'metrologic.configuration-isomorphism',
    domain: from, codomain: to,
    pairs: Object.freeze(pairs.map(p => Object.freeze([...p]))) });
}
