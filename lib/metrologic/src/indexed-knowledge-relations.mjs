/**
 * Metrologic — finite sparse FOUR knowledge-quantale relations.
 *
 * Rows and columns are SOURCE POSITIONS (finite cardinalities). Positive and
 * negative incidences are independent index pairs, not content addresses or
 * judgments of Mark identity. All cross-carrier correspondence is explicitly
 * supplied as a bijection by the caller. No host effects.
 *
 * From Data FOUR: joinK/meetK operate as OR/AND in each Boolean evidence
 * coordinate; their finite relation adjoints are universal quantifications.
 * This is NOT truth-order twist fusion or certified ChuMap composition.
 */
export const indexedKnowledgeRelationKind = "metrologic.indexedKnowledgeRelation.v1";
// Only immutable, source-owned normal forms use the fast execution path.
// Rehydrated wire values are admitted by the same constructor before use.
const normalized = new WeakSet();

function cardinality(value, label) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError(label + " must be a nonnegative finite cardinal");
  return value;
}
function position(value, size, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= size)
    throw new RangeError(label + " must name an original source position");
  return value;
}
function encode(row, col, width) { return row * width + col; }
function decode(key, width) { return [Math.floor(key / width), key % width]; }
function normalizedPairs(pairs, rows, cols, label) {
  if (!Array.isArray(pairs)) throw new TypeError(label + " must be an incidence list");
  const found = new Set();
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(pair, "0") ?? {}, "value") ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(pair, "1") ?? {}, "value"))
      throw new TypeError(label + " needs two original positional data members");
    found.add(encode(position(pair[0], rows, label + ".row"),
      position(pair[1], cols, label + ".column"), cols));
  }
  return Object.freeze([...found].sort((a,b)=>a-b).map(n => Object.freeze(decode(n, cols))));
}

/** Materialize one portable pure relation; arrays rather than Set internals
 * prevent later mutation of the supplied mathematical object. */
export function indexedKnowledgeRelation(rows, cols, positive = [], negative = []) {
  cardinality(rows, "rows"); cardinality(cols, "columns");
  if (!Number.isSafeInteger(rows * cols))
    throw new RangeError("indexed relation exceeds the exact finite address space");
  const result = Object.freeze({
    kind: indexedKnowledgeRelationKind, rows, cols,
    positive: normalizedPairs(positive, rows, cols, "positive"),
    negative: normalizedPairs(negative, rows, cols, "negative"),
  });
  normalized.add(result);
  return result;
}
function requireRelation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      value.kind !== indexedKnowledgeRelationKind ||
      !Array.isArray(value.positive) || !Array.isArray(value.negative))
    throw new TypeError("Metrologic needs one indexed knowledge relation");
  if (normalized.has(value)) return value;
  // A foreign JSON value does not acquire source-owned immutable identity by
  // claiming the kind field. Rebuild its entire finite positional meaning.
  const accepted = indexedKnowledgeRelation(value.rows, value.cols, value.positive, value.negative);
  for (const lane of ["positive", "negative"]) {
    const supplied = value[lane], projected = accepted[lane];
    if (supplied.length !== projected.length ||
        supplied.some((pair, i) => pair[0] !== projected[i][0] || pair[1] !== projected[i][1]))
      throw new TypeError("indexed knowledge relation must be a canonical positional presentation");
  }
  return accepted;
}

/** Each source position corresponds to exactly one target position.
 * No shared string value or coincident CBOR surface grants a mapping. */
function bijection(sourceCount, targetCount, map, label) {
  if (sourceCount !== targetCount || !Array.isArray(map) ||
      map.length !== sourceCount ||
      map.some(x => !Number.isSafeInteger(x) || x < 0 || x >= targetCount) ||
      new Set(map).size !== targetCount)
    throw new TypeError(label + " requires an explicit positional bijection");
  return map;
}
function laneRelation(rows, cols, positive, negative) {
  return indexedKnowledgeRelation(rows, cols, positive, negative);
}
function laneSet(pairs, width) {
  return new Set(pairs.map(([r,c])=>encode(r,c,width)));
}
function laneCompose(A, B, middle, lane) {
  const byMid = new Map();
  for (const [r,c] of B[lane]) {
    const cols=byMid.get(r) ?? [];cols.push(c);byMid.set(r,cols);
  }
  const evidence=new Set();
  for (const [r,j] of A[lane])
    for (const c of byMid.get(middle[j]) ?? [])
      evidence.add(encode(r,c,B.cols));
  return [...evidence].map(n=>decode(n,B.cols));
}
/** (A·W)(r,c) = ⋁ₖ_j (A(r,j) ∧ₖ W(j,c)), both evidence lanes. */
export function composeIndexedKnowledgeRelations(left, right, middleMap) {
  const A=requireRelation(left),B=requireRelation(right);
  const middle=bijection(A.cols,B.rows,middleMap,"relation composition");
  return laneRelation(A.rows,B.cols,
    laneCompose(A,B,middle,"positive"),laneCompose(A,B,middle,"negative"));
}
function laneLeftResidual(A,B,rows,lane) {
  const supports=new Map();
  for(const [r,j] of A[lane]){const members=supports.get(j)??[];members.push(r);supports.set(j,members);}
  const held=laneSet(B[lane],B.cols),out=[];
  for(let j=0;j<A.cols;j++)for(let c=0;c<B.cols;c++) {
    if((supports.get(j)??[]).every(r=>held.has(encode(rows[r],c,B.cols))))
      out.push([j,c]);
  }
  return out;
}
/** A\\B is the greatest W satisfying A·W ≤ₖ B. */
export function leftResidualIndexedKnowledgeRelation(left, bound, rowMap) {
  const A=requireRelation(left),B=requireRelation(bound);
  const rows=bijection(A.rows,B.rows,rowMap,"left residual");
  return laneRelation(A.cols,B.cols,laneLeftResidual(A,B,rows,"positive"),
    laneLeftResidual(A,B,rows,"negative"));
}
function laneRightResidual(B,W,cols,lane) {
  const supports=new Map();
  for(const [j,c] of W[lane]){const members=supports.get(j)??[];members.push(c);supports.set(j,members);}
  const held=laneSet(B[lane],B.cols),out=[];
  for(let r=0;r<B.rows;r++)for(let j=0;j<W.rows;j++) {
    if((supports.get(j)??[]).every(c=>held.has(encode(r,cols[c],B.cols))))
      out.push([r,j]);
  }
  return out;
}
/** B/W is the greatest A satisfying A·W ≤ₖ B. */
export function rightResidualIndexedKnowledgeRelation(bound, right, columnMap) {
  const B=requireRelation(bound),W=requireRelation(right);
  const cols=bijection(W.cols,B.cols,columnMap,"right residual");
  return laneRelation(B.rows,W.rows,laneRightResidual(B,W,cols,"positive"),
    laneRightResidual(B,W,cols,"negative"));
}
function align(A,B,rowMap,colMap,label) {
  return [bijection(A.rows,B.rows,rowMap,label+" rows"),
    bijection(A.cols,B.cols,colMap,label+" columns")];
}
function laneMeet(A,B,rows,cols,lane) {
  const seen=laneSet(B[lane],B.cols);
  return A[lane].filter(([r,c])=>seen.has(encode(rows[r],cols[c],B.cols)));
}
export function meetIndexedKnowledgeRelations(left,right,rowMap,columnMap) {
  const A=requireRelation(left),B=requireRelation(right);
  const [rows,cols]=align(A,B,rowMap,columnMap,"relation meet");
  return laneRelation(A.rows,A.cols,laneMeet(A,B,rows,cols,"positive"),
    laneMeet(A,B,rows,cols,"negative"));
}
export function leqIndexedKnowledgeRelations(left,right,rowMap,columnMap) {
  const A=requireRelation(left),B=requireRelation(right);
  const [rows,cols]=align(A,B,rowMap,columnMap,"relation order");
  for(const lane of ["positive","negative"]){
    const seen=laneSet(B[lane],B.cols);
    if(!A[lane].every(([r,c])=>seen.has(encode(rows[r],cols[c],B.cols))))
      return false;
  }
  return true;
}
