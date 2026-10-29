#!/usr/bin/env node
import { listEntities, section, stratify } from "@red-cup-engineering/eavt";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Counts the entities and cells an eavt row array settles as contradicted.
 * @param {object} request A record with rows.
 * @returns {object} An EavtContestedCellsCount record.
 * @throws {TypeError} When rows is not an array.
 */
export function countEavtContestedCells(request) {
  if (!Array.isArray(request?.rows)) throw new TypeError("rows are required");
  const contested = [];
  const entities = listEntities(request.rows);
  const converse = request.rows.filter((row) => row.a === "has-converse");
  const byEntity = new Map();
  for (const row of request.rows) {
    if (!byEntity.has(row.e)) byEntity.set(row.e, []);
    byEntity.get(row.e).push(row);
  }
  for (const entity of entities) {
    const own = byEntity.get(entity) ?? [];
    const settled = section(stratify(entity, [...converse, ...own.filter((row) => row.a !== "has-converse")], { converse: {} }).settled);
    if (settled.contradicted.length === 0) continue;
    const cells = settled.contradicted.map((cell) => ({ predicate: cell.predicate, object: cell.object }));
    cells.sort((x, y) => `${x.predicate} ${x.object}`.localeCompare(`${y.predicate} ${y.object}`));
    contested.push({ entity, cells });
  }
  contested.sort((x, y) => x.entity.localeCompare(y.entity));
  return {
    type: "EavtContestedCellsCount",
    entities: entities.length,
    contestedEntities: contested.length,
    contestedCells: contested.reduce((sum, item) => sum + item.cells.length, 0),
    contested,
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "count-eavt-contested-cells", description: "Counts the entities and cells an eavt row array settles as contradicted.", operation: countEavtContestedCells }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
