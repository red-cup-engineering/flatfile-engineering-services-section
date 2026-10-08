import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const mementoSnapshotSchema = {
  $id: "relating/ledger/memento/snapshot",
  title: "RWIL Memento Snapshot",
  description: "A ledger state projection as of one datetime.",
  type: "object",
  required: ["kind", "datetime", "state"],
  properties: {
    kind: { const: "relating.ledger.memento.snapshot" },
    datetime: { type: "string", minLength: 1 },
    state: {},
  },
  additionalProperties: false,
};

export const mementoSnapshotCarrier = schemaFrom(mementoSnapshotSchema);

export const timeMapSchema = {
  $id: "relating/ledger/memento/timemap",
  title: "RWIL Memento TimeMap",
  description: "The available record snapshots for one ledger projection.",
  type: "object",
  required: ["kind", "original", "snapshots"],
  properties: {
    kind: { const: "relating.ledger.memento.timemap" },
    original: { type: "string" },
    snapshots: {
      type: "array",
      items: {
        type: "object",
        required: ["datetime", "witnesses"],
        properties: {
          datetime: { type: "string", minLength: 1 },
          witnesses: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const timeMapCarrier = schemaFrom(timeMapSchema);
