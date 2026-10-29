#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Filters eavt rows to the entities whose latest consent row admits the audience, withholding the rest and reporting only their count.
 * @param {object} request A record with rows and an audience name.
 * @returns {object} An EavtConsentFilteredRows record.
 * @throws {TypeError} When rows is not an array or audience is not a non-empty string.
 */
export function filterEavtRowsByConsent(request) {
  if (!Array.isArray(request?.rows) || typeof request?.audience !== "string" || request.audience.length === 0) {
    throw new TypeError("rows and a non-empty audience are required");
  }
  const consent = new Map();
  for (const row of request.rows) {
    if (row.a !== "consent") continue;
    const known = consent.get(row.e);
    if (known === undefined || String(row.t) >= String(known.t)) consent.set(row.e, row);
  }
  const admits = (row) => row !== undefined && (row.v === "public" || (Array.isArray(row.v) && row.v.includes(request.audience)));
  const admitted = [];
  const withheldEntities = new Set();
  for (const row of request.rows) {
    if (admits(consent.get(row.e))) admitted.push(row);
    else withheldEntities.add(row.e);
  }
  return {
    type: "EavtConsentFilteredRows",
    audience: request.audience,
    admitted: admitted.length,
    withheld: request.rows.length - admitted.length,
    withheldEntities: withheldEntities.size,
    rows: admitted,
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "filter-eavt-rows-by-consent", description: "Filters eavt rows to the entities whose latest consent row admits the audience, withholding the rest and reporting only their count.", operation: filterEavtRowsByConsent }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
