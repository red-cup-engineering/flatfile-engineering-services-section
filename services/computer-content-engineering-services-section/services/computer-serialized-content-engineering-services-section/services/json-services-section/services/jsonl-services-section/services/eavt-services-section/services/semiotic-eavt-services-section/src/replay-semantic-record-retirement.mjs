#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { appendSeavtEntries } from "./append-seavt-entries.mjs";
import { inventorySemanticRecordRetirement } from "./inventory-semantic-record-retirement.mjs";
import { writeFileBytesSync } from "@red-cup-engineering/file-services/write-file";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
const digest = (bytes) =>
    sha256Digest(bytes),
  json = (value) => JSON.stringify(value, null, 2) + "\n";
export const inputSchema = {
  type: "object",
  properties: {
    sourceRoot: { type: "string", minLength: 1 },
    targetRoot: { type: "string", minLength: 1 },
  },
  required: ["sourceRoot", "targetRoot"],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function replaySemanticRecordRetirement({
  sourceRoot,
  targetRoot,
} = {}) {
  const inventory = inventorySemanticRecordRetirement({ sourceRoot }),
    target = resolve(targetRoot);
  const writeOnce = (path, body) => {
    if (existsSync(path)) {
      if (!readFileSync(path).equals(body))
        throw new Error(`retirement evidence collision at ${path}`);
      return false;
    }
    writeFileBytesSync(path, body);
    return true;
  };
  let appended = 0;
  const archived = [];
  for (const file of inventory.files) {
    const archivePath = join(
      target,
      "data",
      "records",
      "semantic-record-retirement",
      `${file.rawDigest.slice(7)}.jsonl`,
    );
    archived.push(
      Object.freeze({
        source: file.path,
        archive: relative(target, archivePath),
        rawDigest: file.rawDigest,
      }),
    );
    writeOnce(archivePath, readFileSync(join(inventory.sourceRoot, file.path)));
    for (const row of file.rows)
      if (row.status === "admissible")
        appended += appendSeavtEntries({
          root: target,
          feed: "witness-journal-seavt",
          entries: [row.row],
          at: row.row.t,
        }).appended;
  }
  const refusals = Object.freeze(
      inventory.files.flatMap((file) =>
        file.rows
          .filter((row) => row.status === "refused")
          .map((row) =>
            Object.freeze({
              source: file.path,
              line: row.line,
              rawDigest: row.rawDigest,
              reason: row.reason,
              reAdmission: row.reAdmission,
            }),
          ),
      ),
    ),
    receipt = Object.freeze({
      kind: "semantic-record-retirement.replay@2",
      inventory,
      targetRoot: target,
      archived: Object.freeze(archived),
      refusals,
      deletionAuthorized: false,
    }),
    receiptPath = join(
      target,
      "data",
      "records",
      "semantic-record-retirement",
      `${digest(Buffer.from(json(receipt))).slice(7)}.json`,
    );
  writeOnce(receiptPath, Buffer.from(json(receipt)));
  return Object.freeze({
    ...receipt,
    appended,
    receipt: relative(target, receiptPath),
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      replaySemanticRecordRetirement(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
