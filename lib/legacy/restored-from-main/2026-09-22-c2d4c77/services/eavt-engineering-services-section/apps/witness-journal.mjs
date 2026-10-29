#!/usr/bin/env node
/** One command boundary for EAVT custody, witness state, and semantic records. */
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { once } from "node:events";
import {
  appendEntries, appendSeavt, journalDateFor, logPathFor,
  readEntries, readEntriesAtPath, readJsonLinesAtPath, readSeavt, readSeavtAtPath,
  streamEntries, streamSeavt, writeEntriesAtomicAtPath,
} from "../src/journal.mjs";
import { latestPerCell, reading, situationWindow } from "../src/state.mjs";
import { commitSettledRecord, readDatomsAtPath, recordPathFor, settle, settledDatom } from "../src/settlement.mjs";
import {
  checkConfiguredSemanticRecordReferences, checkConfiguredSemanticRecordResponses,
  createSemanticRecordJournal, recordAdmittedSemanticRecord, recordConfiguredSemanticRecord,
} from "../src/semantic-record.mjs";
import { inventorySemanticRecordRetirement, replaySemanticRecordRetirement } from "../src/semantic-record-retirement.mjs";

const COMMANDS = Object.freeze({
  "resolve-journal-date": { required: ["at"], invoke: ({ at }) => journalDateFor(at), output: "text" },
  "resolve-log-path": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => logPathFor(root, feed, at) },
  "read-entries-at-path": { required: ["path"], invoke: ({ path }) => readEntriesAtPath(path) },
  "read-seavt-at-path": { required: ["path"], invoke: ({ path }) => readSeavtAtPath(path) },
  "read-json-lines-at-path": { required: ["path"], invoke: ({ path }) => readJsonLinesAtPath(path) },
  "write-entries-at-path": { required: ["path"], input: "array", invoke: ({ path }, entries) => { writeEntriesAtomicAtPath(path, entries); return { path, written: entries.length }; } },
  "append-entries": { required: ["root", "feed", "at"], input: "array", invoke: ({ root, feed, at }, rows) => appendEntries(root, feed, rows, at) },
  "append-seavt": { required: ["root", "feed", "at"], input: "array", invoke: ({ root, feed, at }, rows) => appendSeavt(root, feed, rows, at) },
  "read-entries": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => readEntries(root, feed, at) },
  "read-seavt": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => readSeavt(root, feed, at) },
  "stream-entries": { required: ["root", "feed", "at"], stream: true, invoke: ({ root, feed, at }) => streamEntries(root, feed, at) },
  "stream-seavt": { required: ["root", "feed", "at"], stream: true, invoke: ({ root, feed, at }) => streamSeavt(root, feed, at) },
  "read-state": { input: "array", invoke: (_, entries) => latestPerCell(entries) },
  "scope-situation": { optional: ["since", "until"], input: "array", invoke: ({ since, until }, entries) => situationWindow(entries, { ...(since === undefined ? {} : { since }), ...(until === undefined ? {} : { until }) }) },
  "read-situation": { optional: ["since", "until"], input: "array", invoke: ({ since, until }, entries) => reading(entries, { ...(since === undefined ? {} : { since }), ...(until === undefined ? {} : { until }) }) },
  "build-datom": { input: "json", invoke: (_, value) => settledDatom(value.row, value.reading) },
  "settle-entries": { required: ["reading"], input: "array", invoke: ({ reading: value }, rows) => settle(rows, () => JSON.parse(value)) },
  "resolve-record-path": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => recordPathFor(root, feed, at), output: "text" },
  "read-datoms-at-path": { required: ["path"], invoke: ({ path }) => readDatomsAtPath(path) },
  "commit-settled-record": { required: ["root", "feed"], input: "json", invoke: ({ root, feed }, value) => commitSettledRecord(root, feed, value) ?? null },
  "create-semantic-record-journal": { optional: ["objectKind"], required: ["root"], invoke: ({ root, objectKind }) => ({ root: createSemanticRecordJournal({ root, ...(objectKind === undefined ? {} : { objectKind }) }).root }) },
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
const flagName = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function required(value, name) { if (value === undefined) throw new TypeError(`--${name} is required`); return value; }
function inputArray() { const text = readFileSync(0, "utf8").trim(); return text === "" ? [] : JSON.parse(text); }
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
function usage() { return `Usage: witness-journal <operation> [options]\n\nOperations:\n${Object.keys(COMMANDS).map((name) => `  ${name}`).join("\n")}\n`; }

export async function main(argv = process.argv, input = process.stdin, output = process.stdout) {
  const executable = basename(argv[1] ?? "witness-journal").replace(/\.mjs$/u, "");
  const explicit = executable === "witness-journal" ? argv[2] : executable;
  const args = executable === "witness-journal" ? argv.slice(3) : argv.slice(2);
  if (explicit === undefined || explicit === "--help" || explicit === "help") { output.write(usage()); return 0; }
  const command = COMMANDS[explicit];
  if (!command) throw new TypeError(`Unknown witness-journal operation: ${explicit}`);
  const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: false, options: {
    root: { type: "string" }, feed: { type: "string" }, at: { type: "string" }, path: { type: "string" }, since: { type: "string" }, until: { type: "string" },
    "object-kind": { type: "string" }, reading: { type: "string" }, config: { type: "string" }, "source-root": { type: "string" }, "target-root": { type: "string" }, apply: { type: "boolean" }, verify: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) { output.write(usage()); return 0; }
  const acceptedFlags = new Set(["help", ...[...(command.required ?? []), ...(command.optional ?? [])].map(flagName)]);
  for (const flag of Object.keys(values)) if (!acceptedFlags.has(flag)) throw new TypeError(`${explicit} does not accept --${flag}`);
  const options = { root: values.root, feed: values.feed, at: values.at, path: values.path, since: values.since, until: values.until, objectKind: values["object-kind"], reading: values.reading, config: values.config, sourceRoot: values["source-root"], targetRoot: values["target-root"], apply: values.apply === true, verify: values.verify === true };
  if (command.positional) options[command.positional] = required(positionals[0], command.positional);
  for (const name of command.required ?? []) required(options[name], flagName(name));
  if (command.ndjson) {
    for await (const line of createInterface({ input, crlfDelay: Infinity })) {
      if (line && output.write(`${JSON.stringify(command.invoke(options, JSON.parse(line)))}\n`) === false) await once(output, "drain");
    }
    return 0;
  }
  const result = command.invoke(options, command.input === "array" ? inputArray() : command.input === "json" ? JSON.parse(readFileSync(0, "utf8")) : undefined);
  if (command.stream) for (const item of result) output.write(`${JSON.stringify(item)}\n`);
  else output.write(command.output === "text" ? `${result}\n` : `${JSON.stringify(result)}\n`);
  return 0;
}

function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl)); } catch { return false; }
}
if (isEntrypoint(import.meta.url)) {
  try { process.exitCode = await main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
