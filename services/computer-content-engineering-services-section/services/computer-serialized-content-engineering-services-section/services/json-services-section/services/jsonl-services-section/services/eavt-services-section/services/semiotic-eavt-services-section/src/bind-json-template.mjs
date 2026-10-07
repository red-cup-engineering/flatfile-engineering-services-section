#!/usr/bin/env node
import { resolveSchemaPointer } from "@red-cup-engineering/json-schema-services-section/resolve-schema-pointer";
import { readFileSync as readCarrierInput } from "node:fs";
export const inputSchema = {
  type: "object",
  properties: { template: {}, parameters: {} },
  required: ["template", "parameters"],
  additionalProperties: false,
};
export const outputSchema = {};
export function bindJsonTemplate({ template, parameters } = {}) {
  const bind = (value) => {
    if (Array.isArray(value)) return value.map(bind);
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "$pointer") {
        const resolved = resolveSchemaPointer({
          document: parameters,
          pointer: value.$pointer,
        });
        if (!resolved.found)
          throw new TypeError(
            `JSON Pointer does not resolve: ${value.$pointer}`,
          );
        return structuredClone(resolved.value);
      }
      return Object.fromEntries(keys.map((key) => [key, bind(value[key])]));
    }
    return structuredClone(value);
  };
  return bind(template);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(bindJsonTemplate(JSON.parse(readCarrierInput(0, "utf8")))) +
      "\n",
  );
