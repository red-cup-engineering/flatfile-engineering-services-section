#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["constitute-entity"].input;
export const outputSchema = contracts["constitute-entity"].output;
import { readFileSync } from "node:fs";
import { row } from "./admit-row.mjs";
import { encode } from "./encode-row.mjs";
export function constitute({ kind, attributes, t }) {
  if (
    !/^[^:]+$/.test(kind) ||
    attributes === null ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  )
    throw new TypeError(
      "kind must be a nonempty noun and attributes a JSON object",
    );
  const address = `${kind}:${Buffer.from(encode({ e: null, a: "constituted", v: attributes, t })).toString("base64url")}`;
  return Object.freeze({
    address,
    genesis: row({ e: address, a: "constituted", v: attributes, t }),
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(constitute(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
