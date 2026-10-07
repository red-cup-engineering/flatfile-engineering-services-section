import { FOUR } from "@red-cup-engineering/computer-data-engineering-services-section/four";

function cellKey(subject, predicate, object) {
  return JSON.stringify([subject, predicate, object]);
}

export function value(store, subject, predicate, object) {
  const key = store.identityKey?.({ subject, predicate, object }) ?? cellKey(subject, predicate, object);
  return store.values.get(key) ?? FOUR.neither;
}

export function holds(store, subject, predicate, object) {
  const v = value(store, subject, predicate, object);
  return v.positiveEvidence;
}

// Positive graph reads use Belnap designation: both T and TOP remain
// visible. A contradiction is held evidence on both faces, not an excuse
// to make the relation disappear from navigation.
function designatedCells(store) {
  return store.order.filter((cell) => holds(store, cell.subject, cell.predicate, cell.object));
}

export function cellsAt(store, subject) {
  return designatedCells(store).filter((cell) => cell.subject === subject);
}

export function subjectsWith(store, predicate, object) {
  const out = new Set();
  for (const cell of designatedCells(store)) {
    if (cell.predicate === predicate && cell.object === object) out.add(cell.subject);
  }
  return out;
}

export function inEdges(store, slug, { predicates = null } = {}) {
  const predicateSet = predicates === null ? null : new Set(predicates);
  return designatedCells(store).filter(
    (cell) => cell.object === slug && (predicateSet === null || predicateSet.has(cell.predicate))
  );
}

export function outEdges(store, slug, { predicates = null } = {}) {
  const predicateSet = predicates === null ? null : new Set(predicates);
  return designatedCells(store).filter(
    (cell) => cell.subject === slug && (predicateSet === null || predicateSet.has(cell.predicate))
  );
}

// Typed-relation graph as a plain object. "subject-keyed" gives each
// subject its list of objects (depends_on[slug] semantics); "object-keyed"
// gives the reverse (dependents[slug]).
export function relationMap(store, predicate, { direction = "subject-keyed" } = {}) {
  if (direction !== "subject-keyed" && direction !== "object-keyed") {
    throw new Error(`direction must be "subject-keyed" or "object-keyed"; got ${direction}`);
  }
  const out = {};
  for (const cell of designatedCells(store)) {
    if (cell.predicate !== predicate) continue;
    const [key, item] = direction === "subject-keyed" ? [cell.subject, cell.object] : [cell.object, cell.subject];
    (out[key] ??= []).push(item);
  }
  return out;
}


