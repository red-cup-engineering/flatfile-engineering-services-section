#!/usr/bin/env node
import * as json from "../../../src/index.mjs";
import { freezeJson } from "../../../src/index.mjs";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";

import contract from "../schemas/fold-schema-assertions.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function foldSchemaAssertions({ assertions }) {
  const assertion = (value) => admitSchemaAssertion({ assertion: value });
  const pointerOf = (entity) =>
    entity.includes("#") ? entity.slice(entity.indexOf("#") + 1) : entity;
  const pointerPart = (value) =>
    value.replaceAll("~", "~0").replaceAll("/", "~1");
  const nodes = new Map([["", {}]]);
  const ordered = assertions
    .map(assertion)
    .sort(
      (left, right) =>
        pointerOf(left.e).split("/").length -
        pointerOf(right.e).split("/").length,
    );
  for (const row of ordered) {
    const pointer = pointerOf(row.e),
      parent = nodes.get(pointer);
    if (!parent) throw new TypeError(`no node at ${pointer}`);
    const material =
      row.v !== null && typeof row.v === "object"
        ? Array.isArray(row.v)
          ? []
          : {}
        : row.v;
    if (row.v !== null && typeof row.v === "object")
      nodes.set(`${pointer}/${pointerPart(row.a)}`, material);
    if (Array.isArray(parent)) parent[Number(row.a)] = material;
    else parent[row.a] = material;
  }
  return { schema: freezeJson(nodes.get("")) };
}
