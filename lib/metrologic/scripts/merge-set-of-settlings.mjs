import { readingSettlement } from "../src/settlement.mjs";
import { readSettling, writeSettling } from "../src/settlement-wire.mjs";

export default function mergeSetOfSettlings(wireSettlings) {
  if (!Array.isArray(wireSettlings)) throw new TypeError("merge-set-of-settlings: expected a list of settlings");
  return writeSettling(readingSettlement.mergeAll(wireSettlings.map(readSettling)));
}

export const operation = Object.freeze({ name: "merge-set-of-settlings", description: "mergeSetOfSettlings — the merge-set-of-settlings operation.", operation: mergeSetOfSettlings });
