#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { DRAFT_2020_12 } from "../src/schema-vocabulary.mjs";
import { assertSchema } from "./assert-schema.mjs";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import contract from "../schemas/admit-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function admitSchema(input) {
  const request = json.requireJsonValue(input);
  if (!json.isJsonRecord(request))
    throw new TypeError("request must be an object");
  const raw = request.schema;
  if (!json.isJsonRecord(raw)) throw new TypeError("schema must be an object");
  const id = request.id ?? raw.$id;
  if (typeof id !== "string" || id === "")
    throw new TypeError("schema requires a non-empty $id");
  if (raw.$id !== undefined && raw.$id !== id)
    throw new TypeError("schema $id disagrees with requested identity");
  const schema = freezeJson({ ...raw, $schema: DRAFT_2020_12, $id: id });
  assertSchema({
    schema,
    allowUnknownAnnotations: request.allowUnknownAnnotations === true,
  });
  const canonical = json.canonicalJson(schema);
  return Object.freeze({
    schema,
    identity: Object.freeze({
      schemaId: id,
      mediaType: "application/schema+json",
      canonicalJson: canonical,
      sha256: sha256Hex(canonical),
      ni: makeNiUri(Buffer.from(canonical, "utf8")),
    }),
  });
}
