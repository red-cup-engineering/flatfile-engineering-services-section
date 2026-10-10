/**
 * closure/witness-state - log-to-state fold law.
 *
 * A statement log is the source. A state view is a sufficient statistic for a
 * declared query class: functional attributes keep the latest witnessed value;
 * all other attributes accumulate distinct witnessed values.
 *
 * The fold IS a join: `closeStateView` runs the log through the ordinal
 * closure engine as a join-semilattice process, so the law is order-independent
 * (commutative, associative, idempotent) and certified — the returned closure result
 * holds the engine's stabilization witness, not a convention. Two consequences
 * distinguish it from the prior hand fold:
 *
 * - accumulated value sets project in canonical order, not witness-arrival
 *   order (a join has no arrival order);
 * - a functional attribute witnessed with distinct values at the same maximal
 *   time is a HELD contradiction, not a silent first-writer-wins: the tie is
 *   kept as a cell told both ways (each tied value is asserted, and denied by the
 *   others under the functional law), and the designated readout is the
 *   canonical-maximal tied value — deterministic under log permutation.
 *
 * `projectStateView` remains the designated lens on that settlement.
 */
import { canonicalStatementValue } from "@red-cup-engineering/eavt-services-section/statement";
import { mark } from "@red-cup-engineering/signcell/utterance";
import { closeOrdinalProcess, closureProcess, closureReadout, stabilizingSup } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";

/** One functional-attribute cell held as a standing contradiction by the fold. */

/** A finite readout of the engine's stabilization judgment. */

/** The settled log-to-state fold: designated view, held cells, engine closure result. */

/** The internal join-semilattice state object of the fold. */

const emptyAccum = Object.freeze({ entities: new Map() });

function joinFunctionalCell(left, right) {
  if (left.time > right.time) return left;
  if (right.time > left.time) return right;
  if (left.values === right.values) return left;
  const values = new Map(left.values);
  for (const [key, value] of right.values) values.set(key, value);
  return { time: left.time, timeValue: left.timeValue, values };
}

function joinEntityAccum(left, right) {
  const functional = new Map(left.functional);
  for (const [attribute, cell] of right.functional) {
    const prior = functional.get(attribute);
    functional.set(attribute, prior === undefined ? cell : joinFunctionalCell(prior, cell));
  }
  const sets = new Map(left.sets);
  for (const [attribute, values] of right.sets) {
    const prior = sets.get(attribute);
    if (prior === undefined) {
      sets.set(attribute, values);
      continue;
    }
    const merged = new Map(prior);
    for (const [key, value] of values) merged.set(key, value);
    sets.set(attribute, merged);
  }
  return { functional, sets };
}

function joinAccum(left, right) {
  if (left.entities.size === 0) return right;
  if (right.entities.size === 0) return left;
  const entities = new Map(left.entities);
  for (const [key, entry] of right.entities) {
    const prior = entities.get(key);
    entities.set(key, prior === undefined
      ? entry
      : { entity: prior.entity, accum: joinEntityAccum(prior.accum, entry.accum) });
  }
  return { entities };
}

function functionalCellEq(left, right) {
  if (left.time !== right.time || left.values.size !== right.values.size) return false;
  for (const key of left.values.keys()) if (!right.values.has(key)) return false;
  return true;
}

function entityAccumEq(left, right) {
  if (left.functional.size !== right.functional.size || left.sets.size !== right.sets.size) return false;
  for (const [attribute, cell] of left.functional) {
    const other = right.functional.get(attribute);
    if (other === undefined || !functionalCellEq(cell, other)) return false;
  }
  for (const [attribute, values] of left.sets) {
    const other = right.sets.get(attribute);
    if (other === undefined || other.size !== values.size) return false;
    for (const key of values.keys()) if (!other.has(key)) return false;
  }
  return true;
}

function accumEq(left, right) {
  if (left.entities.size !== right.entities.size) return false;
  for (const [key, entry] of left.entities) {
    const other = right.entities.get(key);
    if (other === undefined || !entityAccumEq(entry.accum, other.accum)) return false;
  }
  return true;
}

function rowAtom(row, functional) {
  const entityKey = canonicalStatementValue(row.e);
  // String attributes keep their bare form (existing feeds stay byte-stable);
  // non-string attributes take the same canonical keying entities already
  // have, instead of collapsing to one "[object Object]" key.
  const attribute = typeof row.a === "string" ? row.a : canonicalStatementValue(row.a);
  const valueKey = canonicalStatementValue(row.v);
  const accum = functional.has(attribute)
    ? {
      functional: new Map([[attribute, {
        time: canonicalStatementValue(row.t),
        timeValue: row.t,
        values: new Map([[valueKey, row.v]]),
      }]]),
      sets: new Map(),
    }
    : { functional: new Map(), sets: new Map([[attribute, new Map([[valueKey, row.v]])]]) };
  return { entities: new Map([[entityKey, { entity: row.e, accum }]]) };
}

function canonicalSortedValues(values) {
  return Object.freeze([...values.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)).map(([, value]) => value));
}

/** Each tied value is asserted by its witness and told against, under the functional
 *  law, by every co-witnessed distinct value — so a tie reads stable (told both ways),
 *  a lone value potential. */
function heldCellReading(values) {
  return values.length > 1 ? "stable" : "potential";
}

const byKey = ([left], [right]) =>
  left < right ? -1 : left > right ? 1 : 0;

function accumView(accum) {
  const view = {};
  const held = [];
  // Entities and attributes project in canonical key order: the view is a join
  // readout, so its bytes must not remember witness-arrival order.
  for (const [entityKey, entry] of [...accum.entities.entries()].sort(byKey)) {
    const entityView = {};
    for (const [attribute, cell] of [...entry.accum.functional.entries()].sort(byKey)) {
      const values = canonicalSortedValues(cell.values);
      // Designated readout: the canonical-maximal tied value (deterministic
      // under log permutation); a genuine tie is additionally held as a both.
      entityView[attribute] = values[values.length - 1];
      if (values.length > 1) {
        held.push(Object.freeze({
          kind: "closure.witness-state.heldCell",
          entity: entry.entity,
          attribute,
          time: cell.timeValue,
          values,
          reading: heldCellReading(values),
        }));
      }
    }
    for (const [attribute, values] of [...entry.accum.sets.entries()].sort(byKey)) entityView[attribute] = canonicalSortedValues(values);
    view[entityKey] = Object.freeze(entityView);
  }
  return { view: Object.freeze(view), held };
}

/** The fold's zero element — one row admitted from bottom. Exposed so a host
 *  boundary can run the same incremental step over a row source this pure
 *  module never reads itself (a streamed file, a paginated query). */
export const initialStateAccum = emptyAccum;

/** One incremental fold step: admit a single row into an accumulator. Calling
 *  this once per row from any source (a resident array, an async stream, a
 *  sync line-by-line reader) is definitionally the same fold `closeStateView`
 *  runs internally, because the join is commutative/associative/idempotent —
 *  there is no other admission order to get wrong. */
export function foldStateAccumRow(accum, row, functional) {
  return joinAccum(accum, rowAtom(row, functional));
}

/** Finalize an accumulated fold through the ordinal closure engine — the tail
 *  half of `closeStateView`, split out so any caller that built its own
 *  `StateAccum` by repeated `foldStateAccumRow` (streamed, chunked, or
 *  otherwise) reaches the same certified settlement without re-deriving the
 *  engine wiring. */
export function closeStateAccum(atoms) {
  const lattice = {
    bottom: emptyAccum,
    leq: (left, right) => accumEq(joinAccum(left, right), right),
    join: joinAccum,
    eq: accumEq,
    sup: stabilizingSup({ eq: accumEq }),
  };
  // Joining a fixed atom set preserves directed joins: the fold is Scott-continuous.
  const closure = closeOrdinalProcess(closureProcess(lattice, (value) => joinAccum(value, atoms), undefined, true));
  const { view, held } = accumView(closure.value);
  return Object.freeze({
    kind: "closure.witness-state.settlement",
    view,
    held: Object.freeze(held),
    readout: closureReadout(closure),
    closure,
  });
}

/**
 * Settle a statement log to its state view through the ordinal closure engine.
 *
 * The log's rows join once into an atom lattice element; the closure process
 * `S ↦ S ∨ atoms` is run from bottom by `closeOrdinalProcess`, whose
 * stabilization witness certifies the fold is the least fixed point of the
 * absorption law rather than an arrival-order artifact.
 */
export function closeStateView(log, functional) {
  let atoms = initialStateAccum;
  for (const row of log) atoms = foldStateAccumRow(atoms, row, functional);
  return closeStateAccum(atoms);
}

/** The designated lens on the settled fold: the state view alone. */
export function projectStateView(log, functional) {
  return closeStateView(log, functional).view;
}

/**
 * Settle a statement log to its state view from an async row source.
 *
 * Identical fold to `closeStateView` (`foldStateAccumRow` per row,
 * `closeStateAccum` to finalize) — the only difference is admitting rows one
 * at a time from an async iterable instead of a resident array. The atoms
 * accumulator stays O(distinct entities × attributes), never O(rows), so a
 * source with unbounded row count (a streamed multi-hundred-MB log) settles in
 * bounded memory.
 */
export async function closeStateViewAsync(
  log,
  functional,
) {
  let atoms = initialStateAccum;
  for await (const row of log) atoms = foldStateAccumRow(atoms, row, functional);
  return closeStateAccum(atoms);
}

/** The designated async lens: the state view alone, folded from a streamed source. */
export async function projectStateViewAsync(log, functional) {
  return (await closeStateViewAsync(log, functional)).view;
}
