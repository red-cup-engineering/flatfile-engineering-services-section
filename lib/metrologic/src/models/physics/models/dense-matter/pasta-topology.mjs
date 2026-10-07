/**
 * models/dense-matter/pasta-topology - excursion-set topology.
 *
 * This captures `Obsmetrologia.Relational.DenseMatter.PastaTopology`:
 * finite cell complexes, density-threshold excursion subcomplexes, Euler
 * characteristic, anti-monotone filtrations, and triangle morphology witnesses.
 */

export function cellComplex(
  verts,
  edges,
  faces,
) {
  return Object.freeze({
    kind: "relational.denseMatter.pasta.cellComplex",
    verts: Object.freeze([...verts]),
    edges: Object.freeze(edges.map((edge) => Object.freeze([...edge]))),
    faces: Object.freeze(faces.map((face) => Object.freeze([...face]))),
  });
}

export function eulerChar(complex) {
  return complex.verts.length - complex.edges.length + complex.faces.length;
}

export function excVerts(complex, density, threshold) {
  return Object.freeze(complex.verts.filter((v) => threshold <= density(v)));
}

export function excEdges(complex, density, threshold) {
  return Object.freeze(complex.edges.filter(([a, b]) => threshold <= density(a) && threshold <= density(b)));
}

export function excFaces(complex, density, threshold) {
  return Object.freeze(complex.faces.filter(([a, b, c]) => threshold <= density(a) && threshold <= density(b) && threshold <= density(c)));
}

export function excEuler(complex, density, threshold) {
  return excVerts(complex, density, threshold).length - excEdges(complex, density, threshold).length + excFaces(complex, density, threshold).length;
}

function includesEvery(larger, smaller, same) {
  return smaller.every((item) => larger.some((candidate) => same(candidate, item)));
}

export function excursionFiltration(
  complex,
  density,
  lowThreshold,
  highThreshold,
) {
  if (lowThreshold > highThreshold) throw new TypeError("excursionFiltration: expected low threshold <= high threshold");
  const lowVerts = excVerts(complex, density, lowThreshold);
  const highVerts = excVerts(complex, density, highThreshold);
  const lowEdges = excEdges(complex, density, lowThreshold);
  const highEdges = excEdges(complex, density, highThreshold);
  const lowFaces = excFaces(complex, density, lowThreshold);
  const highFaces = excFaces(complex, density, highThreshold);
  const sameTuple = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
  if (!includesEvery(lowVerts, highVerts, (a, b) => a === b)
    || !includesEvery(lowEdges, highEdges, sameTuple)
    || !includesEvery(lowFaces, highFaces, sameTuple)) {
    throw new TypeError("excursionFiltration: high excursion is not nested in low excursion");
  }
  return Object.freeze({
    kind: "relational.denseMatter.pasta.excursion_filtration:witness",
    complex,
    lowThreshold,
    highThreshold,
    verticesNested: true,
    edgesNested: true,
    facesNested: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.DenseMatter.excVerts_anti",
      "Obsmetrologia.Relational.DenseMatter.excEdges_anti",
      "Obsmetrologia.Relational.DenseMatter.excFaces_anti",
    ]),
  });
}

export function filledTriangle() {
  return cellComplex([0, 1, 2], [[0, 1], [1, 2], [0, 2]], [[0, 1, 2]]);
}

export function hollowTriangle() {
  return cellComplex([0, 1, 2], [[0, 1], [1, 2], [0, 2]], []);
}

export function denseMatterPastaTopologyReceipt() {
  const density = () => 2;
  return Object.freeze({
    kind: "relational.denseMatter.pasta.receipt:witness",
    filtration: excursionFiltration(filledTriangle(), density, 1, 2),
    filledEuler: eulerChar(filledTriangle()),
    hollowEuler: eulerChar(hollowTriangle()),
    capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.PastaTopology",
  });
}
