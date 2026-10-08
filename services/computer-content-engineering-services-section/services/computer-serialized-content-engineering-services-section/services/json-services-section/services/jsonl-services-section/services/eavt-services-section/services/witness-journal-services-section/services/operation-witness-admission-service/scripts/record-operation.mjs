import { admitOperationWitness } from "../src/operation-witness.mjs";

export function recordOperation(document) {
  return admitOperationWitness(document, { at: document.at });
}

export const operation = Object.freeze({ name: "record-operation", description: "recordOperation — the record-operation operation.", operation: recordOperation });
