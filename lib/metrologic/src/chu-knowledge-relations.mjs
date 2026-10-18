/**
 * Finite Chu matrix view of the ONE Metrologic sparse FOUR knowledge algebra.
 *
 * All composition/residual/meet/order laws are in indexed-knowledge-relations;
 * this projects existing Chu carriers into finite source positions and back.
 * A source position, a displayed Mark and a content NI are NOT the same type.
 * Knowledge-quantale composition is distinct from truth-order linear fusion.
 */
import { chuSpace, isChuSpace } from "./chu.mjs";
import { knowledgeBottom, sidesOfReading, readingAs, readingOfSides }
  from "@red-cup-engineering/computer-data-engineering-services-section/four";
import {
  indexedKnowledgeRelation, composeIndexedKnowledgeRelations,
  leftResidualIndexedKnowledgeRelation, rightResidualIndexedKnowledgeRelation,
  meetIndexedKnowledgeRelations, leqIndexedKnowledgeRelations,
} from "./indexed-knowledge-relations.mjs";

const bottom = knowledgeBottom();
function requireSpace(space) {
  if (!isChuSpace(space) || !Array.isArray(space.points) ||
      !Array.isArray(space.states) || !Array.isArray(space.matrix) ||
      typeof space.samePoint !== "function" || typeof space.sameState !== "function" ||
      space.matrix.length !== space.points.length ||
      space.matrix.some(row => !Array.isArray(row) || row.length !== space.states.length))
    throw new TypeError("knowledge relation requires a native finite FOUR Chu space");
  return space;
}

/** Match finite coordinates independent of order. Neither side may impose
 * an unagreed identification on the other party's presented carrier. */
function alignedIndices(left, right, sameLeft, sameRight, label) {
  if (left.length !== right.length)
    throw new TypeError(label + ": source and target carriers differ");
  const used = new Set(), indices = [];
  for (const term of left) {
    const candidates = [];
    for (let i = 0; i < right.length; i++) {
      if (sameLeft(term, right[i]) && sameLeft(right[i], term) &&
          sameRight(term, right[i]) && sameRight(right[i], term)) candidates.push(i);
    }
    if (candidates.length !== 1 || used.has(candidates[0]))
      throw new TypeError(label + ": no unique mutually admitted carrier coordinate");
    used.add(candidates[0]);
    indices.push(candidates[0]);
  }
  return indices;
}

/** Use the original Chu constructor, retaining the source positional
 * equality contracts rather than inventing a second FOUR matrix type. */
function matrixSpace(points, states, matrix, samePoint, sameState) {
  // The Chu constructor replays the exact points/states supplied here. Use
  // identity-indexed positional lookups, falling back to explicit comparison
  // for two source presentations (notably +0/-0) sharing a Map key.
  const pointIndex = new Map(points.map((p, i) => [p, i]));
  const stateIndex = new Map(states.map((s, i) => [s, i]));
  const locate = (index, carrier, same, value) => {
    const found = index.get(value);
    return found !== undefined && same(carrier[found], value)
      ? found : carrier.findIndex(p => same(p, value));
  };
  return chuSpace(points, states, (point, state) =>
    matrix[locate(pointIndex, points, samePoint, point)][locate(stateIndex, states, sameState, state)],
    { samePoint, sameState, absent: bottom });
}

/** (A·B)(r,c) = joinK_j meetK(A(r,j), B(j,c)).
 * This is NOT a witnessed causal arrow, rule license or external act. */
/** Read two separately told evidence lanes without inventing a mathematical
 * identity based on equal spellings of Marks or equivalent content addresses. */
function toIndexed(space) {
  const positive=[], negative=[];
  for(let r=0;r<space.points.length;r++)for(let c=0;c<space.states.length;c++){
    const [p,n]=sidesOfReading(readingAs("knowledge",space.matrix[r][c]));
    if(p)positive.push([r,c]);
    if(n)negative.push([r,c]);
  }
  return indexedKnowledgeRelation(space.points.length,space.states.length,positive,negative);
}
/** Restore the view through the one native Chu constructor. */
function fromIndexed(result,points,states,samePoint,sameState){
  const width=states.length;
  const encode=(r,c)=>r*width+c;
  const positive=new Set(result.positive.map(([r,c])=>encode(r,c)));
  const negative=new Set(result.negative.map(([r,c])=>encode(r,c)));
  // Preserve +0 / -0 and other source distinguished values: a fast Map key
  // is merely an index hint, never the equality proof.
  const rows=new Map(points.map((p,i)=>[p,i]));
  const columns=new Map(states.map((p,i)=>[p,i]));
  const position=(index,items,same,term)=>{
    const located=index.get(term);
    return located!==undefined&&same(items[located],term)
      ?located:items.findIndex(item=>same(item,term));
  };
  return chuSpace(points,states,(point,state)=>{
    const r=position(rows,points,samePoint,point),c=position(columns,states,sameState,state);
    return readingOfSides("knowledge",positive.has(encode(r,c)),negative.has(encode(r,c)));
  },{absent:bottom,samePoint,sameState});
}

export function composeKnowledgeRelations(left,right){
  const A=requireSpace(left), B=requireSpace(right);
  return fromIndexed(
    composeIndexedKnowledgeRelations(toIndexed(A),toIndexed(B),
      alignedIndices(A.states,B.points,A.sameState,B.samePoint,"relation composition")),
    A.points,B.states,A.samePoint,B.sameState);
}
export function leftResidualKnowledgeRelation(left,bound){
  const A=requireSpace(left), B=requireSpace(bound);
  return fromIndexed(leftResidualIndexedKnowledgeRelation(toIndexed(A),toIndexed(B),
    alignedIndices(A.points,B.points,A.samePoint,B.samePoint,"left residual")),
    A.states,B.states,A.sameState,B.sameState);
}
export function rightResidualKnowledgeRelation(bound,right){
  const B=requireSpace(bound), W=requireSpace(right);
  return fromIndexed(rightResidualIndexedKnowledgeRelation(toIndexed(B),toIndexed(W),
    alignedIndices(W.states,B.states,W.sameState,B.sameState,"right residual")),
    B.points,W.points,B.samePoint,W.samePoint);
}
export function meetKnowledgeRelations(left,right){
  const A=requireSpace(left), B=requireSpace(right);
  return fromIndexed(meetIndexedKnowledgeRelations(toIndexed(A),toIndexed(B),
    alignedIndices(A.points,B.points,A.samePoint,B.samePoint,"relation meet rows"),
    alignedIndices(A.states,B.states,A.sameState,B.sameState,"relation meet states")),
    A.points,A.states,A.samePoint,A.sameState);
}
export function leqKnowledgeRelations(left,right){
  const A=requireSpace(left), B=requireSpace(right);
  return leqIndexedKnowledgeRelations(toIndexed(A),toIndexed(B),
    alignedIndices(A.points,B.points,A.samePoint,B.samePoint,"relation order rows"),
    alignedIndices(A.states,B.states,A.sameState,B.sameState,"relation order states"));
}
