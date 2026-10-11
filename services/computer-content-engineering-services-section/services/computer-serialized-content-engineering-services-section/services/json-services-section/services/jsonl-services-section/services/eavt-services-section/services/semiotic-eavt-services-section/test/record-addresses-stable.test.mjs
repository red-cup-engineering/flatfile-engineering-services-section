import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { recordSemanticRecord } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

const PINNED_IDS = [
  {
    "id": "ni:///sha-256;Vj4_TJpCCOxnzzvBZxrU3hNZJB-xx-ZwPZv8N-un7_Q",
    "events": [
      "ni:///sha-256;Lc9LYTIoUhgLP8R50337Csc4yr5c5Xn0I7ICNvrty1w"
    ]
  },
  {
    "id": "ni:///sha-256;mMyMH2qM-hSjNhjsTDdcMfVf8v5ZqxZnWhZJAHBVVbA",
    "events": [
      "ni:///sha-256;RBxicNU-SoLHVP-oKwQi1wb7O1Ikg0QXjLwfUusQtiM"
    ]
  },
  {
    "id": "ni:///sha-256;pz-g1LsrgIkL4fJg7viSCKJM6BjvnWXnuK6k40p5AtE",
    "events": [
      "ni:///sha-256;cS7YiNPDPDeksdCkqMAoKoli3Vi_EE0mO6zCdJhWVYA"
    ]
  }
];

// Record ids pinned from the canonicalizer before list spines stopped counting as nesting; event ids
// since 2026-10-11, when a witness began naming its row by content address.
const records = [
  { record: { type: "Observation", value: 1 } },
  { record: { ids: Array.from({ length: 40 }, (_, index) => `ni:///sha-256;item-${index}`), nested: { a: [[1, 2], [3]] } } },
  { record: ["x"] },
];

test("record and event addresses are unchanged for records the old depth guard admitted", (t) => {
  const root = mkdtempSync(join(tmpdir(), "record-addresses-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const got = records.map(({ record }) => {
    const result = recordSemanticRecord({
      root, objectKind: "test.stable", category: "c", record,
      recordedAt: "2026-10-04T00:00:00.000Z", told: { for: true, against: false },
    });
    return { id: result.id, events: result.events };
  });
  assert.deepEqual(got, PINNED_IDS);
});

