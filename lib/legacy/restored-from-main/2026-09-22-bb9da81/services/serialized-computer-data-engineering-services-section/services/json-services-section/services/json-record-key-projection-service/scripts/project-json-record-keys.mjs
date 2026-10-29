#!/usr/bin/env node
import { canonical, parse } from "../../../src/index.mjs";
import { runMain, isStrictMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { projectJsonRecordKeys } from "../src/project-json-record-keys.mjs";

async function readStandardInput(stream) {
  let text = "";
  stream.setEncoding("utf8");
  for await (const chunk of stream) text += chunk;
  return text;
}

export async function runProjectJsonRecordKeys(argv, io = process) {
  const argument = argv.find((value) => value.startsWith("--keys="));
  if (argv.length !== 1 || argument === undefined) {
    throw new TypeError("usage: project-json-record-keys --keys=KEY[,KEY...] < record.json");
  }
  const keys = argument.slice("--keys=".length).split(",");
  const projection = projectJsonRecordKeys({ record: parse(await readStandardInput(io.stdin)), keys });
  io.stdout.write(`${canonical(projection)}\n`);
  return projection;
}

runMain(({ argv, stdout, stderr }) => runProjectJsonRecordKeys(argv, { stdin: process.stdin, stdout, stderr }), {
  moduleUrl: import.meta.url,
  isEntry: isStrictMain,
  formatError: (error) => `project-json-record-keys: ${error.message}\n`,
  exitCode: 64,
});
