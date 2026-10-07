import { resolveEavtProofTree } from "./resolve-eavt-proof-tree.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["rows", "roots"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["kind", "results", "summary"],
});
export function verifyEavtProofClosure({ rows, roots } = {}) {
  if (!Array.isArray(roots)) throw new TypeError("roots must be an array");
  const results = roots.map((root) => {
    const proof = resolveEavtProofTree({ rows, root });
    return {
      root,
      closed: proof.missing.length === 0 && proof.cycles.length === 0,
      missing: proof.missing,
      cycles: proof.cycles,
      depth: proof.depth,
    };
  });
  const closed = results.filter((result) => result.closed).length;
  return {
    kind: "eavt.proof-closure",
    results,
    summary: { roots: results.length, closed, open: results.length - closed },
  };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(verifyEavtProofClosure(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
