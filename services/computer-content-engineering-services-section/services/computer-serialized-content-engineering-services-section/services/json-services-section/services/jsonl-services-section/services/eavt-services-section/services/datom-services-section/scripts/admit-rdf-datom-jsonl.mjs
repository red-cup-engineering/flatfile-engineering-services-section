#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitRdfDatom } from "./admit-rdf-datom.mjs";
export const EAVT_DATOM_JSONL_MEDIA_TYPE =
  "application/eavt+jsonl; charset=utf-8";
export const inputSchema = {
  type: "object",
  required: ["mediaType", "body"],
  properties: {
    mediaType: { const: EAVT_DATOM_JSONL_MEDIA_TYPE },
    body: { type: "string", minLength: 1 },
  },
};
export const outputSchema = {
  type: "object",
  required: ["mediaType", "body", "datomCount"],
  properties: {
    ...inputSchema.properties,
    datomCount: { type: "integer", minimum: 1, maximum: 1024 },
  },
};
export function canonicalEavtDatomJsonl({ mediaType, body } = {}) {
  if (mediaType !== EAVT_DATOM_JSONL_MEDIA_TYPE)
    throw new TypeError(`mediaType must be ${EAVT_DATOM_JSONL_MEDIA_TYPE}`);
  if (typeof body !== "string" || body.length === 0)
    throw new TypeError("body must be a nonempty EAVT Datom JSONL string");
  if (!body.endsWith("\n"))
    throw new TypeError("EAVT Datom JSONL must end with one newline");
  const lines = body.slice(0, -1).split("\n");
  if (lines.length > 1024 || lines.some((line) => line.length === 0))
    throw new TypeError(
      "EAVT Datom JSONL must contain 1 through 1024 nonempty lines",
    );
  const normalized = lines.map((line, index) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new TypeError(`line ${index + 1} is not JSON`);
    }
    let value;
    try {
      value = admitRdfDatom(parsed);
    } catch (error) {
      throw new TypeError(`line ${index + 1}: ${error.message}`);
    }
    const canonicalJson = JSON.stringify(value);
    if (line !== canonicalJson)
      throw new TypeError(`line ${index + 1} is not canonicalJson JSON`);
    return canonicalJson;
  });
  return Object.freeze({
    mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE,
    body: `${normalized.join("\n")}\n`,
    datomCount: normalized.length,
  });
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      canonicalEavtDatomJsonl(JSON.parse(readFileSync(0, "utf8"))),
    ) + "\n",
  );
