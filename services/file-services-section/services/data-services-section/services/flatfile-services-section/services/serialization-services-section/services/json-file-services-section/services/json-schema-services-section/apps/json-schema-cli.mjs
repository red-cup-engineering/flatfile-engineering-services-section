#!/usr/bin/env node
import { createInterface } from "node:readline";
import { validateSchemaInstance } from "../scripts/validate-schema-instance.mjs";
if (import.meta.main) {
  const verb = process.argv[2];
  if (verb !== "validate-instance")
    throw new TypeError(`unknown verb: ${verb}`);
  for await (const line of createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  })) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      process.stdout.write(
        JSON.stringify(
          validateSchemaInstance({
            instance: Object.hasOwn(request, "instance")
              ? request.instance
              : request.value,
            schema: request.schema,
            ...(request.schemas === undefined
              ? {}
              : { schemas: request.schemas }),
          }),
        ) + "\n",
      );
    } catch (error) {
      process.exitCode = 1;
      process.stdout.write(
        JSON.stringify({ ok: false, error: error.message }) + "\n",
      );
    }
  }
}
