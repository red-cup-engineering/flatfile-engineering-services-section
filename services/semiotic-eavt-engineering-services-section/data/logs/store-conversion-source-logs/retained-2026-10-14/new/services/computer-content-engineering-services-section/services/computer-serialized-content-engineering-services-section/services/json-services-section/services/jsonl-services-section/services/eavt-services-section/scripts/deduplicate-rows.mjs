#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["deduplicate-rows"].input;
export const outputSchema = contracts["deduplicate-rows"].output;
import { row } from "./admit-row.mjs";
import { identify } from "./identify-row.mjs";
export function unique(values) {
  return [
    ...new Map(
      values.map((value) => {
        const fact = row(value);
        return [identify(fact), fact];
      }),
    ).values(),
  ];
}
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    JSON.stringify(unique(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
}
