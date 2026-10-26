#!/usr/bin/env node
export const inputSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            required: ["e", "a", "v", "t"],
            properties: { e: {}, a: {}, v: {}, t: {} },
            additionalProperties: false,
          },
          { type: "array", minItems: 4, maxItems: 4 },
        ],
      },
    },
    since: {},
    until: {},
  },
  required: ["entries"],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical";
import { latestState } from "./latest-state.mjs";
import { situationWindow } from "./situation-window.mjs";
/** Read each touched EAVT cell's values, latest value, and situational contradiction. */
export function readEavtState({ entries, since, until } = {}) {
  const rows = situationWindow({ entries, since, until }),
    cells = new Map(),
    latest = latestState({ entries: rows });
  for (const row of rows) {
    const key = canonicalJson([row.e, row.a]),
      cell = cells.get(key) ?? { e: row.e, a: row.a, values: new Map() };
    cell.values.set(
      canonicalJson(row.v),
      Object.freeze({ value: row.v, time: row.t }),
    );
    cells.set(key, cell);
  }
  return Object.freeze(
    Object.fromEntries(
      [...cells].map(([key, cell]) => [
        key,
        Object.freeze({
          e: cell.e,
          a: cell.a,
          latest: Object.freeze({
            value: latest[key].value,
            time: latest[key].time,
          }),
          values: Object.freeze([...cell.values.values()]),
          contested: cell.values.size > 1,
        }),
      ]),
    ),
  );
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(readEavtState(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
