import { RELATION_KEYS } from "../convention.mjs";
import { buildEdges } from "../substrate/store.mjs";

// A PredicationCell is nothing but its triple — subject/predicate/object,
// mirroring pymetrologic.predicating.PredicationCell: predication is
// irreducibly triadic, no fourth field bolted on for value, source, or
// line. What a cell is worth (T/F/BOT/TOP) lives in the store's knowledge
// state, keyed by this triple, never on the cell itself.
export function makeCell({ subject, predicate, object }) {
  return Object.freeze({ subject, predicate, object });
}

// Reduces the corpus's richer Tier A edges (which also carry source and
// line, for diagnostics) down to the bare triples the kernel reasons over:
// an edge's src/kind/dst becomes a cell's subject/predicate/object.
export function cellsFromEdges(edges) {
  return edges.map((edge) => makeCell({ subject: edge.src, predicate: edge.kind, object: edge.dst }));
}

// Derives fm/body edges from already-loaded notes and reduces them to
// PredicationCells — the pure half of the old root-to-cells pipeline. The
// disk read (substrate/read-flatfiles.mjs's loadFlatfiles) is the caller's
// job now: the notes it returns are a value the caller can pass, so this
// stays hull, no relative import of a kernel module. (Was async and took
// `root` + `excludes`, calling loadFlatfiles itself; a caller wanting the
// old one-call convenience gets the same result via
// `loadCells((await loadFlatfiles(root, { excludes })).notes, options)`.)
export function loadCells(notes, { sources, relationKeys = RELATION_KEYS } = {}) {
  const edges = buildEdges(notes, { sources, relationKeys });
  return { cells: cellsFromEdges(edges) };
}


