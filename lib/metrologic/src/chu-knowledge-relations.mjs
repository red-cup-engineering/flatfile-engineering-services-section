/**
 * Finite FOUR-valued relation algebra on native Metrologic Chu matrices.
 *
 * This is the KNOWLEDGE quantale (joinK, meetK, implyK), not
 * truth-order linear fusion nor ChuMap composition. A middle carrier must
 * have an explicit bijection under BOTH source equality contracts.
 * Mark-surface coincidence alone never supplies observational identity.
 *
 * Obsmetrologia/Calculus/Logic/LinearLogicChu.lean supplies the Chu carrier;
 * Computer Data FOUR supplies its knowledge lattice. This finite relational
 * lifting remains a distinct mathematical construction.
 */
import { chuSpace, isChuSpace } from "./chu.mjs";
import {
  knowledgeBottom, knowledgeTop, knowledgeJoinReading,
  knowledgeMeetReading, knowledgeImplyReading, knowledgeLeqReading,
} from "@red-cup-engineering/computer-data-engineering-services-section/four";

const bottom = knowledgeBottom();
const top = knowledgeTop();

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
  return chuSpace(points, states, (point, state) => {
    const row = points.findIndex(p => samePoint(p, point));
    const col = states.findIndex(s => sameState(s, state));
    return matrix[row][col];
  }, { samePoint, sameState, absent: bottom });
}

/** (A·B)(r,c) = joinK_j meetK(A(r,j), B(j,c)).
 * This is NOT a witnessed causal arrow, rule license or external act. */
export function composeKnowledgeRelations(left, right) {
  const A = requireSpace(left), B = requireSpace(right);
  const mid = alignedIndices(A.states, B.points, A.sameState, B.samePoint, "relation composition");
  const matrix = A.points.map((_, i) => B.states.map((_, k) => {
    let reading = bottom;
    for (let j = 0; j < mid.length; j++) {
      reading = knowledgeJoinReading(reading,
        knowledgeMeetReading(A.matrix[i][j], B.matrix[mid[j]][k]));
      if (reading === top) break;
    }
    return reading;
  }));
  return matrixSpace(A.points, B.states, matrix, A.samePoint, B.sameState);
}

/** Right adjoint to left multiplication by A:
 * (A \ B)(j,c) = meetK_r (A(r,j) implyK B(r,c)).
 * The empty meet is knowledge TOP (both lanes), not positive evidence. */
export function leftResidualKnowledgeRelation(left, bound) {
  const A = requireSpace(left), B = requireSpace(bound);
  const rows = alignedIndices(A.points, B.points, A.samePoint, B.samePoint, "left residual");
  const matrix = A.states.map((_, j) => B.states.map((_, k) => {
    let reading = top;
    for (let i = 0; i < rows.length; i++) {
      reading = knowledgeMeetReading(reading,
        knowledgeImplyReading(A.matrix[i][j], B.matrix[rows[i]][k]));
      if (reading === bottom) break;
    }
    return reading;
  }));
  return matrixSpace(A.states, B.states, matrix, A.sameState, B.sameState);
}

/** Right adjoint to right multiplication by W:
 * (B / W)(r,j) = meetK_c (W(j,c) implyK B(r,c)). */
export function rightResidualKnowledgeRelation(bound, right) {
  const B = requireSpace(bound), W = requireSpace(right);
  const cols = alignedIndices(W.states, B.states, W.sameState, B.sameState, "right residual");
  const matrix = B.points.map((_, i) => W.points.map((_, j) => {
    let reading = top;
    for (let k = 0; k < cols.length; k++) {
      reading = knowledgeMeetReading(reading,
        knowledgeImplyReading(W.matrix[j][k], B.matrix[i][cols[k]]));
      if (reading === bottom) break;
    }
    return reading;
  }));
  return matrixSpace(B.points, W.points, matrix, B.samePoint, W.samePoint);
}

function alignSpaces(left, right, label) {
  const A = requireSpace(left), B = requireSpace(right);
  return {
    A, B,
    rows: alignedIndices(A.points, B.points, A.samePoint, B.samePoint, label + " rows"),
    cols: alignedIndices(A.states, B.states, A.sameState, B.sameState, label + " states"),
  };
}

/** Meet and order of matrices in the pointwise KNOWLEDGE lattice. */
export function meetKnowledgeRelations(left, right) {
  const { A, B, rows, cols } = alignSpaces(left, right, "relation meet");
  const matrix = A.points.map((_, i) => A.states.map((_, j) =>
    knowledgeMeetReading(A.matrix[i][j], B.matrix[rows[i]][cols[j]])));
  return matrixSpace(A.points, A.states, matrix, A.samePoint, A.sameState);
}

export function leqKnowledgeRelations(left, right) {
  const { A, B, rows, cols } = alignSpaces(left, right, "relation order");
  return A.points.every((_, i) => A.states.every((_, j) =>
    knowledgeLeqReading(A.matrix[i][j], B.matrix[rows[i]][cols[j]])));
}
