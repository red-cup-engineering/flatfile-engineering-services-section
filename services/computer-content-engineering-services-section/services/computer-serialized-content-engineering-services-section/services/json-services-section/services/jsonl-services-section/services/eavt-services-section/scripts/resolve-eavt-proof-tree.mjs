import { eavtRow } from "./admit-row.mjs";
import { citations } from "./collect-eavt-citations.mjs";
import { digestHex } from "./digest-eavt-identity.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows", "root"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["root", "nodes", "edges", "missing", "cycles", "depth"],
});
/** Resolve citation edges from a root, retaining missing references and cycles as evidence. */
export function resolveEavtProofTree({ rows, root } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  if (typeof root !== "string" || root.length === 0)
    throw new TypeError("root must be a non-empty string");
  const exact = new Map(),
    digests = new Map();
  for (const candidate of rows) {
    const row = eavtRow(candidate),
      identity = identifyContentAddressedRow({ row }).identity;
    exact.set(identity, row);
    exact.has(row.e) || exact.set(row.e, row);
    const key = digestHex(identity);
    if (key && !digests.has(key)) digests.set(key, row);
  }
  const resolve = (identity) =>
    exact.get(identity) ?? digests.get(digestHex(identity));
  const nodes = new Map(),
    edges = [],
    edgeSeen = new Set(),
    missing = new Set(),
    cycles = new Set(),
    visited = new Set(),
    stack = new Set();
  const pending = (identity) => {
    if (stack.has(identity)) {
      cycles.add(identity);
      return;
    }
    if (visited.has(identity)) return;
    visited.add(identity);
    const row = resolve(identity);
    if (!row) {
      missing.add(identity);
      return;
    }
    nodes.set(identity, row);
    stack.add(identity);
    for (const citation of citations(row.v)) {
      const edge = `${identity}\u0000${citation}`;
      if (!edgeSeen.has(edge)) {
        edgeSeen.add(edge);
        edges.push([identity, citation]);
      }
      pending(citation);
    }
    stack.delete(identity);
  };
  pending(root);
  const depth = (identity, seen = new Set()) => {
    if (seen.has(identity) || !nodes.has(identity)) return 0;
    const next = new Set(seen);
    next.add(identity);
    return Math.max(
      0,
      ...citations(nodes.get(identity).v).map(
        (citation) => 1 + depth(citation, next),
      ),
    );
  };
  return {
    root,
    nodes: Object.fromEntries(nodes),
    edges,
    missing: [...missing].sort(),
    cycles: [...cycles].sort(),
    depth: depth(root),
  };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(resolveEavtProofTree(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
