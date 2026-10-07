#!/usr/bin/env node
/** The semiotic EAVT's command face: append and read SEAVT journals, record admitted and configured
 *  semantic records, check their references and responses, and retire historical record stores. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isEntrypoint, runCommands } from "@red-cup-engineering/eavt/witness-journal";
import { appendSeavtEntries } from "./append-seavt-entries.mjs";
import { readSeavtEntries } from "./read-seavt-entries.mjs";
import { readSeavtEntriesAtPath } from "./read-seavt-entries-at-path.mjs";
import { checkConfiguredSemanticRecordReferences } from "./check-semantic-record-references.mjs";
import { checkConfiguredSemanticRecordResponses } from "./check-semantic-record-responses.mjs";
import { recordAdmittedSemanticRecord } from "./admit-semantic-record.mjs";
import { recordConfiguredSemanticRecord } from "./record-configured-semantic-record.mjs";
import { inventorySemanticRecordRetirement } from "./inventory-semantic-record-retirement.mjs";
import { replaySemanticRecordRetirement } from "./replay-semantic-record-retirement.mjs";

const COMMANDS = Object.freeze({
  "read-seavt-at-path": { required: ["path"], invoke: ({ path }) => readSeavtEntriesAtPath({ path }) },
  "append-seavt": { required: ["root", "feed", "at"], input: "array", invoke: ({ root, feed, at }, entries) => appendSeavtEntries({ root, feed, entries, at }) },
  "read-seavt": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => readSeavtEntries({ root, feed, at }) },
  "record-admitted-semantic-record": { optional: ["config"], ndjson: true, invoke: ({ config }, value) => config === undefined ? recordAdmittedSemanticRecord(value) : recordConfiguredSemanticRecord({ configuration: configuredRecord(config), parameters: value }) },
  "check-configured-semantic-record-references": { positional: "configuration", invoke: ({ configuration }) => configuredCheck(configuration, checkConfiguredSemanticRecordReferences, ["sourceRoot", "journalRoot"]) },
  "check-configured-semantic-record-responses": { positional: "configuration", invoke: ({ configuration }) => configuredCheck(configuration, checkConfiguredSemanticRecordResponses, ["issuesRoot", "journalRoot", "repositoryRoot"]) },
  "retire-semantic-record-files": { optional: ["targetRoot", "apply", "verify"], required: ["sourceRoot"], invoke: ({ sourceRoot, targetRoot, apply, verify }) => {
    const inventory = inventorySemanticRecordRetirement({ sourceRoot });
    const retained = inventory.sourceReferences.filter((item) => item.kind === "current");
    if (verify && retained.length) throw new Error(`retired semantic-record current source references remain: ${retained.length}`);
    return apply ? replaySemanticRecordRetirement({ sourceRoot, targetRoot: required(targetRoot, "target-root") }) : inventory;
  } },
});

function required(value, name) { if (value === undefined) throw new TypeError(`--${name} is required`); return value; }
function configuredRecord(path) {
  const configurationPath = resolve(path), configuration = JSON.parse(readFileSync(configurationPath, "utf8")), directory = dirname(configurationPath);
  if (typeof configuration.root === "string" && !configuration.root.startsWith("/")) configuration.root = resolve(directory, configuration.root);
  if (typeof configuration.schemaFile === "string") { configuration.schema = JSON.parse(readFileSync(resolve(directory, configuration.schemaFile), "utf8")); delete configuration.schemaFile; }
  return configuration;
}
function configuredCheck(path, operation, keys) {
  const configurationPath = resolve(path), directory = dirname(configurationPath), configuration = JSON.parse(readFileSync(configurationPath, "utf8"));
  for (const key of keys) configuration[key] = resolve(directory, configuration[key]);
  return operation(configuration);
}

export function main(argv = process.argv, input = process.stdin, output = process.stdout) {
  return runCommands(COMMANDS, "semiotic-eavt", argv, input, output);
}

if (isEntrypoint(import.meta.url)) {
  try { process.exitCode = await main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
