#!/usr/bin/env node
/** One command boundary for EAVT custody and witness state. */
import { readFileSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { appendEavtEntries } from "../scripts/append-eavt-entries.mjs";
import { journalPath } from "../scripts/journal-path.mjs";
import { dataArtifactOfPath } from "../src/data-artifact-address.mjs";
import { readEavtEntries } from "../scripts/read-eavt-entries.mjs";
import { writeEavtEntries } from "../scripts/write-eavt-entries.mjs";
import { readEavtJournal } from "../scripts/read-eavt-journal.mjs";
import { readJsonlAtPath } from "@red-cup-engineering/jsonl-services-section/read-jsonl";
import { latestState } from "../scripts/latest-state.mjs";
import { situationWindow } from "../scripts/situation-window.mjs";
import { readEavtState } from "../scripts/read-eavt-state.mjs";
import { commitSettledRecord, readDatomsAtPath, recordPathFor, settle, settledDatom } from "@red-cup-engineering/datom-services-section";

const COMMANDS = Object.freeze({
  "resolve-journal-date": { required: ["at"], invoke: ({ at }) => dataArtifactOfPath(journalPath({ root: ".", feed: "journal", at })).date, output: "text" },
  "resolve-log-path": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => journalPath({ root, feed, at }) },
  "read-entries-at-path": { required: ["path"], invoke: ({ path }) => readEavtEntries({ path }) },
  "read-json-lines-at-path": { required: ["path"], invoke: ({ path }) => readJsonlAtPath(path) },
  "write-entries-at-path": { required: ["path"], input: "array", invoke: ({ path }, entries) => writeEavtEntries({ path, entries }) },
  "append-entries": { required: ["root", "feed", "at"], input: "array", invoke: ({ root, feed, at }, entries) => appendEavtEntries({ root, feed, entries, at }) },
  "read-entries": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => readEavtJournal({ root, feed, at }) },
  "read-state": { input: "array", invoke: (_, entries) => latestState({entries}) },
  "scope-situation": { optional: ["since", "until"], input: "array", invoke: ({ since, until }, entries) => situationWindow({entries, ...(since === undefined ? {} : { since }), ...(until === undefined ? {} : { until }) }) },
  "read-situation": { optional: ["since", "until"], input: "array", invoke: ({ since, until }, entries) => readEavtState({entries, ...(since === undefined ? {} : { since }), ...(until === undefined ? {} : { until }) }) },
  "build-datom": { input: "json", invoke: (_, value) => settledDatom({row:value.row, reading:value.reading}) },
  "settle-entries": { required: ["reading"], input: "array", invoke: ({ reading: value }, rows) => settle({entries:rows.map(row=>({row,reading:JSON.parse(value)}))}) },
  "resolve-record-path": { required: ["root", "feed", "at"], invoke: ({ root, feed, at }) => recordPathFor({root, feed, at}), output: "text" },
  "read-datoms-at-path": { required: ["path"], invoke: ({ path }) => readDatomsAtPath(path) },
  "commit-settled-record": { required: ["root", "feed"], input: "json", invoke: ({ root, feed }, value) => commitSettledRecord({root, feed, ...value}) ?? null },
});
const flagName = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function required(value, name) { if (value === undefined) throw new TypeError(`--${name} is required`); return value; }
function inputArray() { const text = readFileSync(0, "utf8").trim(); return text === "" ? [] : JSON.parse(text); }
function usage(program, commands) { return `Usage: ${program} <operation> [options]\n\nOperations:\n${Object.keys(commands).map((name) => `  ${name}`).join("\n")}\n`; }

/** Run one operation of a command table, named by the executable (a bin alias) or by the first argument. */
export async function runCommands(commands, program, argv, input, output) {
  const executable = basename(argv[1] ?? program).replace(/\.mjs$/u, "");
  const named = Object.hasOwn(commands, executable);
  const explicit = named ? executable : argv[2];
  const args = named ? argv.slice(2) : argv.slice(3);
  if (explicit === undefined || explicit === "--help" || explicit === "help") { output.write(usage(program, commands)); return 0; }
  const command = commands[explicit];
  if (!command) throw new TypeError(`Unknown ${program} operation: ${explicit}`);
  const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: false, options: {
    root: { type: "string" }, feed: { type: "string" }, at: { type: "string" }, path: { type: "string" }, since: { type: "string" }, until: { type: "string" },
    "object-kind": { type: "string" }, reading: { type: "string" }, config: { type: "string" }, "source-root": { type: "string" }, "target-root": { type: "string" }, apply: { type: "boolean" }, verify: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) { output.write(usage(program, commands)); return 0; }
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

export function main(argv = process.argv, input = process.stdin, output = process.stdout) {
  return runCommands(COMMANDS, "witness-journal", argv, input, output);
}

export function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl)); } catch { return false; }
}
if (isEntrypoint(import.meta.url)) {
  try { process.exitCode = await main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
