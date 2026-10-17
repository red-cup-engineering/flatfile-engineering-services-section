/**
 * Finite preorder and its Alexandrov downset Heyting algebra.
 *
 * This is mathematics on a caller-admitted FINITE INDEX carrier, not a Mark
 * identity mechanism, an NI address, a graph of independently given things, or
 * proof that the originating articulation generated these relations.
 * SignCell converts its admitted content-coincidence positions to indices;
 * the mathematical source never reads their schema, canonical bytes or evidence.
 */
import { createGraph, reachable, stronglyConnectedComponents } from "../graphs/directed-multigraph.mjs";

const frames = new WeakSet();
const frozen = (items) => Object.freeze([...items]);
const sort = (a, b) => a - b;
const position = (frame, index) => {
  if (!Number.isSafeInteger(index) || index < 0 || index >= frame.size)
    throw new RangeError("finite preorder: index lies outside its admitted carrier");
  return index;
};
const requireFrame = (frame) => {
  if (!frames.has(frame)) throw new TypeError("finite preorder: use finitePreorder to admit a frame");
  return frame;
};

/** Reflexive-transitive closure of admitted index pairs. Neither the indices
 * nor mutual reachability are assertions of observational equality of Marks. */
export function finitePreorder(size, arrows = []) {
  if (!Number.isSafeInteger(size) || size < 0)
    throw new RangeError("finite preorder: size must be a nonnegative safe integer");
  if (!Array.isArray(arrows)) throw new TypeError("finite preorder: arrows must be index pairs");
  // Translate numerical positions into Metrologic's existing finite directed
  // graph. No content address, Mark comparison or external resource is admitted.
  const nodes = Array.from({ length: size }, (_, index) => ({ id: String(index) }));
  for (const arrow of arrows) {
    if (!Array.isArray(arrow) || arrow.length !== 2 ||
        !arrow.every((index) => Number.isSafeInteger(index) && index >= 0 && index < size))
      throw new RangeError("finite preorder: arrow lies outside its admitted carrier");
  }
  const graph = createGraph({
    nodes,
    edges: arrows.map(([from, to]) => ({ from: String(from), to: String(to) })),
  });
  // reachable reports nonempty graph paths; the preorder additionally
  // includes each position reflexively, even for isolated vertices.
  const up = nodes.map(({ id }) =>
    frozen([...new Set([id, ...reachable(graph, id)])].map(Number).sort(sort)));
  const down = Array.from({ length: size }, () => []);
  for (let i = 0; i < size; i++) for (const j of up[i]) down[j].push(i);
  const identified = stronglyConnectedComponents(graph)
    .map((group) => group.map(Number).sort(sort))
    .filter((group) => group.length > 1)
    .sort((left, right) => left[0] - right[0])
    .map(frozen);
  const frame = Object.freeze({
    kind: "metrologic.finite-preorder",
    size,
    up: frozen(up),
    down: frozen(down.map((row) => frozen(row))),
    identified: frozen(identified),
  });
  frames.add(frame);
  return frame;
}

/** Relative preorder reachability, not opaque Mark equality. */
export function relates(frame, source, target) {
  requireFrame(frame);
  return frame.up[position(frame, source)].includes(position(frame, target));
}
export const upward = (frame, index) => requireFrame(frame).up[position(frame, index)];
export const downward = (frame, index) => requireFrame(frame).down[position(frame, index)];
export const topDownset = (frame) => frozen(Array.from({ length: requireFrame(frame).size }, (_, i) => i));
export const bottomDownset = () => frozen([]);

/** Admit an Alexandrov open, a subset closed under all admitted specializations.
 * The missingIndex names a concrete finite-index obstruction, for an owning
 * caller to present using its own typed carrier without leaking Mark content. */
export function admitDownset(frame, candidates) {
  requireFrame(frame);
  if (!Array.isArray(candidates)) throw new TypeError("finite preorder: an open must be an array");
  const selected = new Set(candidates.map((i) => position(frame, i)));
  for (const i of selected) for (const predecessor of frame.down[i]) {
    if (!selected.has(predecessor)) {
      const error = new TypeError("finite preorder: an open must hold every specialization");
      error.missingIndex = predecessor;
      throw error;
    }
  }
  return frozen([...selected].sort(sort));
}
export function principalDownset(frame, index) {
  return downward(frame, index);
}
export function downsetWithin(frame, left, right) {
  const container = new Set(admitDownset(frame, right));
  return admitDownset(frame, left).every((index) => container.has(index));
}
/** Empty meet is top; empty join is bottom. */
export function meetDownsets(frame, ...opens) {
  const admitted = opens.map((value) => new Set(admitDownset(frame, value)));
  return frozen(topDownset(frame).filter((index) => admitted.every((set) => set.has(index))));
}
export function joinDownsets(frame, ...opens) {
  const selected = new Set();
  for (const open of opens) for (const index of admitDownset(frame, open)) selected.add(index);
  return frozen([...selected].sort(sort));
}
/** U ⇒ V = {x | ↓x ∩ U ⊆ V}, right adjoint of intersection with U. */
export function impliesDownsets(frame, antecedent, consequent) {
  const left = new Set(admitDownset(frame, antecedent));
  const right = new Set(admitDownset(frame, consequent));
  return frozen(topDownset(frame).filter((index) =>
    frame.down[index].every((special) => !left.has(special) || right.has(special))));
}
export const negateDownset = (frame, open) => impliesDownsets(frame, open, bottomDownset());
