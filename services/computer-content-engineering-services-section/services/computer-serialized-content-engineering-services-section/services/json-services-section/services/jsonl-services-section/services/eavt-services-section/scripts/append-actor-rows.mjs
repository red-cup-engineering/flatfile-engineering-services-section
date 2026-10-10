#!/usr/bin/env node
// append-actor-rows — the effect: durably append a batch of rows to an actor register, verifying
// every constituting row's genesis first. Thin: the law lives in src/actor.mjs.
import { readFileSync } from "node:fs";
import { appendActorRows } from "../src/actor.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function appendActorRowsScript(registerPath, rows) {
  return appendActorRows(registerPath, rows);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [registerPath, rowsFile] = process.argv.slice(2);
  if (!registerPath || !rowsFile) {
    console.error("usage: append-actor-rows.mjs <register-path> <rows-json-file>");
    process.exit(1);
  }
  const rows = JSON.parse(readFileSync(rowsFile, "utf8"));
  console.log(appendActorRowsScript(registerPath, rows));
}
