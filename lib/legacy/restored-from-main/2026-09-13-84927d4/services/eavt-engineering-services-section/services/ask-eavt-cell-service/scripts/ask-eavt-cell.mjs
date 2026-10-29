#!/usr/bin/env node
import { resolveProofTree, section, stratify } from "@red-cup-engineering/eavt";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Answers one cell question over an eavt row array with the entity's asserted and saturated counts, its settled section, its proof tree, and the closure/regime of the answer's fold.
 * @param {object} request A record with rows, an entity, and an optional attribute.
 * @returns {object} An EavtCellAnswer record.
 * @throws {TypeError} When entity is not a nonempty string or rows is not an array.
 */
export function askEavtCell(request) {
  if (typeof request?.entity !== "string" || request.entity.length === 0 || !Array.isArray(request?.rows)) {
    throw new TypeError("entity and rows are required");
  }
  const attribute = typeof request.attribute === "string" ? request.attribute : null;
  const strata = stratify(request.entity, request.rows, { converse: {} });
  const settled = section(strata.settled);
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
    proofTree: resolveProofTree({ rows: request.rows, root: request.entity }),
    closure: strata.closure,
    regime: strata.closure.regime,
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "ask-eavt-cell", description: "Answers one cell question over an eavt row array with the entity's asserted and saturated counts, its settled section, its proof tree, and the closure/regime of the answer's fold.", operation: askEavtCell }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
