import { existsSync } from "node:fs";
import { entities } from "./list-entities.mjs";
import { readEavtTrace } from "./read-eavt-trace.mjs";
import { sectionEavtEvidence } from "./section-eavt-evidence.mjs";
import { stratifyEavtEvidence } from "./stratify-eavt-evidence.mjs";

/**
 * Counts the cells an eavt row array settles as contradicted, entity by entity.
 * @param {{ rows: object[] }} request
 */
export function countEavtContestedCells(request) {
  if (!Array.isArray(request?.rows)) throw new TypeError("rows are required");
  const contested = [];
  const all = entities(request.rows);
  const converse = request.rows.filter((row) => row.a === "has-converse");
  const byEntity = new Map();
  for (const row of request.rows) {
    if (!byEntity.has(row.e)) byEntity.set(row.e, []);
    byEntity.get(row.e).push(row);
  }
  for (const entity of all) {
    if (typeof entity !== "string" || entity.length === 0) continue;
    const own = (byEntity.get(entity) ?? []).filter((row) => row.a !== "has-converse");
    const settled = sectionEavtEvidence({ folded: stratifyEavtEvidence({ subject: entity, rows: [...converse, ...own], converse: {} }).settled });
    if (settled.contradicted.length === 0) continue;
    const cells = settled.contradicted.map((cell) => ({ predicate: cell.predicate, object: cell.object }));
    cells.sort((x, y) => `${x.predicate} ${x.object}`.localeCompare(`${y.predicate} ${y.object}`));
    contested.push({ entity, cells });
  }
  contested.sort((x, y) => x.entity.localeCompare(y.entity));
  return {
    type: "EavtContestedCellsCount",
    entities: all.length,
    contestedEntities: contested.length,
    contestedCells: contested.reduce((sum, item) => sum + item.cells.length, 0),
    contested,
  };
}

/**
 * Reads one eavt trace file and counts the cells it settles as contradicted,
 * or reports the trace absent.
 * @param {{ trace: string }} request
 */
export function countEavtTraceContestedCells(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0) throw new TypeError("a non-empty trace is required");
  if (!existsSync(request.trace)) return { type: "EavtTraceAbsent", trace: request.trace };
  const rows = readEavtTrace({ path: request.trace }).rows;
  return { type: "EavtTraceContestedCellsCount", trace: request.trace, rows: rows.length, count: countEavtContestedCells({ rows }) };
}
