#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["count-relation-nerve"].input;
export const outputSchema = contracts["count-relation-nerve"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { relations } from "./select-relations.mjs";
export function relationNerve({ rows: values, attribute }) {
  const edges = relations({ rows: values, attribute: attribute });
  const parent = new Map();
  const find = (node) => {
    const root = parent.get(node) ?? node;
    if (root === node) {
      parent.set(node, node);
      return node;
    }
    const result = find(root);
    parent.set(node, result);
    return result;
  };
  for (const fact of edges) {
    const a = find(`e:${canonicalJson(fact.e)}`);
    const b = find(`v:${canonicalJson(fact.v)}`);
    if (a !== b) parent.set(a, b);
  }
  const components = new Set([...parent.keys()].map(find)).size;
  return Object.freeze({
    vertices: parent.size,
    edges: edges.length,
    components,
    cycles: edges.length - parent.size + components,
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(relationNerve(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
