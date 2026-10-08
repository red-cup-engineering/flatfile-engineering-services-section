import { existsSync } from "node:fs";
import { readEavtTrace } from "./read-eavt-trace.mjs";
import { resolveEavtProofTree } from "./resolve-eavt-proof-tree.mjs";
import { sectionEavtEvidence } from "./section-eavt-evidence.mjs";
import { stratifyEavtEvidence } from "./stratify-eavt-evidence.mjs";

/**
 * Answers one cell question over an eavt row array: the entity's asserted and
 * saturated counts, its settled section, its proof tree, and the closure and
 * regime of the answer's fold.
 * @param {{ rows: object[], entity: string, attribute?: string }} request
 */
export function askEavtCell(request) {
  if (typeof request?.entity !== "string" || request.entity.length === 0 || !Array.isArray(request?.rows)) {
    throw new TypeError("entity and rows are required");
  }
  const attribute = typeof request.attribute === "string" ? request.attribute : null;
  const strata = stratifyEavtEvidence({ subject: request.entity, rows: request.rows, converse: {} });
  const settled = sectionEavtEvidence({ folded: strata.settled });
  const keep = (cells) => cells.filter((cell) => attribute === null || cell.predicate === attribute).map((cell) => ({ predicate: cell.predicate, object: cell.object }));
  const answer = { affirmed: keep(settled.affirmed), denied: keep(settled.denied), contradicted: keep(settled.contradicted) };
  return {
    type: "EavtCellAnswer",
    entity: request.entity,
    attribute,
    asserted: strata.asserted.filter((row) => attribute === null || row.a === attribute).length,
    saturated: strata.saturated.filter((row) => attribute === null || row.a === attribute).length,
    settled: answer,
    contested: answer.contradicted.length > 0,
    proofTree: resolveEavtProofTree({ rows: request.rows, root: request.entity }),
    closure: strata.closure,
    regime: strata.closure.regime,
  };
}

/**
 * Reads one eavt trace file and answers a cell question over its rows, or
 * reports the trace absent.
 * @param {{ trace: string, entity: string, attribute?: string }} request
 */
export function askEavtTraceCell(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0 || typeof request?.entity !== "string" || request.entity.length === 0) {
    throw new TypeError("a non-empty trace and entity are required");
  }
  if (!existsSync(request.trace)) return { type: "EavtTraceAbsent", trace: request.trace };
  const rows = readEavtTrace({ path: request.trace }).rows.filter((row) => row.e === request.entity || row.a === "has-converse");
  const answer = askEavtCell({ rows, entity: request.entity, attribute: request.attribute });
  return { type: "EavtTraceCellAnswer", trace: request.trace, rows: rows.length, answer };
}
