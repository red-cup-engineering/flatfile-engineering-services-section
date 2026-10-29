#!/usr/bin/env node
import { rowId } from "@red-cup-engineering/eavt";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Counts the witnesses and acknowledgers of one entity's asserted cells, read from rows about each claim row's content id.
 * @param {object} request A record with rows, an entity, and an optional attribute.
 * @returns {object} An EavtCellDispositions record.
 * @throws {TypeError} When entity is not a non-empty string or rows is not an array.
 */
export function countEavtCellDispositions(request) {
  if (typeof request?.entity !== "string" || request.entity.length === 0 || !Array.isArray(request?.rows)) {
    throw new TypeError("entity and rows are required");
  }
  const attribute = typeof request.attribute === "string" ? request.attribute : null;
  const about = new Map();
  for (const row of request.rows) {
    if (row.a !== "witnessed-by" && row.a !== "acknowledged-by") continue;
    if (!about.has(row.e)) about.set(row.e, { witnesses: new Set(), acknowledgers: new Set() });
    about.get(row.e)[row.a === "witnessed-by" ? "witnesses" : "acknowledgers"].add(String(row.v));
  }
  const claims = [];
  for (const row of request.rows) {
    if (row.e !== request.entity || row.a === "witnessed-by" || row.a === "acknowledged-by") continue;
    if (attribute !== null && row.a !== attribute) continue;
    const id = rowId(row);
    const dispositions = about.get(id) ?? { witnesses: new Set(), acknowledgers: new Set() };
    claims.push({ id, predicate: row.a, object: row.v, witnesses: [...dispositions.witnesses].sort(), acknowledgers: [...dispositions.acknowledgers].sort() });
  }
  return {
    type: "EavtCellDispositions",
    entity: request.entity,
    attribute,
    asserted: claims.length,
    wit: claims.reduce((sum, claim) => sum + 1 + claim.witnesses.length, 0),
    ack: claims.reduce((sum, claim) => sum + claim.acknowledgers.length, 0),
    claims,
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "count-eavt-cell-dispositions", description: "Counts the witnesses and acknowledgers of one entity's asserted cells, read from rows about each claim row's content id.", operation: countEavtCellDispositions }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
