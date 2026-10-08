#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { bindJsonTemplate } from "./bind-json-template.mjs";
import { recordAdmittedSemanticRecord } from "./admit-semantic-record.mjs";
export const inputSchema = {
  type: "object",
  properties: { configuration: { type: "object" }, parameters: {} },
  required: ["configuration", "parameters"],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function recordConfiguredSemanticRecord({
  configuration,
  parameters,
} = {}) {
  if (
    !configuration ||
    Object.getPrototypeOf(configuration) !== Object.prototype
  )
    throw new TypeError(
      "Configured semantic record requires an object configuration",
    );
  return recordAdmittedSemanticRecord(
    bindJsonTemplate({ template: configuration, parameters }),
  );
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      recordConfiguredSemanticRecord(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
